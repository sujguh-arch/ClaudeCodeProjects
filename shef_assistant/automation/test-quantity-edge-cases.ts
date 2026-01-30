/**
 * Test: Quantity Edge Cases
 *
 * Tests quantity control behavior in the Shef UI:
 * - Decrease to 1 (should disable decrease button)
 * - Increase to 10+ items
 * - Rapid clicks (debounce/race conditions)
 */

import { Page } from "playwright";
import { launchBrowser, closeBrowser, checkLoginStatus } from "./lib/session";
import { loadConfig, log, ConfigItem } from "./lib/config";
import { navigateTo, dismissOverlays, takeScreenshot } from "./lib/navigation";
import { handleRequiredOptions } from "./lib/cart";

interface QuantityTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

// ============================================================================
// Helper: Find Quantity Controls
// ============================================================================

interface QuantityControls {
  minusBtn: ReturnType<Page["locator"]> | null;
  plusBtn: ReturnType<Page["locator"]> | null;
  currentQty: number;
}

async function findQuantityControls(page: Page): Promise<QuantityControls> {
  let minusBtn = null;
  let plusBtn = null;
  let currentQty = 0;

  // Find buttons by index
  const buttonInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    let minusIndex = -1;
    let plusIndex = -1;

    buttons.forEach((btn, index) => {
      const text = btn.textContent || "";
      const cleaned = text.replace(/\s/g, "");
      if (
        cleaned === "-" ||
        cleaned === "−" ||
        cleaned === "–" ||
        cleaned === "—"
      ) {
        minusIndex = index;
      }
      if (cleaned === "+") {
        plusIndex = index;
      }
    });

    return { minusIndex, plusIndex };
  });

  if (buttonInfo.minusIndex >= 0) {
    minusBtn = page.locator("button").nth(buttonInfo.minusIndex);
  }
  if (buttonInfo.plusIndex >= 0) {
    plusBtn = page.locator("button").nth(buttonInfo.plusIndex);
  }

  // Read current quantity from the UI
  try {
    currentQty = await page.evaluate(() => {
      // Look for quantity display between - and + buttons
      const buttons = Array.from(document.querySelectorAll("button"));
      let minusIdx = -1;
      let plusIdx = -1;

      buttons.forEach((btn, idx) => {
        const text = (btn.textContent || "").replace(/\s/g, "");
        if (["-", "−", "–", "—"].includes(text)) minusIdx = idx;
        if (text === "+") plusIdx = idx;
      });

      if (minusIdx >= 0 && plusIdx >= 0) {
        // Find text content between minus and plus buttons
        const minusBtn = buttons[minusIdx];
        const parent = minusBtn.parentElement;
        if (parent) {
          const children = Array.from(parent.children);
          for (const child of children) {
            const text = (child.textContent || "").trim();
            if (/^\d+$/.test(text)) {
              return parseInt(text, 10);
            }
          }
        }
      }

      // Fallback: find any standalone number near buttons
      const allText = document.body.innerText;
      const qtyMatch = allText.match(/(?:^|\s)(\d{1,2})(?:\s|$)/);
      if (qtyMatch) {
        return parseInt(qtyMatch[1], 10);
      }

      return 0;
    });
  } catch {
    // Ignore errors, default to 0
  }

  return { minusBtn, plusBtn, currentQty };
}

// ============================================================================
// Test: Decrease to 1
// ============================================================================

