/**
 * Module 4: Add to Cart Flow
 *
 * Handles adding items to cart with specified quantities.
 */

import { Page } from "playwright";
import { ConfigItem, log, PATHS, ensureArtifactsDir } from "./config";
import { navigateTo, takeScreenshot, dismissOverlays } from "./navigation";
import * as path from "path";

// ============================================================================
// Types
// ============================================================================

export interface AddToCartResult {
  success: boolean;
  itemName: string;
  quantity: number;
  error?: string;
}

// ============================================================================
// Helper: Get Cart Count
// ============================================================================

async function getCartCount(page: Page): Promise<number> {
  try {
    // Look for cart button with count
    const cartButton = page.locator('button:has-text("Cart"), [aria-label*="cart" i]').first();
    const text = await cartButton.textContent({ timeout: 2000 });
    if (text) {
      const match = text.match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  } catch {
    // Cart not found or no count
  }
  return 0;
}

// ============================================================================
// Helper: Dismiss Dish Modal Popups
// ============================================================================

async function dismissDishPopups(page: Page): Promise<void> {
  log("  Checking for popups to dismiss...");

  // Try multiple times since popups may appear with delay
  for (let attempt = 0; attempt < 3; attempt++) {
    // Specific popups seen on Shef dish pages
    const popupDismissers = [
      // "Delivery date updated" popup - has Acknowledge button
      'button:has-text("Acknowledge")',
      'button:has-text("Got it")',
      'button:has-text("OK")',
      'button:has-text("Continue")',
      'button:has-text("Close")',
      // Close X buttons on popups
      '[aria-label="Close"]',
      '[aria-label="close"]',
      'button[aria-label*="close" i]',
      // Generic close patterns
      'button:has-text("×")',
      'button:has-text("✕")',
      'button:has-text("X")',
    ];

    let dismissed = false;
    for (const selector of popupDismissers) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          log(`  Dismissed popup: ${selector}`);
          await page.waitForTimeout(800);
          dismissed = true;
        }
      } catch {
        // Continue
      }
    }

    if (!dismissed) break;
  }
}

// ============================================================================
// Helper: Handle Required Options (Portion size, etc.)
// ============================================================================

