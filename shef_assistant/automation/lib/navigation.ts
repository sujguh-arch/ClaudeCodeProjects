/**
 * Module 3: Navigation & Overlays
 *
 * Handles page navigation, dismissing popups/modals, and waiting for stable UI.
 */

import { Page } from "playwright";
import { PATHS, log, ensureArtifactsDir } from "./config";
import * as path from "path";

// ============================================================================
// Screenshots
// ============================================================================

export async function takeScreenshot(page: Page, name: string): Promise<string> {
  ensureArtifactsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(PATHS.artifacts, filename);

  await page.screenshot({ path: filepath, fullPage: false });
  log(`Screenshot: ${filename}`);
  return filepath;
}

// ============================================================================
// Overlay Dismissal
// ============================================================================

/**
 * Attempts to dismiss common overlays/popups that block interaction.
 * Returns the number of overlays dismissed.
 */
export async function dismissOverlays(page: Page): Promise<number> {
  let dismissed = 0;

  // Common close button patterns
  const closePatterns = [
    // Text-based close buttons
    { type: 'text', value: 'Close' },
    { type: 'text', value: 'close' },
    { type: 'text', value: '×' },
    { type: 'text', value: 'X' },
    { type: 'text', value: 'No thanks' },
    { type: 'text', value: 'No Thanks' },
    { type: 'text', value: 'Maybe later' },
    { type: 'text', value: 'Not now' },
    { type: 'text', value: 'Dismiss' },
    { type: 'text', value: 'Got it' },
    { type: 'text', value: 'Continue' },
    { type: 'text', value: 'Skip' },

    // Aria-label based
    { type: 'selector', value: '[aria-label="close"]' },
    { type: 'selector', value: '[aria-label="Close"]' },
    { type: 'selector', value: '[aria-label="Close modal"]' },
    { type: 'selector', value: '[aria-label="Dismiss"]' },

    // Data attributes
    { type: 'selector', value: '[data-testid*="close"]' },
    { type: 'selector', value: '[data-testid*="dismiss"]' },
    { type: 'selector', value: '[data-cy*="close"]' },

    // Common class patterns
    { type: 'selector', value: '.modal-close' },
    { type: 'selector', value: '.close-button' },
    { type: 'selector', value: '.dismiss-button' },
    { type: 'selector', value: '[class*="CloseButton"]' },
    { type: 'selector', value: '[class*="closeButton"]' },
  ];

  for (const pattern of closePatterns) {
    try {
      let locator;
      if (pattern.type === 'text') {
        // Look for buttons with this exact text
        locator = page.locator(`button:has-text("${pattern.value}"), [role="button"]:has-text("${pattern.value}")`);
      } else {
        locator = page.locator(pattern.value);
      }

      const count = await locator.count();
      for (let i = 0; i < count; i++) {
        const element = locator.nth(i);
        try {
          // Check if visible and clickable
          if (await element.isVisible({ timeout: 300 })) {
            // Make sure it's not a main page element (check if it's in a modal-like container)
            const isInOverlay = await element.evaluate((el) => {
              const parent = el.closest('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="popup"], [class*="Popup"], [class*="overlay"], [class*="Overlay"], [class*="banner"], [class*="Banner"]');
              return parent !== null;
            }).catch(() => false);

            // Also click if it's a standalone close button (aria-label close)
            const hasCloseLabel = await element.getAttribute('aria-label').catch(() => null);
            const isCloseButton = hasCloseLabel?.toLowerCase().includes('close');

            if (isInOverlay || isCloseButton) {
              await element.click({ timeout: 1000 });
              dismissed++;
              log(`  Dismissed overlay (${pattern.type}: ${pattern.value})`);
              await page.waitForTimeout(300);
            }
          }
        } catch {
          // Element not interactable, continue
        }
      }
    } catch {
      // Pattern not found, continue
    }
  }

  // Also try pressing Escape key to close modals
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } catch {
    // Ignore
  }

  return dismissed;
}

// ============================================================================
// Wait for Stable UI
// ============================================================================

