import { chromium, Page, BrowserContext, Locator } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { checkAllItems, filterAvailableItems } from "./lib/availability";

interface ConfigItem {
  name: string;
  url: string;
  quantity: number;
}

interface Config {
  shefHomeUrl: string;
  cartUrl: string;
  items: ConfigItem[];
}

const CONFIG_PATH = path.join(__dirname, "..", "data", "config.json");
const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts");

// Note: Shef.com has anti-bot detection that blocks headless browsers.
// Default to visible browser unless HEADLESS=1 is set.
const DEBUG_MODE = process.argv.includes("--debug") || process.env.DEBUG_SHEF === "1";
const HEADLESS_MODE = process.env.HEADLESS === "1";

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error("config.json not found. Copy data/config.example.json to data/config.json and customize it.");
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function ensureArtifactsDir(): void {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
}

async function takeScreenshot(page: Page, prefix: string): Promise<string> {
  ensureArtifactsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const screenshotPath = path.join(ARTIFACTS_DIR, `${prefix}-${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function dismissOverlays(page: Page): Promise<void> {
  // Be careful not to close the dish detail modal - only dismiss actual popups
  const closeSelectors = [
    'button:has-text("Acknowledge")',
    'button:has-text("Got it")',
    'button:has-text("Dismiss")',
    // Note: Don't include generic "X" or "close" as they may close the dish modal
  ];

  for (const selector of closeSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 500 })) {
        log(`  Dismissing popup: ${selector}`);
        await btn.click({ timeout: 1000 });
        await page.waitForTimeout(500);
      }
    } catch {
      // Continue
    }
  }
}

async function scrollModalToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
      const hasHeight = el.scrollHeight > el.clientHeight;
      if (isScrollable && hasHeight && el.clientHeight > 200) {
        el.scrollTop = el.scrollHeight;
      }
    }
  });
  await page.waitForTimeout(500);
}

/**
 * Wait for a button to become enabled (not disabled).
 * Returns true if the button became enabled, false if timeout.
 */
async function waitForButtonEnabled(btn: Locator, timeoutMs: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 200;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const isDisabled = await btn.isDisabled();
      if (!isDisabled) {
        return true;
      }
    } catch {
      // Button might not exist yet
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  return false;
}

/**
 * Wait for any overlays to disappear before clicking.
 */
async function waitForOverlayToDisappear(page: Page): Promise<void> {
  // Wait for the backdrop overlay to disappear
  const overlay = page.locator('div.sc-czkgLR');
  try {
    await overlay.waitFor({ state: 'hidden', timeout: 3000 });
  } catch {
    // Overlay might not exist or already hidden
  }
}

/**
 * Click a button using JavaScript evaluation (bypasses pointer interception)
 */
async function jsClick(page: Page, locator: Locator): Promise<void> {
  const handle = await locator.elementHandle();
  if (handle) {
    await page.evaluate((el) => {
      (el as HTMLElement).click();
    }, handle);
  }
}

/**
 * Click the + button to increase quantity, with proper waiting.
 * Uses JS click as primary method due to overlay interference.
 */
async function increaseQuantity(page: Page, plusBtn: Locator, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    // Use JS click as primary method (works through overlays)
    try {
      await jsClick(page, plusBtn);
      log(`    Clicked + via JS (${i + 1}/${times})`);
    } catch {
      // Fallback to force click
      log(`    JS click failed, trying force click...`);
      await plusBtn.click({ force: true, timeout: 3000 });
      log(`    Clicked + via force (${i + 1}/${times})`);
    }
    // Wait for UI to acknowledge the click
    await page.waitForTimeout(600);
  }
  // Extra wait for the last change to settle
  await page.waitForTimeout(800);
}

async function addItemToCart(page: Page, item: ConfigItem): Promise<boolean> {
  log(`Adding ${item.quantity}x ${item.name}`);

  // Reset page state - close any open modals by pressing Escape
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);

  // Navigate to the item URL - this may or may not open the dish modal directly
  await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for page content to load (menu items to appear)
  log("  Waiting for page content to load...");
  try {
    // Wait for any dish button to appear (indicates menu loaded)
    await page.waitForSelector('button:has-text("$")', { timeout: 15000 });
    log("  Menu items loaded");
  } catch {
    log("  WARNING: Menu items may not have loaded, trying reload...");
    // Try reloading the page
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  // Extra time for any animations/transitions (longer wait for modal to open from URL)
  await page.waitForTimeout(4000);

  // Dismiss any popups (do this early as they can block modal)
  await dismissOverlays(page);
  await page.waitForTimeout(1000);

  // Wait for any loading overlays to disappear
  await waitForOverlayToDisappear(page);

  // Check if modal opened from URL
  log("  Checking if modal opened...");
  let addVisible = await page.locator('button:has-text("Add")').first().isVisible({ timeout: 1000 }).catch(() => false);
  let updateVisible = await page.locator('button:has-text("Update")').first().isVisible({ timeout: 1000 }).catch(() => false);

  if (!addVisible && !updateVisible) {
    // Modal didn't open from URL - try clicking on the dish card by name
    log("  Modal not open from URL, looking for dish card...");

    const dishCard = page.locator(`button:has-text("${item.name}")`).first();
    const hasDishCard = await dishCard.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasDishCard) {
      log(`  Found dish card "${item.name}", clicking...`);
      await dishCard.click();
      await page.waitForTimeout(3000);

      // Check again for modal
      addVisible = await page.locator('button:has-text("Add")').first().isVisible({ timeout: 2000 }).catch(() => false);
      updateVisible = await page.locator('button:has-text("Update")').first().isVisible({ timeout: 1000 }).catch(() => false);
    } else {
      log(`  Dish card "${item.name}" not found on page`);
    }
  }

  const modalOpen = addVisible || updateVisible;

  if (modalOpen) {
    log(`  Modal opened (Add=${addVisible}, Update=${updateVisible})`);
  } else {
    log("  WARNING: Modal did not open, taking screenshot...");
    await takeScreenshot(page, `modal-not-open-${item.name.replace(/[^a-z0-9]/gi, "-")}`);
  }

  // Scroll to top and then scroll modal to show quantity controls
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  if (DEBUG_MODE) {
    await takeScreenshot(page, `debug-before-${item.name.replace(/[^a-z0-9]/gi, "-")}`);
  }

  // Scroll modal to show bottom controls
  log("  Scrolling to quantity controls...");
  await scrollModalToBottom(page);

  const targetQty = item.quantity;

  // Find the quantity controls - they are SVG buttons near Update/Add button
  // The structure is: [minus button] [quantity span] [plus button] [Update/Add button]
  // The buttons use class "sc-futREh" and contain SVGs
  // Plus button has an SVG path with a cross pattern (contains "11.5385H19")

  // Strategy: Find the plus button by looking for the second SVG button in the quantity container
  // The plus button's SVG path contains specific coordinates for the cross shape
  const plusBtn = page.locator('button.sc-futREh').nth(1);  // Second button is the plus
  let hasPlusBtn = await plusBtn.isVisible({ timeout: 2000 }).catch(() => false);

  // Fallback: Try finding by SVG content
  if (!hasPlusBtn) {
    const plusBtnAlt = page.locator('button:has(svg path[d*="11.5385H19"])').first();
    hasPlusBtn = await plusBtnAlt.isVisible({ timeout: 1000 }).catch(() => false);
    if (hasPlusBtn) {
      log("  Using SVG path selector for plus button");
    }
  }

  // Check if Add or Update button is visible
  const addBtn = page.locator('button:has-text("Add")').first();
  const updateBtn = page.locator('button:has-text("Update")').first();

  const hasAddBtn = await addBtn.isVisible({ timeout: 1000 }).catch(() => false);
  const hasUpdateBtn = await updateBtn.isVisible({ timeout: 1000 }).catch(() => false);

  log(`  Found: Add=${hasAddBtn}, Update=${hasUpdateBtn}, Plus=${hasPlusBtn}`);

  // STRATEGY: Set quantity FIRST, then click Add/Update
  // This avoids the re-navigation issue entirely

  if (hasAddBtn && hasPlusBtn && targetQty > 1) {
    // Item NOT in cart yet, need to set quantity before adding
    log(`  Setting quantity to ${targetQty} before adding...`);
    await increaseQuantity(page, plusBtn, targetQty - 1);

    // Wait for Add button to be enabled
    log("  Waiting for Add button to be ready...");
    const addEnabled = await waitForButtonEnabled(addBtn, 5000);
    if (!addEnabled) {
      log("  WARNING: Add button still disabled, trying anyway...");
    }

    log("  Clicking Add button...");
    await addBtn.click();
    await page.waitForTimeout(2000);
    log(`  Added ${targetQty}x to cart`);
    return true;

  } else if (hasAddBtn) {
    // Item NOT in cart, quantity = 1
    log("  Clicking Add button (qty=1)...");
    await addBtn.click();
    await page.waitForTimeout(2000);
    log(`  Added 1x to cart`);
    return true;

  } else if (hasUpdateBtn && hasPlusBtn) {
    // Item already in cart, need to adjust quantity
    log("  Item already in cart, adjusting quantity...");

    // Try to read current quantity from the span between minus and plus buttons
    let currentQty = 1;
    try {
      // The quantity is in a span with class "mt-[3px]" between the - and + buttons
      const qtySpan = page.locator('span.mt-\\[3px\\]').first();
      const qtyText = await qtySpan.textContent();
      const num = parseInt(qtyText?.trim() || '', 10);
      if (!isNaN(num) && num > 0 && num < 100) {
        currentQty = num;
      }
    } catch {
      // Default to 1
    }

    const clicksNeeded = targetQty - currentQty;
    log(`  Current qty: ${currentQty}, target: ${targetQty}, clicks needed: ${clicksNeeded}`);

    if (clicksNeeded > 0) {
      await increaseQuantity(page, plusBtn, clicksNeeded);
    }

    // Scroll modal to ensure Update button is visible
    log("  Scrolling to Update button...");
    await scrollModalToBottom(page);
    await page.waitForTimeout(500);

    // Re-find the Update button after scrolling
    const updateBtnFresh = page.locator('button:has-text("Update")').first();

    // Try to scroll the button into view
    try {
      await updateBtnFresh.scrollIntoViewIfNeeded({ timeout: 3000 });
    } catch {
      log("  Could not scroll Update button into view");
    }

    // Wait for Update button to become enabled
    log("  Waiting for Update button to be enabled...");
    const updateEnabled = await waitForButtonEnabled(updateBtnFresh, 5000);

    if (!updateEnabled) {
      log("  WARNING: Update button still disabled after waiting!");
      // Take screenshot for debugging
      await takeScreenshot(page, `update-disabled-${item.name.replace(/[^a-z0-9]/gi, "-")}`);

      // Try JS click as the button might be behind overlay
      log("  Attempting JS click on Update button...");
      try {
        await jsClick(page, updateBtnFresh);
      } catch (e) {
        log(`  JS click failed: ${e}`);
        // Try force click as last resort
        log("  Attempting force click...");
        try {
          await updateBtnFresh.click({ force: true, timeout: 3000 });
        } catch (e2) {
          log(`  Force click failed: ${e2}`);
          return false;
        }
      }
    } else {
      // Try regular click, then JS click
      try {
        await updateBtnFresh.click({ timeout: 3000 });
      } catch {
        log("  Regular click failed, trying JS click...");
        await jsClick(page, updateBtnFresh);
      }
    }

    await page.waitForTimeout(1500);
    log(`  Updated to ${targetQty}x ${item.name}`);
    return true;

  } else if (hasUpdateBtn) {
    // Update button visible but no + button - just click Update
    log("  Clicking Update button...");
    const updateEnabled = await waitForButtonEnabled(updateBtn, 3000);
    if (updateEnabled) {
      await updateBtn.click();
      await page.waitForTimeout(1500);
      log(`  Updated ${item.name}`);
      return true;
    }
  }

  // If we get here, something went wrong
  log("  ERROR: Could not find Add or Update button");

  // Log visible buttons for debugging
  try {
    const allButtons = page.locator("button");
    const count = await allButtons.count();
    log("  Visible buttons:");
    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = allButtons.nth(i);
      if (await btn.isVisible({ timeout: 200 })) {
        const text = await btn.textContent();
        if (text && text.trim().length > 0 && text.trim().length < 40) {
          const disabled = await btn.isDisabled();
          log(`    - "${text.trim()}" (disabled: ${disabled})`);
        }
      }
    }
  } catch {
    // Ignore
  }

  await takeScreenshot(page, `failed-${item.name.replace(/[^a-z0-9]/gi, "-")}`);
  return false;
}

export async function runPrefill(): Promise<void> {
  const config = loadConfig();

  log("=".repeat(50));
  log("SHEF CART PREFILL");
  log(`Mode: ${HEADLESS_MODE ? "headless" : "visible"} browser`);
  log("=".repeat(50));

  if (!fs.existsSync(PROFILE_DIR)) {
    throw new Error("Browser profile not found. Run 'npm run shef:login' first.");
  }

  log(`Items to check: ${config.items.length}`);

  const context: BrowserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS_MODE, // Default: visible browser (Shef blocks headless)
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // Step 1: Check availability for all items
    log("=".repeat(50));
    log("CHECKING AVAILABILITY...");
    log("=".repeat(50));

    const availabilityResults = await checkAllItems(page, config.items);
    const availableItems = filterAvailableItems(config.items, availabilityResults);
    const unavailableResults = availabilityResults.filter(r => !r.available);

    log("=".repeat(50));
    log(`AVAILABILITY RESULTS: ${availableItems.length} available, ${unavailableResults.length} unavailable`);

    if (unavailableResults.length > 0) {
      log("Skipped items:");
      unavailableResults.forEach(r => {
        log(`  - ${r.name}: ${r.reason}`);
      });
    }

    if (availableItems.length === 0) {
      log("ERROR: No items available to add. Exiting.");
      throw new Error("All items are unavailable");
    }

    log("=".repeat(50));
    log(`ADDING ${availableItems.length} ITEMS TO CART...`);
    log("=".repeat(50));

    // Step 2: Add only available items to cart
    for (const item of availableItems) {
      const success = await addItemToCart(page, item);
      if (!success) {
        throw new Error(`Failed to add ${item.name} to cart`);
      }
      await page.waitForTimeout(1000);
    }

    // Navigate to cart
    log("=".repeat(50));
    log("Navigating to cart...");
    await page.goto(config.cartUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Take final screenshot of cart
    await takeScreenshot(page, "cart-final");

    log("=".repeat(50));
    log("SUCCESS: Cart prefilled!");
    log("Review your cart and complete checkout manually.");
    log("=".repeat(50));

    if (!HEADLESS_MODE) {
      log("Browser left open for manual checkout. Press Ctrl+C to exit.");
    } else {
      await context.close();
    }
  } catch (error) {
    log(`ERROR: ${error}`);
    await takeScreenshot(page, "prefill-error");

    if (!HEADLESS_MODE) {
      log("Browser left open for inspection. Press Ctrl+C to exit.");
    } else {
      await context.close();
    }
    throw error;
  }
}

if (require.main === module) {
  runPrefill().catch((err) => {
    console.error("Prefill failed:", err.message);
    if (HEADLESS_MODE) process.exit(1);
  });
}
