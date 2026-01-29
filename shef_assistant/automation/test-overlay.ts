import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

async function testOverlay() {
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

    // Check for the overlay element
    const overlay = page.locator('div.sc-czkgLR');
    const overlayCount = await overlay.count();
    console.log(`Found ${overlayCount} overlay elements`);

    if (overlayCount > 0) {
      const first = overlay.first();
      const box = await first.boundingBox();
      const style = await first.evaluate((el) => {
        const s = window.getComputedStyle(el);
        return {
          position: s.position,
          zIndex: s.zIndex,
          pointerEvents: s.pointerEvents,
          backgroundColor: s.backgroundColor,
          display: s.display,
          width: s.width,
          height: s.height,
        };
      });
      console.log(`Overlay bounding box: ${JSON.stringify(box)}`);
      console.log(`Overlay style: ${JSON.stringify(style, null, 2)}`);

      // Try clicking outside the overlay to dismiss it
      console.log("\nTrying to click outside overlay...");
      await page.mouse.click(10, 10);
      await page.waitForTimeout(1000);
    }

    // Check what modal-root contains
    const modalRoot = page.locator('#shef-modal-root');
    const modalRootHtml = await modalRoot.innerHTML().catch(() => "not found");
    console.log(`\nModal root HTML (first 1000 chars):\n${modalRootHtml.substring(0, 1000)}`);

    // Find plus button and check its state
    const plusBtn = page.locator('button.sc-futREh').nth(1);
    const plusVisible = await plusBtn.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`\nPlus button visible: ${plusVisible}`);

    if (plusVisible) {
      // Check what's blocking the click
      const plusBox = await plusBtn.boundingBox();
      console.log(`Plus button box: ${JSON.stringify(plusBox)}`);

      // Try to get element at the click point
      if (plusBox) {
        const centerX = plusBox.x + plusBox.width / 2;
        const centerY = plusBox.y + plusBox.height / 2;

        const elementAtPoint = await page.evaluate(({ x, y }) => {
          const el = document.elementFromPoint(x, y);
          if (el) {
            return {
              tagName: el.tagName,
              className: el.className,
              id: el.id,
            };
          }
          return null;
        }, { x: centerX, y: centerY });

        console.log(`Element at plus button center: ${JSON.stringify(elementAtPoint)}`);
      }

      // Try JS click
      console.log("\nAttempting JS click on plus button...");
      const handle = await plusBtn.elementHandle();
      if (handle) {
        await page.evaluate((el) => {
          (el as HTMLElement).click();
          console.log("JS click executed");
        }, handle);
        await page.waitForTimeout(1000);

        // Check if quantity changed
        const qtySpan = page.locator('span.mt-\\[3px\\]').first();
        const qty = await qtySpan.textContent().catch(() => "?");
        console.log(`Quantity after JS click: ${qty}`);
      }

      // Try dispatchEvent
      console.log("\nAttempting dispatchEvent click...");
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button.sc-futREh');
        if (buttons.length >= 2) {
          const plusBtn = buttons[1];
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
          });
          plusBtn.dispatchEvent(clickEvent);
        }
      });
      await page.waitForTimeout(1000);

      // Check quantity again
      const qtyAfter = await page.locator('span.mt-\\[3px\\]').first().textContent().catch(() => "?");
      console.log(`Quantity after dispatchEvent: ${qtyAfter}`);
    }

    // Check Update button state
    const updateBtn = page.locator('button:has-text("Update")').first();
    const updateVisible = await updateBtn.isVisible({ timeout: 1000 }).catch(() => false);
    const updateDisabled = updateVisible ? await updateBtn.isDisabled() : null;
    console.log(`\nUpdate button visible: ${updateVisible}, disabled: ${updateDisabled}`);

    console.log("\nBrowser open for 30 seconds...");
    await page.waitForTimeout(30000);

  } finally {
    await context.close();
  }
}

testOverlay().catch(console.error);
