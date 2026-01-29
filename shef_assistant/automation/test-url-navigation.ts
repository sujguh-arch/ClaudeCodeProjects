import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

async function testNavigation() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,  // Show browser for debugging
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    const testUrl = "https://shef.com/order/shef/moms-b/chill-fish-weekdays-273175";
    console.log(`Navigating to: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("Page loaded, waiting for modal...");
    await page.waitForTimeout(5000);

    // Take screenshot of what we see
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `test-nav-${timestamp}.png`), fullPage: true });

    // Look for the modal/dialog
    const modal = page.locator('[role="dialog"], [data-testid*="modal"], .modal, [class*="modal"]');
    const modalCount = await modal.count();
    console.log(`Found ${modalCount} modal elements`);

    // Find all buttons and log them
    const buttons = page.locator("button");
    const btnCount = await buttons.count();
    console.log(`\nFound ${btnCount} buttons total. Listing visible ones:`);

    for (let i = 0; i < btnCount; i++) {
      const btn = buttons.nth(i);
      const isVisible = await btn.isVisible({ timeout: 200 }).catch(() => false);
      if (isVisible) {
        const text = await btn.textContent();
        const ariaLabel = await btn.getAttribute("aria-label");
        if (text?.trim() || ariaLabel) {
          console.log(`  Button: "${text?.trim() || ariaLabel}" aria-label="${ariaLabel || 'none'}"`);
        }
      }
    }

    // Try to find Add to Cart button with different selectors
    console.log("\nTrying different Add button selectors:");
    const selectors = [
      'button:has-text("Add")',
      'button:has-text("Add to Cart")',
      'button:has-text("Add to cart")',
      'button[data-testid*="add"]',
      '[data-testid*="add-to-cart"]',
      'button:has-text("+")',
      'button[aria-label*="add"]',
      'button[aria-label*="increase"]',
    ];

    for (const sel of selectors) {
      const found = await page.locator(sel).first().isVisible({ timeout: 500 }).catch(() => false);
      console.log(`  ${sel}: ${found ? "FOUND" : "not found"}`);
    }

    // Wait for user to see browser
    console.log("\nBrowser open for 30 seconds for inspection...");
    await page.waitForTimeout(30000);

  } finally {
    await context.close();
  }
}

testNavigation().catch(console.error);