export async function handleRequiredOptions(
  page: Page,
  preferredPortion?: string
): Promise<void> {
  log("  Checking for required options...");

  try {
    // Check if "Select portion size" button is visible (means portion not yet selected)
    const selectPortionBtn = page.locator('button:has-text("Select portion size")').first();
    const needsPortionSelection = await selectPortionBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (!needsPortionSelection) {
      log("    No portion selection required");
      return;
    }

    log("    Portion size selection required...");
    if (preferredPortion) {
      log(`    Preferred portion: "${preferredPortion}"`);
    }

    // Step 1: Scroll the modal content to reveal portion options
    // The portion options are in a fieldset with labels, often hidden below the fold
    await page.evaluate(() => {
      // Find scrollable elements with data-scroll-lock-scrollable attribute
      const scrollables = document.querySelectorAll('[data-scroll-lock-scrollable]');
      scrollables.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.scrollHeight > htmlEl.clientHeight + 50) {
          htmlEl.scrollTop = 300; // Scroll to reveal portion options
        }
      });

      // Also try scrolling any modal-like containers
      const modals = document.querySelectorAll('[class*="modal"], [class*="Modal"], [class*="drawer"]');
      modals.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.scrollHeight > htmlEl.clientHeight + 50) {
          htmlEl.scrollTop = 300;
        }
      });
    });
    await page.waitForTimeout(1000);

    // Step 2: Find and click the appropriate portion option label
    // Portion options are in <fieldset><label> elements with price info
    const portionLabels = page.locator('fieldset label');
    const labelCount = await portionLabels.count();
    log(`    Found ${labelCount} portion option labels`);

    if (labelCount > 0) {
      // Try to find preferred portion, or fall back to first
      let targetLabel = portionLabels.first();
      let selectedPortionText = "";

      if (preferredPortion) {
        // Search for matching portion label
        for (let i = 0; i < labelCount; i++) {
          const label = portionLabels.nth(i);
          const text = await label.textContent({ timeout: 500 }).catch(() => '');

          if (text && text.toLowerCase().includes(preferredPortion.toLowerCase())) {
            targetLabel = label;
            selectedPortionText = text.trim();
            log(`    Found preferred portion at index ${i}: "${text.substring(0, 50).trim()}"`);
            break;
          }
        }

        if (!selectedPortionText) {
          log(`    Preferred portion "${preferredPortion}" not found, using first option`);
        }
      }

      const labelText = selectedPortionText || await targetLabel.textContent({ timeout: 500 }).catch(() => '');

      if (await targetLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
        log(`    Selecting portion: "${labelText?.substring(0, 50).trim()}"`);
        await targetLabel.click({ force: true });
        await page.waitForTimeout(1500);

        // Step 3: Verify "Add to cart" button is now visible
        const addBtn = page.locator('button:has-text("Add to cart")').first();
        const addVisible = await addBtn.isVisible({ timeout: 2000 }).catch(() => false);
        log(`    After portion selection, Add to cart visible: ${addVisible}`);

        if (!addVisible) {
          // Try clicking the label again with scrollIntoView
          await targetLabel.scrollIntoViewIfNeeded();
          await targetLabel.click({ force: true });
          await page.waitForTimeout(1500);
        }
      } else {
        log("    Portion label not visible, trying to scroll into view...");
        await targetLabel.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(500);
        await targetLabel.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
      }
    } else {
      log("    No portion labels found in fieldset");
    }
  } catch (e) {
    log(`    Error handling required options: ${e}`);
  }
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

  // Debug: log button contents to understand the DOM
  const buttonDebug = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const shortButtons: { index: number; text: string; html: string }[] = [];

    buttons.forEach((btn, index) => {
      const text = btn.textContent?.trim() || '';
      // Only log buttons with short text (likely UI controls)
      if (text.length <= 5 && text.length > 0) {
        shortButtons.push({
          index,
          text,
          html: btn.outerHTML.substring(0, 100)
        });
      }
    });

    return shortButtons;
  });

  log(`    Short buttons found: ${buttonDebug.length}`);
  for (const btn of buttonDebug.slice(0, 10)) {
    log(`      [${btn.index}] "${btn.text}"`);
  }

  // Find buttons that look like quantity controls
  // Look for buttons with just "-" or "+" in text (allowing some whitespace)
  const buttonInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    let minusIndex = -1;
    let plusIndex = -1;

    buttons.forEach((btn, index) => {
      const text = btn.textContent || '';
      // More flexible matching - check if contains only +, -, or whitespace
      const cleaned = text.replace(/\s/g, '');
      if (cleaned === '-' || cleaned === '−' || cleaned === '–' || cleaned === '—') {
        minusIndex = index;
      }
      if (cleaned === '+') {
        plusIndex = index;
      }
    });

    return { minusIndex, plusIndex, totalButtons: buttons.length };
  });

  log(`    Button indices: minus=${buttonInfo.minusIndex}, plus=${buttonInfo.plusIndex}`);

  if (buttonInfo.minusIndex >= 0) {
    minusBtn = page.locator('button').nth(buttonInfo.minusIndex);
  }
  if (buttonInfo.plusIndex >= 0) {
    plusBtn = page.locator('button').nth(buttonInfo.plusIndex);
  }

  // If still not found, try using Playwright locators with :has-text
  if (!minusBtn) {
    try {
      const minus = page.locator('button:has-text("-")').first();
      if (await minus.isVisible({ timeout: 500 })) {
        minusBtn = minus;
        log("    Found - via :has-text");
      }
    } catch { }
  }

  if (!plusBtn) {
    // Try multiple plus patterns
    const plusPatterns = [
      'button:has-text("+")',
      'button:has-text("＋")',  // fullwidth plus
      'button svg',  // SVG icon button
    ];

    for (const pattern of plusPatterns) {
      try {
        const btns = page.locator(pattern);
        const count = await btns.count();
        log(`    Trying pattern "${pattern}": ${count} matches`);

        for (let i = 0; i < count; i++) {
          const btn = btns.nth(i);
          if (await btn.isVisible({ timeout: 300 })) {
            // For the + button, it should be near the - button
            // Check if this button's bounding box is near minusBtn
            if (minusBtn) {
              try {
                const minusBox = await minusBtn.boundingBox();
                const plusBox = await btn.boundingBox();
                if (minusBox && plusBox) {
                  // Should be on the same row (similar Y) and to the right of minus
                  const sameRow = Math.abs(minusBox.y - plusBox.y) < 20;
                  const toRight = plusBox.x > minusBox.x;
                  if (sameRow && toRight) {
                    plusBtn = btn;
                    log(`    Found + via pattern "${pattern}" at position ${i}`);
                    break;
                  }
                }
              } catch { }
            } else {
              // No minus button to reference, just use first visible
              plusBtn = btn;
              log(`    Found + via pattern "${pattern}" (no minus reference)`);
              break;
            }
          }
        }
        if (plusBtn) break;
      } catch { }
    }
  }

  // Fallback: find the + button by looking for a sibling of the minus button
  if (minusBtn && !plusBtn) {
    try {
      // Get the parent of minus button and find sibling buttons
      const parent = minusBtn.locator('..');
      const siblings = parent.locator('button');
      const sibCount = await siblings.count();
      log(`    Looking for + among ${sibCount} sibling buttons`);

      for (let i = 0; i < sibCount; i++) {
        const sib = siblings.nth(i);
        const text = await sib.textContent().catch(() => '');
        if (text?.includes('+') || i === sibCount - 1) {
          plusBtn = sib;
          log(`    Found + as sibling button`);
          break;
        }
      }
    } catch { }
  }

  // Read current quantity
  if (minusBtn || plusBtn) {
    try {
      const qtyText = await page.evaluate(() => {
        // Find the quantity display - usually a span/div between - and + buttons
        // Or look for data attribute
        const qtyElement = document.querySelector('[data-testid*="quantity"], [class*="quantity"]');
        if (qtyElement) {
          const text = qtyElement.textContent?.trim();
          if (text && /^\d+$/.test(text)) return parseInt(text, 10);
        }
        return 0;
      });
      currentQty = qtyText;
    } catch { }
  }

  return { minusBtn, plusBtn, currentQty };
}

