/**
 * Module 2: Session Management
 *
 * Handles browser launch with persistent profile and login state detection.
 */

import { chromium, BrowserContext, Page } from "playwright";
import { PATHS, log } from "./config";
import * as fs from "fs";

// ============================================================================
// Types
// ============================================================================

export interface SessionOptions {
  headless?: boolean;  // Default: true (false for debug)
  viewport?: { width: number; height: number };
}

export interface LoginStatus {
  loggedIn: boolean;
  indicator?: string;  // What we found that indicates logged in (e.g., account name)
}

// ============================================================================
// Browser Launch
// ============================================================================

export async function launchBrowser(options: SessionOptions = {}): Promise<BrowserContext> {
  const { headless = true, viewport = { width: 1280, height: 900 } } = options;

  // Check if profile exists
  if (!fs.existsSync(PATHS.profile)) {
    throw new Error(
      `Browser profile not found at ${PATHS.profile}\n` +
      `Run 'npm run shef:login' first to create a session.`
    );
  }

  log(`Launching browser (headless: ${headless})`);
  log(`Using profile: ${PATHS.profile}`);

  const context = await chromium.launchPersistentContext(PATHS.profile, {
    headless,
    viewport,
  });

  return context;
}

export async function closeBrowser(context: BrowserContext): Promise<void> {
  await context.close();
  log("Browser closed");
}

// ============================================================================
// Login Detection
// ============================================================================

/**
 * Checks if user is logged in by looking for account indicators on the page.
 * Should be called after navigating to shef.com
 */
export async function checkLoginStatus(page: Page): Promise<LoginStatus> {
  // Wait a moment for page to settle
  await page.waitForTimeout(1000);

  // Strategy 1: Look for "Sign in" or "Log in" button (means NOT logged in)
  try {
    const signInButton = page.locator('button:has-text("Sign in"), button:has-text("Log in"), a:has-text("Sign in"), a:has-text("Log in")');
    if (await signInButton.isVisible({ timeout: 2000 })) {
      return { loggedIn: false };
    }
  } catch {
    // No sign in button found, might be logged in
  }

  // Strategy 2: Look for account menu / profile icon / user name
  // Common patterns: "Account", "Hi [Name]", profile avatar, etc.
  const accountIndicators = [
    '[data-testid*="account"]',
    '[data-testid*="profile"]',
    '[data-testid*="user"]',
    '[aria-label*="account" i]',
    '[aria-label*="profile" i]',
    'button:has-text("Account")',
    '[class*="avatar"]',
    '[class*="profile"]',
  ];

  for (const selector of accountIndicators) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 500 })) {
        const text = await element.textContent().catch(() => null);
        return {
          loggedIn: true,
          indicator: text?.trim() || selector
        };
      }
    } catch {
      // Continue to next
    }
  }

  // Strategy 3: Check for cart with items (usually requires login)
  try {
    const cartButton = page.locator('button:has-text("Cart"), [aria-label*="cart" i]').first();
    if (await cartButton.isVisible({ timeout: 1000 })) {
      const cartText = await cartButton.textContent();
      // If cart shows a number, user is likely logged in
      if (cartText && /\d+/.test(cartText)) {
        return { loggedIn: true, indicator: `Cart: ${cartText.trim()}` };
      }
    }
  } catch {
    // Continue
  }

  // Strategy 4: Look for any element that suggests logged-in state
  try {
    // Check page for common logged-in indicators in the HTML
    const hasAccountMenu = await page.evaluate(() => {
      const html = document.body.innerHTML.toLowerCase();
      return html.includes('sign out') ||
             html.includes('log out') ||
             html.includes('my account') ||
             html.includes('my orders');
    });
    if (hasAccountMenu) {
      return { loggedIn: true, indicator: "Found account-related text in page" };
    }
  } catch {
    // Continue
  }

  // If we couldn't find clear indicators either way, assume not logged in
  return { loggedIn: false };
}

/**
 * Ensures user is logged in. Throws if not.
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  const status = await checkLoginStatus(page);

  if (!status.loggedIn) {
    throw new Error(
      "Not logged in to Shef!\n" +
      "Run 'npm run shef:login' to log in manually."
    );
  }

  log(`Logged in (${status.indicator})`);
}

// ============================================================================
// Test Entry Point
// ============================================================================

if (require.main === module) {
  const DEBUG = process.argv.includes("--debug");

  async function test() {
    console.log("=".repeat(50));
    console.log("MODULE 2: Session Management - Test");
    console.log("=".repeat(50));
    console.log();

    // Check profile exists
    console.log("Checking browser profile...");
    if (!fs.existsSync(PATHS.profile)) {
      console.log(`ERROR: Profile not found at ${PATHS.profile}`);
      console.log("Run 'npm run shef:login' first.");
      process.exit(1);
    }
    console.log("  Profile exists");
    console.log();

    // Launch browser
    console.log("Launching browser...");
    const context = await launchBrowser({ headless: !DEBUG });
    const page = context.pages()[0] || await context.newPage();
    console.log("  Browser launched");
    console.log();

    // Navigate to Shef
    console.log("Navigating to shef.com...");
    await page.goto("https://shef.com", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000); // Let page fully render
    console.log("  Page loaded");
    console.log();

    // Check login status
    console.log("Checking login status...");
    const status = await checkLoginStatus(page);
    console.log();

    if (status.loggedIn) {
      console.log("SUCCESS: Logged in!");
      console.log(`  Indicator: ${status.indicator}`);
    } else {
      console.log("NOT LOGGED IN");
      console.log("  Run 'npm run shef:login' to log in manually.");
    }

    // Cleanup
    if (!DEBUG) {
      await closeBrowser(context);
    } else {
      console.log();
      console.log("[DEBUG] Browser left open. Press Ctrl+C to exit.");
    }
  }

  test().catch((err) => {
    console.error("Test failed:", err.message);
    process.exit(1);
  });
}
