/**
 * Module 5: Cart Verification - Test Script
 */

import { launchBrowser, closeBrowser, checkLoginStatus } from './session';
import { loadConfig } from './config';
import { getCartContents, verifyCart } from './cart';

const DEBUG = process.argv.includes('--debug');

async function test() {
  console.log("=".repeat(50));
  console.log("MODULE 5: Cart Verification - Test");
  console.log("=".repeat(50));
  console.log();

  // Load config
  const config = loadConfig();
  console.log(`Expected items: ${config.items.length}`);
  for (const item of config.items) {
    console.log(`  - ${item.name} (qty: ${item.quantity})`);
  }
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

  // Get cart contents
  console.log("Reading cart...");
  const cart = await getCartContents(page, config.cartUrl);
  console.log();

  console.log("Cart Contents:");
  console.log("-".repeat(40));
  if (cart.items.length === 0) {
    console.log("  (empty or couldn't read items)");
  } else {
    for (const item of cart.items) {
      console.log(`  ${item.name}`);
      console.log(`    Qty: ${item.quantity}${item.price ? `, Price: ${item.price}` : ''}`);
    }
  }
  console.log("-".repeat(40));
  console.log(`Total items: ${cart.totalItems}`);
  if (cart.subtotal) {
    console.log(`Subtotal: ${cart.subtotal}`);
  }
  console.log();

  // Verify against expected
  console.log("Verification:");
  const result = await verifyCart(page, config.cartUrl, config.items);
  console.log();

  if (result.success) {
    console.log("=".repeat(50));
    console.log("SUCCESS: Cart contains expected items");
    console.log("=".repeat(50));
  } else {
    console.log("=".repeat(50));
    console.log(`WARNING: ${result.message}`);
    console.log("=".repeat(50));
  }

  // Cleanup
  if (!DEBUG) {
    await closeBrowser(context);
  } else {
    console.log();
    console.log("[DEBUG] Browser left open. Press Ctrl+C to exit.");
  }
}

test().catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});