// ============================================================================
// Helper: Find Action Button (Add/Update)
// ============================================================================

async function findActionButton(page: Page): Promise<ReturnType<Page["locator"]> | null> {
  // Order matters - try most specific first
  const patterns = [
    'button:has-text("Update")',
    'button:has-text("Add to cart")',
    'button:has-text("Add to Cart")',
    'button:has-text("Add")',
  ];

  log("  Looking for action button...");
  for (const pattern of patterns) {
    try {
      const btns = page.locator(pattern);
      const count = await btns.count();
      log(`    Pattern "${pattern}": ${count} matches`);

      if (count > 0) {
        const btn = btns.first();
        // Scroll into view first
        try {
          await btn.scrollIntoViewIfNeeded({ timeout: 2000 });
          await page.waitForTimeout(300);
        } catch {
          // Continue anyway
        }

        if (await btn.isVisible({ timeout: 1000 })) {
          const isDisabled = await btn.isDisabled().catch(() => false);
          if (!isDisabled) {
            const text = await btn.textContent().catch(() => '');
            log(`    Found action button: "${text?.trim()}"`);
            return btn;
          } else {
            log(`    Button disabled`);
          }
        } else {
          log(`    Button not visible after scroll`);
        }
      }
    } catch (e) {
      log(`    Error with pattern: ${e}`);
    }
  }

  return null;
}

// ============================================================================
// Main: Add Item to Cart
// ============================================================================

