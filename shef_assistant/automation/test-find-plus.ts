import { chromium } from "playwright";
import * as path from "path";

const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");

async function testFindPlus() {
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

    // Find the modal area by looking for Update button
    const updateBtn = page.locator('button:has-text("Update")').first();

    // Try many different selectors for plus/minus
    const selectors = [
      { name: 'button:has-text("+")', sel: 'button:has-text("+")' },
      { name: 'button:has-text("-")', sel: 'button:has-text("-")' },
      { name: '[aria-label*="increase"]', sel: '[aria-label*="increase"]' },
      { name: '[aria-label*="decrease"]', sel: '[aria-label*="decrease"]' },
      { name: '[aria-label*="add"]', sel: '[aria-label*="add"]' },
      { name: '[aria-label*="remove"]', sel: '[aria-label*="remove"]' },
      { name: '[data-testid*="plus"]', sel: '[data-testid*="plus"]' },
      { name: '[data-testid*="minus"]', sel: '[data-testid*="minus"]' },
      { name: '[data-testid*="increase"]', sel: '[data-testid*="increase"]' },
      { name: '[data-testid*="decrease"]', sel: '[data-testid*="decrease"]' },
      { name: 'button svg', sel: 'button svg' },
    ];

    console.log("\nSearching for quantity control selectors:");
    for (const { name, sel } of selectors) {
      const count = await page.locator(sel).count();
      console.log(`  ${name}: ${count} found`);
    }

    // Find all visible buttons and check their exact content
    console.log("\n\nLooking at all buttons with single character text:");
    const allBtns = page.locator("button");
    const btnCount = await allBtns.count();

    for (let i = 0; i < btnCount; i++) {
      const btn = allBtns.nth(i);
      try {
        const isVisible = await btn.isVisible({ timeout: 100 });
        if (!isVisible) continue;

        const text = await btn.textContent();
        const trimmed = text?.trim();

        // Log buttons with very short text (like + or -)
        if (trimmed && trimmed.length <= 3) {
          const innerHtml = await btn.innerHTML();
          const hasPlus = innerHtml.includes('+') || innerHtml.includes('plus') || innerHtml.includes('Plus');
          const hasMinus = innerHtml.includes('-') || innerHtml.includes('minus') || innerHtml.includes('Minus');
          const hasSvg = innerHtml.includes('<svg');

          console.log(`  Button "${trimmed}" - hasSVG: ${hasSvg}, hasPlus: ${hasPlus}, hasMinus: ${hasMinus}`);

          if (hasPlus || hasMinus) {
            console.log(`    innerHTML: ${innerHtml.substring(0, 300)}...`);
          }
        }
      } catch {
        // Skip
      }
    }

    // Try finding the quantity stepper container
    console.log("\n\nLooking for quantity stepper patterns:");

    // Check for common stepper container patterns
    const stepperPatterns = [
      '[class*="stepper"]',
      '[class*="quantity"]',
      '[class*="counter"]',
      '[class*="QtyPicker"]',
      '[class*="QuantitySelector"]',
    ];

    for (const pattern of stepperPatterns) {
      const count = await page.locator(pattern).count();
      if (count > 0) {
        console.log(`  ${pattern}: ${count} found`);
        const first = page.locator(pattern).first();
        const html = await first.innerHTML().catch(() => "");
        console.log(`    HTML: ${html.substring(0, 500)}...`);
      }
    }

    // Get the DOM near the Update button
    console.log("\n\nGetting parent structure of Update button:");
    const parentEl = updateBtn.locator('xpath=..');
    const grandparentEl = updateBtn.locator('xpath=../..');

    const parentHtml = await parentEl.innerHTML().catch(() => "error");
    console.log(`Parent HTML (${parentHtml.length} chars):`);
    console.log(parentHtml.substring(0, 1500));

    console.log("\nBrowser open for 30 seconds...");
    await page.waitForTimeout(30000);

  } finally {
    await context.close();
  }
}

testFindPlus().catch(console.error);
