/**
 * Quick Login Status Check
 *
 * Checks if user is logged in to Shef using the persistent browser profile.
 * Exits with code 0 if logged in, 1 if not.
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");
const SHEF_URL = "https://shef.com";

async function checkLogin(): Promise<boolean> {
  // Check if profile exists
  if (!fs.existsSync(PROFILE_DIR)) {
    console.log("NO_PROFILE");
    return false;
  }

  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: true,
      viewport: { width: 1280, height: 900 },
    });

    const page = context.pages()[0] || await context.newPage();

    // Navigate to Shef
    await page.goto(SHEF_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Look for sign in button (means NOT logged in)
    try {
      const signInButton = page.locator(
        'button:has-text("Sign in"), button:has-text("Log in"), a:has-text("Sign in"), a:has-text("Log in")'
      );
      if (await signInButton.isVisible({ timeout: 2000 })) {
        console.log("NOT_LOGGED_IN");
        return false;
      }
    } catch {
      // No sign in button found
    }

    // Look for logged-in indicators
    const accountIndicators = [
      '[data-testid*="account"]',
      '[data-testid*="profile"]',
      '[aria-label*="account" i]',
      '[aria-label*="profile" i]',
      '[class*="avatar"]',
    ];

    for (const selector of accountIndicators) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 500 })) {
          console.log("LOGGED_IN");
          return true;
        }
      } catch {
        // Continue
      }
    }

    // Check page content for logged-in markers
    try {
      const hasAccountMenu = await page.evaluate(() => {
        const html = document.body.innerHTML.toLowerCase();
        return html.includes("sign out") ||
               html.includes("log out") ||
               html.includes("my account") ||
               html.includes("my orders");
      });
      if (hasAccountMenu) {
        console.log("LOGGED_IN");
        return true;
      }
    } catch {
      // Continue
    }

    console.log("NOT_LOGGED_IN");
    return false;

  } catch (error) {
    console.log(`ERROR:${error instanceof Error ? error.message : "Unknown error"}`);
    return false;
  } finally {
    if (context) {
      await context.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  checkLogin().then((loggedIn) => {
    process.exit(loggedIn ? 0 : 1);
  });
}

export { checkLogin };
