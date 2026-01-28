/**
 * Clear Cart - Removes all items from the Shef cart
 */

import { launchBrowser, closeBrowser, checkLoginStatus } from './session';
import { loadConfig } from './config';
import { clearCart, getCartContents } from './cart';

const DEBUG = process.argv.includes('--debug');

async function main() {
  console.log("=".repeat(50));
  console.log("CLEAR CART");
  console.log("=".repeat(50));
  console.log();

  const config = loadConfig();

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

  // Get current cart contents
  console.log("Current cart:");
  const before = await getCartContents(page, config.cartUrl);
  console.log(`  Items: ${before.totalItems}`);
  console.log();

  if (before.totalItems === 0) {
    console.log("Cart is already empty!");
    await closeBrowser(context);
    return;
  }

  // Clear the cart
  console.log("Clearing cart...");
  const success = await clearCart(page, config.cartUrl);
  console.log();

  if (success) {
    console.log("=".repeat(50));
    console.log("SUCCESS: Cart cleared!");
    console.log("=".repeat(50));
  } else {
    console.log("=".repeat(50));
    console.log("WARNING: Cart may not be fully cleared");
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

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
