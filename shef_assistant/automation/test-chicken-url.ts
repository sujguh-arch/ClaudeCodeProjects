import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

async function testChickenUrl() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    const testUrl = "https://shef.com/order/shef/moms-b/hydrabad-chicken-65--226304";
    console.log(`Navigating to: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("Page loaded, waiting...");
    await page.waitForTimeout(5000);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `chicken-url-${timestamp}.png`),
      fullPage: true
    });

    // Check for modal
    const modalRoot = page.locator('#shef-modal-root');
    const modalHtml = await modalRoot.innerHTML().catch(() => "not found");
    console.log(`Modal root content (first 500 chars): ${modalHtml.substring(0, 500)}`);

    // Look for Add/Update buttons
    const addBtn = page.locator('button:has-text("Add")').first();
    const updateBtn = page.locator('button:has-text("Update")').first();
    const hasAdd = await addBtn.isVisible({ timeout: 1000 }).catch(() => false);
    const hasUpdate = await updateBtn.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Add button: ${hasAdd}, Update button: ${hasUpdate}`);

    // Check page title or heading
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Check URL
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check if there's any error message
    const errorText = await page.locator('text=error, text=not found, text=unavailable').first().textContent().catch(() => null);
    if (errorText) {
      console.log(`Possible error text: ${errorText}`);
    }

    // Try clicking on the dish card if modal didn't open
    const dishCard = page.locator(`button:has-text("Hydrabad Chicken 65"), button:has-text("Chicken 65")`).first();
    const hasDishCard = await dishCard.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`\nDish card visible: ${hasDishCard}`);

    if (hasDishCard) {
      console.log("Clicking on dish card to open modal...");
      await dishCard.click();
      await page.waitForTimeout(3000);

      // Check again for Add/Update
      const hasAdd2 = await addBtn.isVisible({ timeout: 1000 }).catch(() => false);
      const hasUpdate2 = await updateBtn.isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`After clicking card - Add: ${hasAdd2}, Update: ${hasUpdate2}`);

      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `chicken-after-click-${timestamp}.png`),
        fullPage: true
      });
    }

    console.log("\nBrowser open for 30 seconds...");
    await page.waitForTimeout(30000);

  } finally {
    await context.close();
  }
}

testChickenUrl().catch(console.error);