async function testDecreaseToOne(page: Page, item: ConfigItem): Promise<QuantityTestResult> {
  const testName = "Decrease to quantity 1";
  log(`\nRunning: ${testName}`);

  try {
    await navigateTo(page, item.url);
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await handleRequiredOptions(page);

    const controls = await findQuantityControls(page);
    if (!controls.plusBtn || !controls.minusBtn) {
      return {
        testName,
        passed: false,
        details: "Could not find quantity controls",
      };
    }

    // First, increase to 3
    log("  Increasing quantity to 3...");
    for (let i = 0; i < 3; i++) {
      await controls.plusBtn.click({ force: true });
      await page.waitForTimeout(400);
    }

    await takeScreenshot(page, "qty-test-at-3");

    // Now decrease back to 1
    log("  Decreasing quantity to 1...");
    for (let i = 0; i < 2; i++) {
      await controls.minusBtn.click({ force: true });
      await page.waitForTimeout(400);
    }

    await takeScreenshot(page, "qty-test-at-1");

    // Check if minus button is disabled at quantity 1
    const isMinusDisabled = await controls.minusBtn.isDisabled().catch(() => false);
    log(`  Minus button disabled at qty 1: ${isMinusDisabled}`);

    // Try clicking minus again - quantity should stay at 1 or go to 0 (remove)
    await controls.minusBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Verify quantity is 0 or 1 (either behavior is acceptable)
    const finalControls = await findQuantityControls(page);
    const finalQty = finalControls.currentQty;
    log(`  Final quantity after clicking - at 1: ${finalQty}`);

    await takeScreenshot(page, "qty-test-after-min-click");

    // Pass if quantity is 0 (removed) or 1 (blocked) or minus is disabled
    const passed = finalQty <= 1 || isMinusDisabled;
    return {
      testName,
      passed,
      details: isMinusDisabled
        ? "Minus button correctly disabled at quantity 1"
        : finalQty === 0
        ? "Item correctly removed when decreasing below 1"
        : finalQty === 1
        ? "Quantity correctly stayed at 1"
        : `Unexpected quantity: ${finalQty}`,
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      details: `Error: ${error}`,
    };
  }
}

// ============================================================================
// Test: Increase to 10+
// ============================================================================

async function testIncreaseToTenPlus(page: Page, item: ConfigItem): Promise<QuantityTestResult> {
  const testName = "Increase to 10+ items";
  log(`\nRunning: ${testName}`);

  try {
    await navigateTo(page, item.url);
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await handleRequiredOptions(page);

    const controls = await findQuantityControls(page);
    if (!controls.plusBtn) {
      return {
        testName,
        passed: false,
        details: "Could not find plus button",
      };
    }

    // Click plus 12 times
    log("  Clicking + button 12 times...");
    for (let i = 0; i < 12; i++) {
      await controls.plusBtn.click({ force: true });
      await page.waitForTimeout(300);
      if ((i + 1) % 4 === 0) {
        log(`    Clicked ${i + 1} times`);
      }
    }

    await page.waitForTimeout(500);
    await takeScreenshot(page, "qty-test-at-12");

    // Verify quantity reached 12 (or close to it)
    const finalControls = await findQuantityControls(page);
    const finalQty = finalControls.currentQty;
    log(`  Final quantity: ${finalQty}`);

    // Check if plus button is still enabled (no max limit) or disabled
    const isPlusDisabled = controls.plusBtn ? await controls.plusBtn.isDisabled().catch(() => false) : false;
    log(`  Plus button disabled: ${isPlusDisabled}`);

    // Pass if we reached 10+ or if there's a reasonable max limit
    const passed = finalQty >= 10 || (finalQty >= 5 && isPlusDisabled);
    return {
      testName,
      passed,
      details: isPlusDisabled
        ? `Max quantity limit reached at ${finalQty}`
        : `Successfully increased to ${finalQty} items`,
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      details: `Error: ${error}`,
    };
  }
}

// ============================================================================
// Test: Rapid Clicks
// ============================================================================

async function testRapidClicks(page: Page, item: ConfigItem): Promise<QuantityTestResult> {
  const testName = "Rapid click handling";
  log(`\nRunning: ${testName}`);

  try {
    await navigateTo(page, item.url);
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await handleRequiredOptions(page);

    const controls = await findQuantityControls(page);
    if (!controls.plusBtn) {
      return {
        testName,
        passed: false,
        details: "Could not find plus button",
      };
    }

    // Get initial quantity
    const initialQty = controls.currentQty;
    log(`  Initial quantity: ${initialQty}`);

    // Rapid fire clicks (no delay between clicks)
    log("  Performing 5 rapid clicks...");
    const clickPromises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      clickPromises.push(controls.plusBtn.click({ force: true }));
    }

    // Wait for all clicks to process
    await Promise.allSettled(clickPromises);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, "qty-test-rapid-clicks");

    // Check final quantity
    const finalControls = await findQuantityControls(page);
    const finalQty = finalControls.currentQty;
    log(`  Final quantity after rapid clicks: ${finalQty}`);

    // Pass if quantity increased (doesn't need to be exactly +5, debouncing may affect it)
    const increased = finalQty > initialQty;
    const increaseAmount = finalQty - initialQty;

    return {
      testName,
      passed: increased,
      details: increased
        ? `Quantity increased by ${increaseAmount} after rapid clicks (debounce may limit)`
        : "Quantity did not increase - possible race condition",
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      details: `Error: ${error}`,
    };
  }
}

