import { chromium, Page, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";

interface ConfigItem {
  name: string;
  url: string;
  quantity: number;
}

interface Config {
  shefHomeUrl: string;
  cartUrl: string;
  items: ConfigItem[];
}

const CONFIG_PATH = path.join(__dirname, "..", "data", "config.json");
const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

// Check for debug mode via --debug flag or DEBUG_SHEF env var
const DEBUG_MODE = process.argv.includes("--debug") || process.env.DEBUG_SHEF === "1";

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      "config.json not found. Copy data/config.example.json to data/config.json and customize it."
    );
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function ensureArtifactsDir(): void {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
}

async function takeErrorScreenshot(page: Page, prefix: string = "prefill-error"): Promise<string> {
  ensureArtifactsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshotPath = path.join(ARTIFACTS_DIR, `${prefix}-${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

/**
 * Attempts to dismiss common overlays/popups that may block interaction.
 * Safe to call even when no overlays are present.
 */
async function dismissOverlays(page: Page): Promise<void> {
  log("  Checking for overlays to dismiss...");

  // Common close button patterns to try
  const closePatterns = [
    // Role-based buttons with common close text
    { type: "role", name: "close" },
    { type: "role", name: "Close" },
    { type: "role", name: "×" },
    { type: "role", name: "X" },
    // Aria-label based
    { type: "selector", selector: '[aria-label="close"]' },
    { type: "selector", selector: '[aria-label="Close"]' },
    // Data-testid patterns
    { type: "selector", selector: '[data-testid*="close"]' },
    { type: "selector", selector: '[data-testid*="Close"]' },
    { type: "selector", selector: '[data-testid*="dismiss"]' },
    // Modal-specific close buttons
    { type: "selector", selector: '#shef-modal-root button[aria-label="close"]' },
    { type: "selector", selector: '#shef-modal-root button[aria-label="Close"]' },
    { type: "selector", selector: '#shef-modal-root [data-testid*="close"]' },
    // Common modal close button selectors
    { type: "selector", selector: '.modal-close' },
    { type: "selector", selector: '.close-button' },
    { type: "selector", selector: '[class*="close"]' },
    // Continue shopping / Got it buttons that dismiss modals
    { type: "role", name: "Continue Shopping" },
    { type: "role", name: "Continue shopping" },
    { type: "role", name: "Got it" },
    { type: "role", name: "Dismiss" },
  ];

  let dismissed = 0;

  for (const pattern of closePatterns) {
    try {
      let locator;
      if (pattern.type === "role") {
        locator = page.getByRole("button", { name: pattern.name });
      } else {
        locator = page.locator(pattern.selector);
      }

      // Check if any matching element is visible (short timeout)
      const count = await locator.count();
      for (let i = 0; i < count; i++) {
        const element = locator.nth(i);
        try {
          if (await element.isVisible({ timeout: 500 })) {
            if (await element.isEnabled({ timeout: 500 })) {
              const identifier = pattern.type === "role" ? `role=button[name="${pattern.name}"]` : pattern.selector;
              log(`    Found overlay close button: ${identifier}`);
              await element.click({ timeout: 1000 });
              dismissed++;
              // Small delay after clicking
              await page.waitForTimeout(300);
            }
          }
        } catch {
          // Element not interactable, continue
        }
      }
    } catch {
      // Pattern not found or not clickable, continue to next
    }
  }

  if (dismissed > 0) {
    log(`    Dismissed ${dismissed} overlay(s)`);
  } else {
    log("    No overlays found");
  }
}

/**
 * Attempts to find and click an "Add to cart" button using various strategies.
 * Returns true if successful, false otherwise.
 */
async function findAndClickAddToCart(page: Page): Promise<{ success: boolean; triedLocators: string[] }> {
  const triedLocators: string[] = [];

  // Primary strategy: getByRole with exact and partial matches
  const roleNames = [
    "Add to cart",
    "Add to Cart",
    "Add",
    "Add to order",
    "Add to Order",
    "Add to bag",
    "Add to Bag",
  ];

  log("  Trying role-based button locators...");
  for (const name of roleNames) {
    const locatorDesc = `getByRole('button', { name: '${name}' })`;
    triedLocators.push(locatorDesc);
    try {
      const button = page.getByRole("button", { name });
      const count = await button.count();

      for (let i = 0; i < count; i++) {
        const btn = button.nth(i);
        try {
          const isVisible = await btn.isVisible({ timeout: 1000 });
          const isEnabled = await btn.isEnabled({ timeout: 500 });

          if (isVisible && isEnabled) {
            log(`  Found button: ${locatorDesc} (instance ${i + 1}/${count})`);
            await btn.click();
            return { success: true, triedLocators };
          }
        } catch {
          // This instance not available
        }
      }
    } catch {
      // This locator didn't work
    }
  }

  // Fallback: CSS selector patterns
  log("  Trying CSS selector fallbacks...");
  const selectorPatterns = [
    'button:has-text("Add to Cart")',
    'button:has-text("Add to cart")',
    '[data-testid="add-to-cart"]',
    '[data-testid*="add-to-cart"]',
    'button[aria-label*="cart" i]',
    'button[aria-label*="add" i]',
    ".add-to-cart-button",
    ".add-to-cart",
    '[class*="addToCart"]',
    '[class*="add-to-cart"]',
  ];

  for (const selector of selectorPatterns) {
    triedLocators.push(selector);
    try {
      const button = page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 })) {
        if (await button.isEnabled({ timeout: 500 })) {
          log(`  Found button with selector: ${selector}`);
          await button.click();
          return { success: true, triedLocators };
        }
      }
    } catch {
      // Try next selector
    }
  }

  // Last resort: scan all buttons for "Add" text
  log("  Scanning all buttons for 'Add' text...");
  triedLocators.push("(scanning all buttons)");
  try {
    const allButtons = page.locator("button");
    const count = await allButtons.count();
    log(`    Found ${count} buttons on page`);

    for (let i = 0; i < count; i++) {
      const btn = allButtons.nth(i);
      try {
        const text = await btn.textContent({ timeout: 500 });
        const isVisible = await btn.isVisible({ timeout: 500 });
        const isEnabled = await btn.isEnabled({ timeout: 500 });

        if (text && text.toLowerCase().includes("add") && isVisible && isEnabled) {
          log(`    Found fallback button: "${text.trim()}"`);
          await btn.click();
          return { success: true, triedLocators };
        }
      } catch {
        // Skip this button
      }
    }
  } catch {
    // Button scan failed
  }

  return { success: false, triedLocators };
}

async function addItemToCart(
  page: Page,
  item: ConfigItem
): Promise<void> {
  log(`Processing: ${item.name} (quantity: ${item.quantity})`);

  for (let i = 0; i < item.quantity; i++) {
    log(`  [${i + 1}/${item.quantity}] Navigating to ${item.url}`);
    await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for page to stabilize
    await page.waitForTimeout(1500);

    // Dismiss any overlays before trying to click Add to Cart
    await dismissOverlays(page);

    // Try to find and click Add to Cart button
    const { success, triedLocators } = await findAndClickAddToCart(page);

    if (!success) {
      log(`  ERROR: Could not find Add to Cart button for ${item.name}`);
      log(`  Locators tried:`);
      for (const loc of triedLocators) {
        log(`    - ${loc}`);
      }

      // Take screenshot for debugging
      await takeErrorScreenshot(page, `add-to-cart-failed-${item.name.replace(/[^a-z0-9]/gi, "-")}`);

      throw new Error(`Failed to add ${item.name} to cart - no Add button found. See screenshot in artifacts/`);
    }

    // Wait for cart update
    log(`  Waiting for cart to update...`);
    await page.waitForTimeout(2000);

    // Dismiss any modals that may have appeared after adding to cart
    await dismissOverlays(page);
  }

  log(`  Added ${item.quantity}x ${item.name} to cart`);
}

export async function runPrefill(): Promise<string[]> {
  const logs: string[] = [];
  const originalLog = log;
  const captureLog = (msg: string) => {
    originalLog(msg);
    logs.push(msg);
  };

  const config = loadConfig();

  captureLog("=".repeat(60));
  captureLog("SHEF CART PREFILL");
  captureLog(`Debug mode: ${DEBUG_MODE ? "ON" : "OFF"}`);
  captureLog("=".repeat(60));

  if (!fs.existsSync(PROFILE_DIR)) {
    throw new Error(
      "Browser profile not found. Run 'npm run shef:login' first to create a session."
    );
  }

  captureLog(`Using profile: ${PROFILE_DIR}`);
  captureLog(`Items to add: ${config.items.length}`);

  // Launch browser with persistent context
  const context: BrowserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // Process each item
    for (const item of config.items) {
      await addItemToCart(page, item);
    }

    // Navigate to cart
    captureLog("=".repeat(60));
    captureLog("Navigating to cart...");
    await page.goto(config.cartUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Dismiss any overlays on cart page
    await dismissOverlays(page);

    captureLog("=".repeat(60));
    captureLog("SUCCESS: Cart prefilled!");
    captureLog("IMPORTANT: Review your cart and complete checkout manually.");
    captureLog("This script will NOT click any purchase/checkout buttons.");
    captureLog("=".repeat(60));

    // Keep browser open for manual review
    captureLog("Browser left open for manual review. Close it when done.");

    if (DEBUG_MODE) {
      captureLog("[DEBUG] Browser will remain open. Press Ctrl+C to exit.");
    }
  } catch (error) {
    captureLog(`ERROR: ${error}`);

    // Take screenshot on error
    try {
      await takeErrorScreenshot(page, "prefill-error");
    } catch (screenshotError) {
      captureLog(`Failed to take error screenshot: ${screenshotError}`);
    }

    if (DEBUG_MODE) {
      captureLog("[DEBUG] Error occurred. Browser left open for inspection.");
      captureLog("[DEBUG] Press Ctrl+C to exit when done debugging.");
      // Don't close the context in debug mode
    } else {
      // Close browser on error only if not in debug mode
      await context.close();
    }

    throw error;
  }

  return logs;
}

// Run if executed directly
if (require.main === module) {
  if (DEBUG_MODE) {
    log("Debug mode enabled via " + (process.argv.includes("--debug") ? "--debug flag" : "DEBUG_SHEF env var"));
  }

  runPrefill().catch((err) => {
    console.error("Prefill failed:", err);
    if (!DEBUG_MODE) {
      process.exit(1);
    }
    // In debug mode, don't exit so user can inspect the browser
  });
}