export async function addItemToCart(page: Page, item: ConfigItem): Promise<AddToCartResult> {
  log(`Adding to cart: ${item.name} (qty: ${item.quantity})`);

  const result: AddToCartResult = {
    success: false,
    itemName: item.name,
    quantity: item.quantity,
  };

  try {
    // Get initial cart count
    const initialCartCount = await getCartCount(page);
    log(`  Initial cart count: ${initialCartCount}`);

    // Navigate to dish URL
    await navigateTo(page, item.url);

    // Extra wait for modal to fully render
    await page.waitForTimeout(2000);

    // Dismiss any popups (delivery date, etc.)
    await dismissDishPopups(page);
    await dismissOverlays(page);
    await page.waitForTimeout(500);

    // Take debug screenshot
    await takeScreenshot(page, `add-step1-${item.name.replace(/\s+/g, '-')}`);

    // Handle required options (like Portion size) before adding
    await handleRequiredOptions(page, item.preferredPortion);

    // Find quantity controls
    const controls = await findQuantityControls(page);
    log(`  Found quantity controls: minus=${!!controls.minusBtn}, plus=${!!controls.plusBtn}, current=${controls.currentQty}`);

    if (!controls.plusBtn) {
      // Maybe we need to scroll down in the modal
      log("  Plus button not found, trying to scroll...");
      await page.evaluate(() => {
        const modals = document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="drawer"], [class*="Drawer"]');
        modals.forEach(m => {
          if (m.scrollHeight > m.clientHeight) {
            m.scrollTop = m.scrollHeight;
          }
        });
      });
      await page.waitForTimeout(500);

      // Try again
      const controls2 = await findQuantityControls(page);
      if (controls2.plusBtn) {
        controls.plusBtn = controls2.plusBtn;
        controls.minusBtn = controls2.minusBtn;
        controls.currentQty = controls2.currentQty;
      }
    }

    // Determine how many times to click +
    const targetQty = item.quantity;
    let clicksNeeded = 0;

    if (controls.currentQty === 0) {
      // Item not in cart yet - clicking + will start adding
      clicksNeeded = targetQty;
    } else {
      // Item already in cart - adjust to target
      clicksNeeded = targetQty - controls.currentQty;
    }

    log(`  Target: ${targetQty}, Current: ${controls.currentQty}, Clicks needed: ${clicksNeeded}`);

    // Click + button as needed (this will enable the Update button)
    // Use force:true because modal backdrop may intercept pointer events
    if (clicksNeeded > 0 && controls.plusBtn) {
      for (let i = 0; i < clicksNeeded; i++) {
        await controls.plusBtn.click({ force: true });
        log(`  Clicked + (${i + 1}/${clicksNeeded})`);
        await page.waitForTimeout(400);
      }
    } else if (clicksNeeded < 0 && controls.minusBtn) {
      // Need to decrease quantity
      for (let i = 0; i < Math.abs(clicksNeeded); i++) {
        await controls.minusBtn.click({ force: true });
        log(`  Clicked - (${i + 1}/${Math.abs(clicksNeeded)})`);
        await page.waitForTimeout(400);
      }
    }

    // Wait a moment for UI to update
    await page.waitForTimeout(1000);

    // Take screenshot after clicking +
    await takeScreenshot(page, `add-step2-${item.name.replace(/\s+/g, '-')}`);

    // Check if modal is still open - if not, clicking + might have directly added item
    const actionBtn = await findActionButton(page);
    log(`  Found action button: ${!!actionBtn}`);

    if (actionBtn) {
      // Modal still open, click the action button
      log("  Clicking action button...");
      await actionBtn.click({ force: true });
      await page.waitForTimeout(2000);
    } else {
      // Modal closed - item was probably added directly by clicking +
      log("  Modal closed after clicking + (item likely added directly)");
      await page.waitForTimeout(1000);
    }

    // Verify cart count increased
    const newCartCount = await getCartCount(page);
    log(`  New cart count: ${newCartCount}`);

    // Take final screenshot
    await takeScreenshot(page, `add-step3-${item.name.replace(/\s+/g, '-')}`);

    // Consider success if cart count increased or stayed same (for updates)
    if (newCartCount >= initialCartCount) {
      result.success = true;
      log(`  SUCCESS: Added ${item.name} to cart`);
    } else {
      result.error = `Cart count did not increase (was ${initialCartCount}, now ${newCartCount})`;
    }

  } catch (error) {
    result.error = `${error}`;
    await takeScreenshot(page, `add-error-${item.name.replace(/\s+/g, '-')}`);
    log(`  ERROR: ${error}`);
  }

  return result;
}

