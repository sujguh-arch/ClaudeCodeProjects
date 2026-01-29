import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

async function testQuantityControls() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    const testUrl = "https://shef.com/order/shef/moms-b/chill-fish-weekdays-273175";
    console.log(`Navigating to: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    // Find the Update button first to locate the modal area
    const updateBtn = page.locator('button:has-text("Update")').first();
    const hasUpdate = await updateBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Update button visible: ${hasUpdate}`);

    // Find Add button
    const addBtn = page.locator('button:has-text("Add")').first();
    const hasAdd = await addBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Add button visible: ${hasAdd}`);

    // Look for quantity controls - these might be within a specific container
    // Search for elements near the Update/Add button

    // Try different patterns for quantity controls
    console.log("\nSearching for quantity control patterns:");

    // Pattern 1: Input type number
    const numberInput = page.locator('input[type="number"]');
    const hasNumberInput = await numberInput.count();
    console.log(`  Number inputs: ${hasNumberInput}`);

    // Pattern 2: Stepper with + and -
    const plusBtn = page.locator('button:has-text("+")').first();
    const hasPlusBtn = await plusBtn.isVisible({ timeout: 500 }).catch(() => false);
    console.log(`  Plus button: ${hasPlusBtn}`);

    const minusBtn = page.locator('button:has-text("-")').first();
    const hasMinusBtn = await minusBtn.isVisible({ timeout: 500 }).catch(() => false);
    console.log(`  Minus button: ${hasMinusBtn}`);

    // Pattern 3: SVG icons for + and -
    const svgPlus = page.locator('button svg[class*="plus"], button svg path[d*="M12 5v14"]');
    const hasSvgPlus = await svgPlus.count();
    console.log(`  SVG plus icons: ${hasSvgPlus}`);

    // Pattern 4: Look for quantity text near Update button
    // Get HTML content of the modal area
    const modalArea = page.locator('button:has-text("Update")').locator('..').locator('..');
    try {
      const modalHtml = await modalArea.innerHTML();
      console.log(`\nModal area HTML (first 2000 chars):\n${modalHtml.substring(0, 2000)}`);
    } catch {
      console.log("Could not get modal area HTML");
    }

    // Take a focused screenshot of just the bottom part where quantity controls should be
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // Try to screenshot just the Update button area
    if (hasUpdate) {
      try {
        await updateBtn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        // Take screenshot of the update button and surrounding area
        const btnBox = await updateBtn.boundingBox();
        if (btnBox) {
          // Capture area around the button (200px above for quantity controls)
          await page.screenshot({
            path: path.join(ARTIFACTS_DIR, `qty-controls-${timestamp}.png`),
            clip: {
              x: Math.max(0, btnBox.x - 50),
              y: Math.max(0, btnBox.y - 200),
              width: btnBox.width + 100,
              height: 250,
            }
          });
          console.log(`\nScreenshot of quantity area saved`);
        }
      } catch (e) {
        console.log(`Could not screenshot button area: ${e}`);
      }
    }

    // Full page screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `test-qty-full-${timestamp}.png`),
      fullPage: true
    });

    console.log("\nBrowser open for 20 seconds for inspection...");
    await page.waitForTimeout(20000);

  } finally {
    await context.close();
  }
}

testQuantityControls().catch(console.error);
