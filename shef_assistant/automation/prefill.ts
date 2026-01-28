import { chromium, Page, BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";

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

const DEBUG_MODE = process.argv.includes("--debug") || process.env.DEBUG_SHEF === "1";

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
  const closeSelectors = [
    'button[aria-label="close"]',
    'button[aria-label="Close"]',
    '[data-testid*="close"]',
  ];

  for (const selector of closeSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 300 })) {
        await btn.click({ timeout: 500 });
        await page.waitForTimeout(300);
      }
    } catch {
      // Continue
    }
  }
}

async function addItemToCart(page: Page, item: ConfigItem): Promise<boolean> {
  log(`Adding ${item.quantity}x ${item.name}`);

  // Navigate to the item URL - this opens the dish detail modal
  await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);

  // Dismiss any popups
  await dismissOverlays(page);

  // The dish modal opens as an overlay. We need to find and interact with it.
  // First, scroll the page to top to ensure modal is visible
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Take a debug screenshot to see current state
  if (DEBUG_MODE) {
    await takeScreenshot(page, `debug-before-${item.name.replace(/[^a-z0-9]/gi, "-")}`);
  }

  // Find the modal - usually has overflow-y:auto or similar
  // Scroll within the modal to show quantity controls
  log("  Looking for quantity controls in modal...");
  await page.evaluate(() => {
    // Find elements that look like modals/drawers and scroll them
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
  await page.waitForTimeout(1000);

  const targetQty = item.quantity;
  let success = false;

  // Strategy 1: Look for Update button (item already in cart, just need to adjust qty)
  log("  Checking for Update button...");
  const updateBtn = page.locator('button:has-text("Update")').first();
  const hasUpdate = await updateBtn.isVisible({ timeout: 2000 }).catch(() => false);

  if (hasUpdate) {
    log("  Found Update button - item is in cart, adjusting quantity...");

    // Find + button and click to increase quantity
    const plusBtn = page.locator('button:has-text("+")').first();
    if (await plusBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Read current quantity if possible
      let currentQty = 1;
      try {
        // Look for a number between - and + or near them
        const qtyLocator = page.locator('button:has-text("-")').locator('..').locator('*');
        const count = await qtyLocator.count();
        for (let i = 0; i < count; i++) {
          const text = await qtyLocator.nth(i).textContent().catch(() => '');
          const num = parseInt(text?.trim() || '', 10);
          if (!isNaN(num) && num > 0 && num < 100) {
            currentQty = num;
            break;
          }
        }
      } catch { }

      const clicksNeeded = targetQty - currentQty;
      log(`  Current qty: ${currentQty}, target: ${targetQty}, clicks needed: ${clicksNeeded}`);

      for (let i = 0; i < clicksNeeded; i++) {
        await plusBtn.click();
        log(`  Clicked + (${i + 1}/${clicksNeeded})`);
        await page.waitForTimeout(300);
      }
    }

    // Click Update
    await updateBtn.click();
    await page.waitForTimeout(1500);
    log(`  Updated to ${targetQty}x ${item.name}`);
    success = true;
  } else {
    // Strategy 2: Look for Add button (item not in cart)
    log("  Checking for Add button...");
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      log("  Clicking Add button...");
      await addBtn.click();
      await page.waitForTimeout(2000);
      log("  Added 1x to cart");

      // If we need more than 1, re-navigate and use Update flow
      if (targetQty > 1) {
        log("  Need more quantity, re-navigating...");
        await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(3000);
        await page.evaluate(() => window.scrollTo(0, 0));

        // Scroll modal
        await page.evaluate(() => {
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const style = window.getComputedStyle(el);
            if ((style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
              el.scrollTop = el.scrollHeight;
            }
          }
        });
        await page.waitForTimeout(1000);

        // Now use + and Update
        const plusBtn = page.locator('button:has-text("+")').first();
        const updateBtn2 = page.locator('button:has-text("Update")').first();

        if (await plusBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          for (let i = 0; i < targetQty - 1; i++) {
            await plusBtn.click();
            log(`  Clicked + (${i + 1}/${targetQty - 1})`);
            await page.waitForTimeout(300);
          }
        }

        if (await updateBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
          await updateBtn2.click();
          await page.waitForTimeout(1500);
        }
      }
      success = true;
    }
  }

  if (success) {
    log(`  Successfully set ${targetQty}x ${item.name}`);
    return true;
  }

  // If nothing worked, log visible buttons and fail
  log("  ERROR: Could not add item. Visible buttons:");
  try {
    const allButtons = page.locator("button");
    const count = await allButtons.count();
    for (let i = 0; i < Math.min(count, 30); i++) {
      const btn = allButtons.nth(i);
      if (await btn.isVisible({ timeout: 200 })) {
        const text = await btn.textContent();
        if (text && text.trim().length > 0 && text.trim().length < 40) {
          log(`    - "${text.trim()}"`);
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
  log(`Debug mode: ${DEBUG_MODE ? "ON" : "OFF"}`);
  log("=".repeat(50));

  if (!fs.existsSync(PROFILE_DIR)) {
    throw new Error("Browser profile not found. Run 'npm run shef:login' first.");
  }

  log(`Items to add: ${config.items.length}`);

  const context: BrowserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !DEBUG_MODE,
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    for (const item of config.items) {
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

    log("=".repeat(50));
    log("SUCCESS: Cart prefilled!");
    log("Review your cart and complete checkout manually.");
    log("=".repeat(50));

    if (DEBUG_MODE) {
      log("[DEBUG] Browser left open. Press Ctrl+C to exit.");
    } else {
      await context.close();
    }
  } catch (error) {
    log(`ERROR: ${error}`);
    await takeScreenshot(page, "prefill-error");

    if (DEBUG_MODE) {
      log("[DEBUG] Browser left open for inspection.");
    } else {
      await context.close();
    }
    throw error;
  }
}

if (require.main === module) {
  if (DEBUG_MODE) {
    log("Debug mode enabled");
  }
  runPrefill().catch((err) => {
    console.error("Prefill failed:", err.message);
    if (!DEBUG_MODE) process.exit(1);
  });
}
