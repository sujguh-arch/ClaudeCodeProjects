/**
 * Screenshot Testing Script
 *
 * Captures screenshots of different UI states for visual verification.
 *
 * Usage: npx tsx automation/test-screenshots.ts
 */

import { chromium, Browser, Page } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = join(process.cwd(), "automation", "screenshots");

async function setupBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X size for mobile-first
  });
  const page = await context.newPage();
  return { browser, page };
}

async function ensureScreenshotsDir(): Promise<void> {
  try {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

async function screenshot(page: Page, name: string): Promise<void> {
  const path = join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  Saved: ${name}.png`);
}

async function waitForAppLoad(page: Page): Promise<void> {
  await page.waitForSelector("h1:has-text('Shef Assistant')", { timeout: 10000 });
  // Wait for any loading spinners to disappear
  await page.waitForTimeout(500);
}

async function captureHomepageEmpty(page: Page): Promise<void> {
  console.log("\n1. Homepage (empty)...");

  // Clear items via API
  await page.goto(`${BASE_URL}/api/items`, { waitUntil: "domcontentloaded" });
  const response = await page.evaluate(async () => {
    const res = await fetch("/api/items");
    return res.json();
  });

  // Delete all items if any exist
  if (response.data?.length > 0) {
    for (const item of response.data) {
      await page.evaluate(async (id: string) => {
        await fetch(`/api/items/${id}`, { method: "DELETE" });
      }, item.id);
    }
  }

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForAppLoad(page);
  await screenshot(page, "homepage-empty");
}

async function captureHomepageWithItems(page: Page): Promise<void> {
  console.log("\n2. Homepage (with items)...");

  // Add some test items
  await page.evaluate(async () => {
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Chicken Tikka Masala",
        url: "https://shef.com/order/chicken-tikka-masala",
        quantity: 2,
      }),
    });
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Butter Naan",
        url: "https://shef.com/order/butter-naan",
        quantity: 4,
      }),
    });
  });

  await page.reload({ waitUntil: "networkidle" });
  await waitForAppLoad(page);
  await page.waitForTimeout(500);
  await screenshot(page, "homepage-with-items");
}

async function captureTomorrowWarning(page: Page): Promise<void> {
  console.log("\n3. Tomorrow warning banner...");

  // The warning should already be visible from previous screenshot
  // Just ensure it's visible
  const warning = page.locator('text=/Orders are for TOMORROW/');
  const isVisible = await warning.isVisible();

  if (isVisible) {
    // Scroll to ensure it's in view
    await warning.scrollIntoViewIfNeeded();
    await screenshot(page, "tomorrow-warning");
  } else {
    console.log("  Warning: Tomorrow banner not visible!");
  }
}

async function captureSearchResults(page: Page): Promise<void> {
  console.log("\n4. Search results...");

  // Type in the search box
  const searchInput = page.locator('input[placeholder*="Search dishes"]');
  await searchInput.fill("chicken");

  // Note: Actual search requires browser automation which takes time
  // For screenshot purposes, we'll just capture the search state
  await screenshot(page, "search-input");

  // Click search and wait briefly
  const searchBtn = page.locator('button:has-text("Search")');
  await searchBtn.click();

  // Wait for search to complete (or timeout)
  await page.waitForTimeout(3000);

  // Check if we got results or an error/message
  await screenshot(page, "search-results");
}

async function captureSearchNoResults(page: Page): Promise<void> {
  console.log("\n5. Search (no results)...");

  // Search for something unlikely to have results
  const searchInput = page.locator('input[placeholder*="Search dishes"]');
  await searchInput.fill("xyzzynonexistent12345");

  const searchBtn = page.locator('button:has-text("Search")');
  await searchBtn.click();

  await page.waitForTimeout(3000);
  await screenshot(page, "search-no-results");
}

async function capturePrefillModal(page: Page): Promise<void> {
  console.log("\n6. Prefill cart modal...");

  // Navigate back to homepage with items
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await waitForAppLoad(page);

  // Click prefill button
  const prefillBtn = page.locator('button:has-text("Prefill Cart")');
  const isEnabled = await prefillBtn.isEnabled();

  if (isEnabled) {
    await prefillBtn.click();
    await page.waitForTimeout(500);
    await screenshot(page, "prefill-modal");

    // Close modal
    const closeBtn = page.locator('button:has-text("Cancel")');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  } else {
    console.log("  Warning: Prefill button is disabled (no items?)");
  }
}

async function cleanup(page: Page): Promise<void> {
  console.log("\n7. Cleanup...");

  // Delete all test items
  const response = await page.evaluate(async () => {
    const res = await fetch("/api/items");
    return res.json();
  });

  if (response.data?.length > 0) {
    for (const item of response.data) {
      await page.evaluate(async (id: string) => {
        await fetch(`/api/items/${id}`, { method: "DELETE" });
      }, item.id);
    }
    console.log(`  Deleted ${response.data.length} test items`);
  }
}

async function main(): Promise<void> {
  console.log("=".repeat(50));
  console.log("Shef Assistant - Screenshot Tests");
  console.log("=".repeat(50));

  await ensureScreenshotsDir();

  const { browser, page } = await setupBrowser();

  try {
    // Check if dev server is running
    try {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 5000 });
    } catch {
      console.error("\nError: Dev server not running!");
      console.error("Please run 'npm run dev' first.\n");
      process.exit(1);
    }

    await captureHomepageEmpty(page);
    await captureHomepageWithItems(page);
    await captureTomorrowWarning(page);
    await captureSearchResults(page);
    await captureSearchNoResults(page);
    await capturePrefillModal(page);
    await cleanup(page);

    console.log("\n" + "=".repeat(50));
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log("=".repeat(50));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Screenshot tests failed:", err.message);
  process.exit(1);
});