// ============================================================================
// Test: Alternating Plus/Minus
// ============================================================================

async function testAlternatingClicks(page: Page, item: ConfigItem): Promise<QuantityTestResult> {
  const testName = "Alternating plus/minus clicks";
  log(`\nRunning: ${testName}`);

  try {
    await navigateTo(page, item.url);
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await handleRequiredOptions(page);

    const controls = await findQuantityControls(page);
    if (!controls.plusBtn || !controls.minusBtn) {
      return {
        testName,
        passed: false,
        details: "Could not find quantity controls",
      };
    }

    // Start at 3
    log("  Setting initial quantity to 3...");
    for (let i = 0; i < 3; i++) {
      await controls.plusBtn.click({ force: true });
      await page.waitForTimeout(300);
    }

    const midQty = (await findQuantityControls(page)).currentQty;
    log(`  Mid-test quantity: ${midQty}`);

    // Alternate: +, -, +, -, +
    log("  Performing alternating clicks: +, -, +, -, +");
    await controls.plusBtn.click({ force: true });
    await page.waitForTimeout(200);
    await controls.minusBtn.click({ force: true });
    await page.waitForTimeout(200);
    await controls.plusBtn.click({ force: true });
    await page.waitForTimeout(200);
    await controls.minusBtn.click({ force: true });
    await page.waitForTimeout(200);
    await controls.plusBtn.click({ force: true });
    await page.waitForTimeout(500);

    await takeScreenshot(page, "qty-test-alternating");

    const finalControls = await findQuantityControls(page);
    const finalQty = finalControls.currentQty;
    log(`  Final quantity: ${finalQty}`);

    // Expected: midQty + 1 (net effect of +, -, +, -, + = +1)
    const expectedQty = midQty + 1;
    const passed = Math.abs(finalQty - expectedQty) <= 1; // Allow ±1 tolerance

    return {
      testName,
      passed,
      details: passed
        ? `Quantity correctly updated to ${finalQty} (expected ~${expectedQty})`
        : `Unexpected quantity: ${finalQty}, expected ~${expectedQty}`,
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      details: `Error: ${error}`,
    };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  const DEBUG = process.argv.includes("--debug");

  console.log("=".repeat(60));
  console.log("QUANTITY EDGE CASES TEST SUITE");
  console.log("=".repeat(60));
  console.log();

  // Load config
  const config = loadConfig();
  if (config.items.length === 0) {
    console.error("ERROR: No items in config. Add at least one item first.");
    process.exit(1);
  }

  const testItem = config.items[0];
  console.log(`Test item: ${testItem.name}`);
  console.log(`URL: ${testItem.url}`);
  console.log();

  // Launch browser
  console.log("Launching browser...");
  const context = await launchBrowser({ headless: !DEBUG });
  const page = context.pages()[0] || (await context.newPage());

  // Check login
  console.log("Checking login status...");
  await page.goto("https://shef.com", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const loginStatus = await checkLoginStatus(page);
  if (!loginStatus.loggedIn) {
    console.error("ERROR: Not logged in. Run 'npm run shef:login' first.");
    await closeBrowser(context);
    process.exit(1);
  }
  console.log(`Logged in (${loginStatus.indicator})`);
  console.log();

  // Run tests
  const results: QuantityTestResult[] = [];

  results.push(await testDecreaseToOne(page, testItem));
  results.push(await testIncreaseToTenPlus(page, testItem));
  results.push(await testRapidClicks(page, testItem));
  results.push(await testAlternatingClicks(page, testItem));

  // Print results
  console.log();
  console.log("=".repeat(60));
  console.log("TEST RESULTS");
  console.log("=".repeat(60));

  let passCount = 0;
  let failCount = 0;

  for (const result of results) {
    const status = result.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`\n${status}: ${result.testName}`);
    console.log(`  ${result.details}`);

    if (result.passed) {
      passCount++;
    } else {
      failCount++;
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log(`SUMMARY: ${passCount} passed, ${failCount} failed`);
  console.log("=".repeat(60));

  // Cleanup
  if (!DEBUG) {
    await closeBrowser(context);
  } else {
    console.log("\n[DEBUG] Browser left open. Press Ctrl+C to exit.");
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test suite failed:", err.message);
  process.exit(1);
});
