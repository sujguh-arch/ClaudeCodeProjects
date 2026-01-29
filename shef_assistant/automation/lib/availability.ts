/**
 * Availability Checker - Check dish availability before ordering
 *
 * Navigates to dish URLs and checks if "Add to cart" button exists.
 * Returns availability status with reason for unavailable items.
 */

import { Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { log, PATHS } from "./config";

const DEBUG = process.env.DEBUG_AVAIL === "1"; // Set DEBUG_AVAIL=1 to enable screenshots

// ============================================================================
// Types
// ============================================================================

export interface ConfigItem {
  name: string;
  url: string;
  quantity: number;
}

export interface AvailabilityResult {
  name: string;
  url: string;
  available: boolean;
  reason?: string; // "Sold out", "Button disabled", "Error: 404", etc.
}

// Debug screenshot helper
async function debugScreenshot(page: Page, prefix: string): Promise<void> {
  if (!DEBUG) return;

  if (!fs.existsSync(PATHS.artifacts)) {
    fs.mkdirSync(PATHS.artifacts, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(PATHS.artifacts, `avail-${prefix}-${timestamp}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  log(`  DEBUG screenshot: ${filePath}`);
}

// ============================================================================
// Check Single Dish
// ============================================================================

/**
 * Check if a dish is available by looking for the "Add to cart" button.
 *
 * @param page - Playwright page
 * @param url - Dish URL to check
 * @param name - Dish name for logging
 * @returns Availability result with reason if unavailable
 */
export async function checkDishAvailability(
  page: Page,
  url: string,
  name: string
): Promise<AvailabilityResult> {
  log(`Checking availability: ${name}`);

  try {
    // Navigate to dish page (same flow as prefill.ts)
    await page.goto(url, { waitUntil: "load", timeout: 30000 });

    // Wait for menu items to load
    try {
      await page.waitForSelector('button:has-text("$")', { timeout: 10000 });
      log("  Menu loaded");
    } catch {
      // Continue anyway
    }

    // Wait for page to stabilize (modal may take time to open from URL)
    await page.waitForTimeout(5000);

    await debugScreenshot(page, `after-load-${name.replace(/[^a-z0-9]/gi, "-")}`);

    // Check page URL to see if we're on the right page
    log(`  Current URL: ${page.url()}`);

    // Log all visible buttons for debugging
    if (DEBUG) {
      const allButtons = await page.locator('button').all();
      log(`  DEBUG: Found ${allButtons.length} buttons on page`);
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const text = await allButtons[i].textContent().catch(() => '');
        if (text && text.trim().length < 50) {
          log(`    Button ${i}: "${text.trim().substring(0, 40)}"`);
        }
      }
    }

    // Check if modal opened from URL
    let addVisible = await page.locator('button:has-text("Add")').first().isVisible({ timeout: 1000 }).catch(() => false);
    let updateVisible = await page.locator('button:has-text("Update")').first().isVisible({ timeout: 1000 }).catch(() => false);
    log(`  Initial check: Add=${addVisible}, Update=${updateVisible}`);

    if (!addVisible && !updateVisible) {
      // Modal didn't open from URL - try clicking dish card
      log(`  Looking for dish card "${name}"...`);

      // Try multiple selector strategies
      const selectors = [
        `button:has-text("${name}")`,
        `[data-testid*="${name.toLowerCase().replace(/\s+/g, '-')}"]`,
        `text=${name}`,
      ];

      let clicked = false;
      for (const selector of selectors) {
        try {
          const card = page.locator(selector).first();
          if (await card.isVisible({ timeout: 1000 }).catch(() => false)) {
            log(`  Found with selector: ${selector}`);
            await card.click();
            await page.waitForTimeout(2000);
            clicked = true;
            break;
          }
        } catch {
          // Try next selector
        }
      }

      if (!clicked) {
        log(`  Dish card not found with any selector`);
        await debugScreenshot(page, `no-card-${name.replace(/[^a-z0-9]/gi, "-")}`);
      }

      // Check again for modal
      addVisible = await page.locator('button:has-text("Add")').first().isVisible({ timeout: 2000 }).catch(() => false);
      updateVisible = await page.locator('button:has-text("Update")').first().isVisible({ timeout: 1000 }).catch(() => false);
      log(`  After click: Add=${addVisible}, Update=${updateVisible}`);
    }

    const modalOpen = addVisible || updateVisible;

    if (!modalOpen) {
      log(`  ✗ ${name} is unavailable (Modal did not open - dish may be sold out)`);
      return {
        name,
        url,
        available: false,
        reason: "Modal did not open - likely sold out",
      };
    }

    log(`  Modal opened (Add=${addVisible}, Update=${updateVisible})`);

    // If Update button is visible, item is already in cart - still available
    if (updateVisible) {
      log(`  ✓ ${name} is available (already in cart, will update quantity)`);
      return {
        name,
        url,
        available: true,
      };
    }

    // Check if Add button is enabled
    const addButton = page.locator('button:has-text("Add")').first();
    const isDisabled = await addButton.isDisabled().catch(() => false);

    if (isDisabled) {
      log(`  ✗ ${name} is unavailable (Add button disabled)`);
      return {
        name,
        url,
        available: false,
        reason: "Add button disabled",
      };
    }

    // Available!
    log(`  ✓ ${name} is available`);
    return {
      name,
      url,
      available: true,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`  ✗ ${name} check failed: ${errorMsg}`);

    return {
      name,
      url,
      available: false,
      reason: `Error: ${errorMsg}`,
    };
  }
}

// ============================================================================
// Check All Items
// ============================================================================

/**
 * Check availability for all items in the list.
 *
 * Note: Runs sequentially to avoid overwhelming the site.
 * Could be parallelized later if needed.
 *
 * @param page - Playwright page to use for checking
 * @param items - List of items to check
 * @returns Array of availability results
 */
export async function checkAllItems(
  page: Page,
  items: ConfigItem[]
): Promise<AvailabilityResult[]> {
  log(`Starting availability check for ${items.length} items...`);

  const results: AvailabilityResult[] = [];

  for (const item of items) {
    const result = await checkDishAvailability(page, item.url, item.name);
    results.push(result);

    // Small delay between checks to be polite
    await page.waitForTimeout(500);
  }

  const availableCount = results.filter(r => r.available).length;
  const unavailableCount = results.filter(r => !r.available).length;

  log(`Availability check complete: ${availableCount} available, ${unavailableCount} unavailable`);

  return results;
}

// ============================================================================
// Helper: Filter Available Items
// ============================================================================

/**
 * Filter items based on availability results.
 *
 * @param items - Original items
 * @param results - Availability check results
 * @returns Items that are available
 */
export function filterAvailableItems(
  items: ConfigItem[],
  results: AvailabilityResult[]
): ConfigItem[] {
  const availableUrls = new Set(
    results.filter(r => r.available).map(r => r.url)
  );

  return items.filter(item => availableUrls.has(item.url));
}
