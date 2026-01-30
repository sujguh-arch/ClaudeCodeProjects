import { chromium, Page, BrowserContext, Locator } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { checkAllItems, filterAvailableItems } from "./lib/availability";
import { handleRequiredOptions } from "./lib/cart";
import type { ShefItem, ShefConfig, DayOfWeek } from "../src/lib/types";

// Re-export ConfigItem for backward compatibility with lib/config.ts
export interface ConfigItem {
  name: string;
  url: string;
  quantity: number;
  availableDays?: DayOfWeek[];
  preferredPortion?: string;
}

type Config = ShefConfig;

/**
 * Get current day of week
 */
function getCurrentDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay();
  const dayMap: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return dayMap[dayIndex];
}

/**
 * Filter items to only those available today
 */
function filterItemsForToday(items: ShefItem[]): ShefItem[] {
  const today = getCurrentDayOfWeek();
  return items.filter((item) => {
    // No availableDays = available every day
    if (!item.availableDays || item.availableDays.length === 0) {
      return true;
    }
    return item.availableDays.includes(today);
  });
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
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (error) {
    throw new Error(`Failed to parse config.json: ${error instanceof Error ? error.message : String(error)}`);
  }
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
 * Clear cart sidebar on the current page (without navigating away).
 * The cart sidebar appears on the right side when viewing menu items.
 * Clicks minus buttons in the cart section until all items are removed.
 */
async function clearCartSidebar(page: Page): Promise<number> {
  log("Clearing cart sidebar...");
  
  let itemsCleared = 0;
  const maxAttempts = 50; // Safety limit
  
  for (let i = 0; i < maxAttempts; i++) {
    // The cart sidebar uses the same sc-futREh class for quantity buttons
    // But we need to find minus buttons in the CART section, not the dish modal
    // Cart section is usually on the right side of the page
    
    // Strategy: Find all minus buttons that are NOT in the dish modal
    // The dish modal typically has "Add to cart" or "Update" buttons
    // Cart sidebar items have a different structure
    
    // Look for minus buttons in the cart/order summary section
    // These are typically outside the main modal
    const cartMinusButtons = page.locator('button.sc-futREh').filter({
      hasNot: page.locator('button:has-text("Add"), button:has-text("Update")').locator('..')
    });
    
    // Simpler approach: Find cart item rows and click their minus buttons
    // Cart items often have the dish name + price + quantity controls
    // Try finding minus buttons that are siblings of price displays
    
    // First, check if there are any items in cart by looking for cart total
    const cartTotal = page.locator('text=/\\$[\\d.]+\\s*\\/\\s*\\d+\\s*Items?/i');
    const hasCartItems = await cartTotal.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!hasCartItems && i > 0) {
      log(`  Cart appears empty after clearing ${itemsCleared} items`);
      break;
    }
    
    // Find the first visible minus button in the cart area
    // Cart items are typically in a container with cart-related classes
    // or positioned on the right side of the screen
    
    // Get all minus buttons and try to find one in the cart (not the modal)
    const allMinusButtons = page.locator('button.sc-futREh');
    const count = await allMinusButtons.count();
    
    if (count === 0) {
      log("  No minus buttons found");
      break;
    }
    
    let clickedCart = false;
    
    // Iterate through buttons and find one that's in the cart section
    // Cart section is typically: x > 800px (right side of screen)
    for (let j = 0; j < count; j++) {
      const btn = allMinusButtons.nth(j);
      try {
        if (!await btn.isVisible({ timeout: 300 })) continue;
        
        const box = await btn.boundingBox();
        if (!box) continue;
        
        // Cart is on the right side (x > 750px typically on 1280px viewport)
        // The dish modal is usually centered
        if (box.x > 750) {
          await jsClick(page, btn);
          await page.waitForTimeout(500);
          itemsCleared++;
          log(`  Removed cart item (${itemsCleared})`);
          clickedCart = true;
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (!clickedCart) {
      // No cart items found on the right side
      log("  No cart items found in sidebar");
      break;
    }
  }
  
  log(`  Cleared ${itemsCleared} items from cart sidebar`);
  return itemsCleared;
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
  if (!handle) {
    log("  WARNING: jsClick - element handle is null, element may not exist or be visible");
    return;
  }
  await page.evaluate((el) => {
    (el as HTMLElement).click();
  }, handle);
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
    await page.waitForTimeout(400);
  }
}

/**
 * Decrease quantity by clicking minus button.
 */
async function decreaseQuantity(page: Page, minusBtn: Locator, times: number): Promise<void> {
  for (let i = 0; i < times; i++) {
    try {
      await jsClick(page, minusBtn);
      log(`    Clicked - via JS (${i + 1}/${times})`);
    } catch {
      log(`    JS click failed, trying force click...`);
      await minusBtn.click({ force: true, timeout: 3000 });
      log(`    Clicked - via force (${i + 1}/${times})`);
    }
    // Wait for UI to acknowledge the click
    await page.waitForTimeout(600);
  }
  // Extra wait for the last change to settle
  await page.waitForTimeout(800);
}

async function addItemToCart(page: Page, item: ConfigItem): Promise<boolean> {
  log(`Adding ${item.quantity}x ${item.name}`);

  // Reset page state - close any open modals
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);

  // Navigate to the item URL
  await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for page content to load (menu items to appear)
  log("  Waiting for page content to load...");
  try {
    await page.waitForSelector('button:has-text("$")', { timeout: 15000 });
    log("  Menu items loaded");
  } catch {
    log("  WARNING: Menu items may not have loaded, trying reload...");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  // Extra time for modal to open from URL
  await page.waitForTimeout(4000);

  // Dismiss any popups
  await dismissOverlays(page);
  await page.waitForTimeout(1000);

  // Wait for any loading overlays to disappear
  await waitForOverlayToDisappear(page);

  // Check if modal opened from URL
  log("  Checking if modal opened...");
  let addToCartVisible = await page.locator('button:has-text("Add to cart")').first().isVisible({ timeout: 2000 }).catch(() => false);
  let addVisible = addToCartVisible || await page.locator('button:has-text("Add")').first().isVisible({ timeout: 1000 }).catch(() => false);
  let selectPortionVisible = await page.locator('button:has-text("Select portion size")').first().isVisible({ timeout: 1000 }).catch(() => false);
  let updateVisible = await page.locator('button:has-text("Update")').first().isVisible({ timeout: 1000 }).catch(() => false);

  if (!addVisible && !selectPortionVisible && !updateVisible) {
    // Modal didn't open from URL - try clicking on the dish card by name
    log("  Modal not open from URL, looking for dish card...");

    const dishCard = page.locator(`button:has-text("${item.name}")`).first();
    const hasDishCard = await dishCard.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasDishCard) {
      log(`  Found dish card "${item.name}", clicking...`);
      await dishCard.click();
      await page.waitForTimeout(3000);

      // Check again for modal
      addToCartVisible = await page.locator('button:has-text("Add to cart")').first().isVisible({ timeout: 2000 }).catch(() => false);
      addVisible = addToCartVisible || await page.locator('button:has-text("Add")').first().isVisible({ timeout: 1000 }).catch(() => false);
      selectPortionVisible = await page.locator('button:has-text("Select portion size")').first().isVisible({ timeout: 1000 }).catch(() => false);
      updateVisible = await page.locator('button:has-text("Update")').first().isVisible({ timeout: 1000 }).catch(() => false);
    } else {
      log(`  Dish card "${item.name}" not found on page`);
    }
  }

  const modalOpen = addVisible || selectPortionVisible || updateVisible;

  if (modalOpen) {
    log(`  Modal opened (Add=${addVisible}, SelectPortion=${selectPortionVisible}, Update=${updateVisible})`);
    
    // Handle "Select portion size" - this will click the button and select a portion
    if (selectPortionVisible) {
      log("  Handling portion size selection...");
      await handleRequiredOptions(page, item.preferredPortion);
      await page.waitForTimeout(1000);
      
      // Re-check for Add button after portion selection
      addVisible = await page.locator('button:has-text("Add to cart"), button:has-text("Add")').first().isVisible({ timeout: 2000 }).catch(() => false);
      updateVisible = await page.locator('button:has-text("Update")').first().isVisible({ timeout: 1000 }).catch(() => false);
      log(`  After portion selection: Add=${addVisible}, Update=${updateVisible}`);
    }
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
  // Find quantity buttons: [minus button] [qty span] [plus button]
  const minusBtn = page.locator('button.sc-futREh').nth(0);  // First button is minus
  const plusBtn = page.locator('button.sc-futREh').nth(1);   // Second button is plus
  let hasPlusBtn = await plusBtn.isVisible({ timeout: 2000 }).catch(() => false);
  const hasMinusBtn = await minusBtn.isVisible({ timeout: 1000 }).catch(() => false);

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

  if (hasAddBtn && hasPlusBtn) {
    // Item NOT in cart yet - read current quantity first (modal may have a default)
    let currentQty = 1;
    try {
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
      log(`  Setting quantity to ${targetQty} before adding...`);
      await increaseQuantity(page, plusBtn, clicksNeeded);
    } else if (clicksNeeded < 0 && hasMinusBtn) {
      log(`  Decreasing quantity to ${targetQty} before adding...`);
      await decreaseQuantity(page, minusBtn, Math.abs(clicksNeeded));
    }

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
    // Item NOT in cart, no quantity controls visible
    log("  Clicking Add button (no qty controls visible)...");
    await addBtn.click();
    await page.waitForTimeout(2000);
    log(`  Added to cart`);
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
    } else if (clicksNeeded < 0 && hasMinusBtn) {
      await decreaseQuantity(page, minusBtn, Math.abs(clicksNeeded));
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

  // Filter items for today's day
  const today = getCurrentDayOfWeek();
  const todayItems = filterItemsForToday(config.items);

  log(`Today is: ${today}`);
  log(`Items in config: ${config.items.length}`);
  log(`Items available today: ${todayItems.length}`);

  if (todayItems.length < config.items.length) {
    const skipped = config.items.filter(i => !todayItems.includes(i));
    log("Skipping items not available today:");
    skipped.forEach(i => {
      log(`  - ${i.name} (available: ${i.availableDays?.join(", ") || "all days"})`);
    });
  }

  if (todayItems.length === 0) {
    log("No items available for today. Nothing to prefill.");
    return;
  }

  log(`Items to check: ${todayItems.length}`);

  const context: BrowserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS_MODE, // Default: visible browser (Shef blocks headless)
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // Step 0: Go to first item's page and clear cart sidebar
    log("=".repeat(50));
    log("CLEARING CART FROM MENU PAGE...");
    log("=".repeat(50));

    const firstItem = todayItems[0];
    log(`Navigating to first item: ${firstItem.name}`);
    await page.goto(firstItem.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    // Wait for page to load
    try {
      await page.waitForSelector('button:has-text("$")', { timeout: 15000 });
      log("Menu items loaded");
    } catch {
      log("WARNING: Menu may not have loaded fully");
    }
    await page.waitForTimeout(4000);
    
    // Close any dish modal that opened
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Dismiss popups
    await dismissOverlays(page);
    await page.waitForTimeout(500);
    
    // Clear the cart sidebar
    const itemsCleared = await clearCartSidebar(page);
    log(`Cleared ${itemsCleared} items from cart sidebar`);
    await page.waitForTimeout(1000);

    // Step 1: Check availability for all items
    log("=".repeat(50));
    log("CHECKING AVAILABILITY...");
    log("=".repeat(50));

    const availabilityResults = await checkAllItems(page, todayItems);
    const availableItems = filterAvailableItems(todayItems, availabilityResults);
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