/**
 * Waits for the page to reach a stable state.
 * - Network activity settles
 * - No loading spinners
 * - Key elements are visible
 */
export async function waitForStable(page: Page, options: { timeout?: number } = {}): Promise<void> {
  const { timeout = 15000 } = options;

  // Wait for DOM content
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
  } catch {
    // Continue anyway
  }

  // Wait for loading spinners to disappear
  // The Shef loading animation is an SVG/image, so also check for common patterns
  try {
    await page.waitForFunction(() => {
      // Check for common loading indicators
      const body = document.body;
      if (!body) return false;

      // Check if there's actual content (not just a spinner)
      const hasContent = body.innerText.length > 200;
      const hasImages = document.querySelectorAll('img[src]').length > 2;

      // Check for loading states
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
      const hasVisibleLoading = Array.from(loadingElements).some(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      return (hasContent || hasImages) && !hasVisibleLoading;
    }, { timeout });
  } catch {
    // Timeout waiting for content, continue anyway
    log("  Warning: Page may still be loading");
  }

  // Additional wait for any animations/rendering
  await page.waitForTimeout(1000);
}

// ============================================================================
// Navigation
// ============================================================================

/**
 * Navigates to a URL, waits for stable UI, and dismisses overlays.
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  log(`Navigating to: ${url}`);

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Wait for page to stabilize
  await waitForStable(page);

  // Dismiss any overlays
  const dismissed = await dismissOverlays(page);
  if (dismissed > 0) {
    log(`  Dismissed ${dismissed} overlay(s)`);
  }

  // Brief wait after dismissing
  await page.waitForTimeout(500);
}

/**
 * Scrolls to the bottom of an element (useful for modals)
 */
export async function scrollToBottom(page: Page, selector?: string): Promise<void> {
  await page.evaluate((sel) => {
    if (sel) {
      const element = document.querySelector(sel);
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    } else {
      window.scrollTo(0, document.body.scrollHeight);
    }
  }, selector);
  await page.waitForTimeout(300);
}

/**
 * Scrolls an element into view
 */
export async function scrollIntoView(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.scrollIntoViewIfNeeded({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Test Entry Point
// ============================================================================

if (require.main === module) {
  import('./session').then(async ({ launchBrowser, closeBrowser }) => {
    const DEBUG = process.argv.includes('--debug');

    console.log("=".repeat(50));
    console.log("MODULE 3: Navigation & Overlays - Test");
    console.log("=".repeat(50));
    console.log();

    // Launch browser
    console.log("Launching browser...");
    const context = await launchBrowser({ headless: !DEBUG });
    const page = context.pages()[0] || await context.newPage();
    console.log();

    // Test 1: Navigate to home page
    console.log("Test 1: Navigate to shef.com");
    await navigateTo(page, 'https://shef.com');
    await takeScreenshot(page, 'nav-test-home');
    console.log("  Done");
    console.log();

    // Test 2: Navigate to a shef's page
    console.log("Test 2: Navigate to a shef's menu page");
    await navigateTo(page, 'https://shef.com/shef/moms-b');
    await takeScreenshot(page, 'nav-test-shef');
    console.log("  Done");
    console.log();

    // Test 3: Navigate to a dish URL (should open modal)
    console.log("Test 3: Navigate to a dish URL");
    await navigateTo(page, 'https://shef.com/order/shef/moms-b/chill-fish-weekdays-273175');
    // Extra wait for dish modal to fully load
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'nav-test-dish');
    console.log("  Done");
    console.log();

    console.log("=".repeat(50));
    console.log("SUCCESS: All navigation tests passed");
    console.log("Check artifacts/ folder for screenshots");
    console.log("=".repeat(50));

    // Cleanup
    if (!DEBUG) {
      await closeBrowser(context);
    } else {
      console.log();
      console.log("[DEBUG] Browser left open. Press Ctrl+C to exit.");
    }
  }).catch((err) => {
    console.error("Test failed:", err.message);
    process.exit(1);
  });
}
