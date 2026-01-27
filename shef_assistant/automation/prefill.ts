import { chromium, Page } from "playwright";
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

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      "config.json not found. Copy data/config.example.json to data/config.json and customize it."
    );
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

async function addItemToCart(
  page: Page,
  item: ConfigItem
): Promise<void> {
  log(`Processing: ${item.name} (quantity: ${item.quantity})`);

  for (let i = 0; i < item.quantity; i++) {
    log(`  [${i + 1}/${item.quantity}] Navigating to ${item.url}`);
    await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for page to stabilize
    await page.waitForTimeout(1500);

    // Look for Add to Cart button with multiple selectors for robustness
    const addToCartSelectors = [
      'button:has-text("Add to Cart")',
      'button:has-text("Add to cart")',
      '[data-testid="add-to-cart"]',
      'button[aria-label*="cart" i]',
      ".add-to-cart-button",
      'button:has-text("Add")',
    ];

    let clicked = false;
    for (const selector of addToCartSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 3000 })) {
          log(`  Found button with selector: ${selector}`);
          await button.click();
          clicked = true;
          break;
        }
      } catch {
        // Try next selector
      }
    }

    if (!clicked) {
      log(`  WARNING: Could not find Add to Cart button for ${item.name}`);
      log(`  Attempting to find any button containing 'Add'...`);

      // Last resort: find any visible button with "Add" text
      const allButtons = page.locator("button");
      const count = await allButtons.count();
      for (let j = 0; j < count; j++) {
        const btn = allButtons.nth(j);
        const text = await btn.textContent();
        if (text && text.toLowerCase().includes("add") && (await btn.isVisible())) {
          log(`  Found fallback button: "${text}"`);
          await btn.click();
          clicked = true;
          break;
        }
      }
    }

    if (!clicked) {
      throw new Error(`Failed to add ${item.name} to cart - no Add button found`);
    }

    // Wait for cart update
    log(`  Waiting for cart to update...`);
    await page.waitForTimeout(2000);

    // Check for any modal/confirmation and close it
    try {
      const closeButton = page.locator('button:has-text("Continue Shopping"), [aria-label="Close"]').first();
      if (await closeButton.isVisible({ timeout: 1000 })) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // No modal to close
    }
  }

  log(`  Added ${item.quantity}x ${item.name} to cart`);
}

export async function runPrefill(): Promise<string[]> {
  const logs: string[] = [];
  const originalLog = log;
  const captureLog = (msg: string) => {
    originalLog(msg);
    logs.push(msg);
  };

  const config = loadConfig();

  captureLog("=".repeat(60));
  captureLog("SHEF CART PREFILL");
  captureLog("=".repeat(60));

  if (!fs.existsSync(PROFILE_DIR)) {
    throw new Error(
      "Browser profile not found. Run 'npm run shef:login' first to create a session."
    );
  }

  captureLog(`Using profile: ${PROFILE_DIR}`);
  captureLog(`Items to add: ${config.items.length}`);

  // Launch browser with persistent context
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    // Process each item
    for (const item of config.items) {
      await addItemToCart(page, item);
    }

    // Navigate to cart
    captureLog("=".repeat(60));
    captureLog("Navigating to cart...");
    await page.goto(config.cartUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    captureLog("=".repeat(60));
    captureLog("SUCCESS: Cart prefilled!");
    captureLog("IMPORTANT: Review your cart and complete checkout manually.");
    captureLog("This script will NOT click any purchase/checkout buttons.");
    captureLog("=".repeat(60));

    // Keep browser open for manual review
    captureLog("Browser left open for manual review. Close it when done.");
  } catch (error) {
    captureLog(`ERROR: ${error}`);
    await context.close();
    throw error;
  }

  return logs;
}

// Run if executed directly
if (require.main === module) {
  runPrefill().catch((err) => {
    console.error("Prefill failed:", err);
    process.exit(1);
  });
}