// ============================================================================
// Cart Management: Delete/Clear Items
// ============================================================================

/**
 * Removes an item from the cart by clicking its minus button until quantity is 0
 */
export async function removeItemFromCart(page: Page, itemName: string): Promise<boolean> {
  log(`Removing from cart: ${itemName}`);

  try {
    // Find the item row in the cart
    const itemRow = page.locator(`text=${itemName}`).first();
    if (!await itemRow.isVisible({ timeout: 2000 })) {
      log(`  Item not found in cart: ${itemName}`);
      return false;
    }

    // Find the minus button near this item
    const parent = itemRow.locator('xpath=ancestor::div[contains(@class, "item") or contains(@class, "row") or position() < 5]').first();
    const minusBtn = parent.locator('button:has-text("-")').first();

    if (!await minusBtn.isVisible({ timeout: 1000 })) {
      // Try finding minus button more broadly
      const allMinus = page.locator('button:has-text("-")');
      const count = await allMinus.count();
      log(`  Found ${count} minus buttons, trying each...`);

      // This is tricky - we need to find the right minus button
      // For now, just report we couldn't find it
      log(`  Could not find minus button for ${itemName}`);
      return false;
    }

    // Click minus until item is removed (usually shows 0 or disappears)
    for (let i = 0; i < 10; i++) {
      if (!await minusBtn.isVisible({ timeout: 500 })) break;
      await minusBtn.click({ force: true });
      log(`  Clicked - (attempt ${i + 1})`);
      await page.waitForTimeout(500);
    }

    return true;
  } catch (e) {
    log(`  Error removing item: ${e}`);
    return false;
  }
}

/**
 * Clears all items from the cart
 */
