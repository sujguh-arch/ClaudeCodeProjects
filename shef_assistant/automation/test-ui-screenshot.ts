import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

async function takeUIScreenshot() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Navigate to our app
    await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Take screenshot of the main UI
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotPath = path.join(ARTIFACTS_DIR, `ui-main-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Check login status indicator
    const statusText = await page.locator("text=Logged In, text=Not Logged In, text=No Session").first().textContent().catch(() => null);
    console.log(`Login status visible: ${statusText || "not found"}`);

    // Check if Login button is visible
    const loginBtn = page.locator("button:has-text('Log In')");
    const hasLoginBtn = await loginBtn.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Login button visible: ${hasLoginBtn}`);

    // If login button is visible, click it and take screenshot of instructions
    if (hasLoginBtn) {
      console.log("Clicking Login button to test instruction display...");
      await loginBtn.click();
      await page.waitForTimeout(2000);

      const instructionScreenshot = path.join(ARTIFACTS_DIR, `ui-login-instructions-${timestamp}.png`);
      await page.screenshot({ path: instructionScreenshot, fullPage: true });
      console.log(`Instructions screenshot saved: ${instructionScreenshot}`);

      // Check if instructions are visible
      const instructionsVisible = await page.locator("text=Browser opened").isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`Instructions visible after clicking Login: ${instructionsVisible}`);
    }

    console.log("UI test complete!");
  } finally {
    await browser.close();
  }
}

takeUIScreenshot().catch(console.error);