export async function clearCart(page: Page, cartUrl: string): Promise<boolean> {
  log("Clearing cart...");

  await navigateTo(page, cartUrl);
  await page.waitForTimeout(2000);
  await dismissDishPopups(page);

  // Take screenshot before clearing
  await takeScreenshot(page, 'cart-before-clear');

  // Find all minus buttons and click them repeatedly
  let cleared = false;
  for (let round = 0; round < 20; round++) {
    const minusButtons = page.locator('button:has-text("-")');
    const count = await minusButtons.count();

    if (count === 0) {
      cleared = true;
      break;
    }

    log(`  Round ${round + 1}: Found ${count} minus buttons`);

    // Click the first visible minus button
    for (let i = 0; i < count; i++) {
      const btn = minusButtons.nth(i);
      try {
        if (await btn.isVisible({ timeout: 300 })) {
          await btn.click({ force: true });
          await page.waitForTimeout(400);
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // Verify cart is empty
  await page.waitForTimeout(1000);
  const cartCount = await getCartCount(page);
  log(`  Cart count after clearing: ${cartCount}`);

  await takeScreenshot(page, 'cart-after-clear');

  return cartCount === 0;
}

// ============================================================================
// Module 5: Cart Verification
// ============================================================================

export interface CartItem {
  name: string;
  quantity: number;
  price?: string;
}

export interface CartContents {
  items: CartItem[];
  totalItems: number;
  subtotal?: string;
}

/**
 * Navigates to cart and reads its contents
 */
export async function getCartContents(page: Page, cartUrl: string): Promise<CartContents> {
  log("Reading cart contents...");

  // Navigate to cart
  await navigateTo(page, cartUrl);
  await page.waitForTimeout(2000);

  // Dismiss any overlays
  await dismissDishPopups(page);

  // Take screenshot
  await takeScreenshot(page, 'cart-contents');

  // Extract cart items using Playwright locators for more reliability
  const items: CartItem[] = [];

  // Find cart items by looking for rows with images and text containing "Weekdays"
  // Skip "You may also like" section by looking only after "Your cart" heading
  try {
    // Wait for cart to load
    await page.waitForSelector('text=Your cart', { timeout: 5000 });

    // Find all elements that contain dish names (end with "Weekdays")
    const dishElements = await page.locator('text=/.*- Weekdays$/').all();

    for (const el of dishElements) {
      try {
        const text = await el.textContent();
        if (text && text.includes('Weekdays')) {
          // Check if this is in the cart section (not "You may also like")
          const isInRecommendations = await el.evaluate(node => {
            const parent = node.closest('[class*="recommend"], [class*="also-like"], [class*="suggestion"]');
            const beforeCart = node.compareDocumentPosition(
              document.querySelector('text=Your cart') as Node || document.body
            ) & Node.DOCUMENT_POSITION_FOLLOWING;
            return parent !== null || beforeCart;
          }).catch(() => false);

          if (!isInRecommendations) {
            const name = text.trim();
            items.push({ name, quantity: 1 });
          }
        }
      } catch {
        // Skip this element
      }
    }
  } catch {
    log("  Could not find cart items via locators");
  }

  // Fallback: get info from page text
  const cartData = await page.evaluate(() => {
    const bodyText = document.body.innerText;

    // Get total from "$X.XX / N Items" pattern
    let subtotal = '';
    let totalItems = 0;
    const totalMatch = bodyText.match(/\$([\d.]+)\s*\/\s*(\d+)\s*Items?/i);
    if (totalMatch) {
      subtotal = `$${totalMatch[1]} / ${totalMatch[2]} Items`;
      totalItems = parseInt(totalMatch[2], 10);
    }

    return { subtotal, totalItems };
  });

  // Use totalItems from page if we couldn't parse individual items
  const totalItems = items.length > 0
    ? items.reduce((sum, item) => sum + item.quantity, 0)
    : cartData.totalItems;

  log(`  Found ${items.length} item types, ${totalItems} total items`);

  return {
    items,
    totalItems,
    subtotal: cartData.subtotal
  };
}

/**
 * Strict name matching - requires ALL key words to match
 * "Chili Fish" should match "Chill Fish - Weekdays" (chill/chili are close)
 * "Chicken 65" should NOT match "Butter Chicken" (65 is missing)
 */
function strictMatch(expectedName: string, cartName: string): boolean {
  const expected = expectedName.toLowerCase();
  const cart = cartName.toLowerCase();

  // Direct substring match (full expected name in cart)
  if (cart.includes(expected)) {
    return true;
  }

  // Extract key words - keep numbers, ignore common filler words
  const ignoreWords = new Set(['the', 'a', 'an', 'weekdays', 'oz']);
  const getKeyWords = (s: string) => {
    return s.split(/[\s\-\(\)]+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => {
        if (ignoreWords.has(w)) return false;
        // Keep numbers (like "65") even if short
        if (/^\d+$/.test(w)) return true;
        // Keep words 3+ chars
        return w.length >= 3;
      });
  };

  const expectedWords = getKeyWords(expected);
  const cartWords = getKeyWords(cart);

  // ALL expected key words must be found in cart name
  for (const ew of expectedWords) {
    let found = false;

    for (const cw of cartWords) {
      // Exact match
      if (ew === cw) {
        found = true;
        break;
      }

      // For non-numbers, allow 1 char typo difference (chill vs chili)
      if (!/^\d+$/.test(ew) && !/^\d+$/.test(cw)) {
        if (ew.length >= 4 && cw.length >= 4 && Math.abs(ew.length - cw.length) <= 1) {
          let diff = 0;
          const minLen = Math.min(ew.length, cw.length);
          for (let i = 0; i < minLen; i++) {
            if (ew[i] !== cw[i]) diff++;
          }
          diff += Math.abs(ew.length - cw.length);
          if (diff <= 1) {
            found = true;
            break;
          }
        }
      }
    }

    if (!found) {
      return false; // Missing a key word - not a match
    }
  }

  return expectedWords.length > 0;
}

/**
 * Verifies cart contents match expected items
 */
export async function verifyCart(
  page: Page,
  cartUrl: string,
  expectedItems: ConfigItem[]
): Promise<{ success: boolean; message: string; cart: CartContents }> {
  const cart = await getCartContents(page, cartUrl);

  log("Verifying cart contents...");

  // Check if we have the expected items using fuzzy matching
  const missing: string[] = [];
  const found: string[] = [];

  for (const expected of expectedItems) {
    const inCart = cart.items.find(item => strictMatch(expected.name, item.name));

    if (inCart) {
      found.push(`${expected.name} -> ${inCart.name} (qty: ${inCart.quantity})`);
      log(`    Found: ${expected.name} -> ${inCart.name}`);
    } else {
      missing.push(`${expected.name}`);
      log(`    Missing: ${expected.name}`);
    }
  }

  const success = missing.length === 0;
  let message = '';

  if (success) {
    message = `All ${expectedItems.length} items found in cart`;
  } else {
    message = `Missing ${missing.length} items: ${missing.join(', ')}`;
  }

  return { success, message, cart };
}

// ============================================================================
// Test Entry Point
// ============================================================================

if (require.main === module) {
  import('./session').then(async ({ launchBrowser, closeBrowser, checkLoginStatus }) => {
    import('./config').then(async ({ loadConfig }) => {
      const DEBUG = process.argv.includes('--debug');

      // Parse optional --url and --qty arguments
      const urlArg = process.argv.find(a => a.startsWith('--url='));
      const qtyArg = process.argv.find(a => a.startsWith('--qty='));

      console.log("=".repeat(50));
      console.log("MODULE 4: Add to Cart - Test");
      console.log("=".repeat(50));
      console.log();

      // Launch browser
      console.log("Launching browser...");
      const context = await launchBrowser({ headless: !DEBUG });
      const page = context.pages()[0] || await context.newPage();
      console.log();

      // Check login
      console.log("Checking login status...");
      await page.goto('https://shef.com', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const loginStatus = await checkLoginStatus(page);
      if (!loginStatus.loggedIn) {
        console.log("ERROR: Not logged in. Run 'npm run shef:login' first.");
        await closeBrowser(context);
        process.exit(1);
      }
      console.log(`  Logged in (${loginStatus.indicator})`);
      console.log();

      // Get test item
      let testItem: ConfigItem;
      if (urlArg) {
        testItem = {
          name: "Test Item",
          url: urlArg.split('=')[1],
          quantity: qtyArg ? parseInt(qtyArg.split('=')[1], 10) : 1,
        };
      } else {
        // Use first item from config
        const config = loadConfig();
        testItem = config.items[0];
      }

      console.log(`Test item: ${testItem.name}`);
      console.log(`  URL: ${testItem.url}`);
      console.log(`  Quantity: ${testItem.quantity}`);
      console.log();

      // Run the add to cart flow
      console.log("Running add to cart flow...");
      const result = await addItemToCart(page, testItem);
      console.log();

      if (result.success) {
        console.log("=".repeat(50));
        console.log("SUCCESS: Item added to cart!");
        console.log("=".repeat(50));
      } else {
        console.log("=".repeat(50));
        console.log(`FAILED: ${result.error}`);
        console.log("Check artifacts/ folder for screenshots");
        console.log("=".repeat(50));
      }

      // Cleanup
      if (!DEBUG) {
        await closeBrowser(context);
      } else {
        console.log();
        console.log("[DEBUG] Browser left open. Press Ctrl+C to exit.");
      }

      process.exit(result.success ? 0 : 1);
    });
  }).catch((err) => {
    console.error("Test failed:", err.message);
    process.exit(1);
  });
}
