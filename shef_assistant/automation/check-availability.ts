/**
 * Test script for availability checker
 *
 * Usage: npm run shef:check-availability
 */

import { launchBrowser, closeBrowser } from "./lib/session";
import { loadConfig } from "./lib/config";
import { checkAllItems } from "./lib/availability";

async function main() {
  console.log("=".repeat(60));
  console.log("AVAILABILITY CHECK TEST");
  console.log("=".repeat(60));

  const config = await loadConfig();
  console.log(`\nLoaded ${config.items.length} items from config\n`);

  const browser = await launchBrowser({ headless: false });
  const page = browser.pages()[0] || (await browser.newPage());

  try {
    const results = await checkAllItems(page, config.items);

    console.log("\n" + "=".repeat(60));
    console.log("RESULTS");
    console.log("=".repeat(60));

    const available = results.filter(r => r.available);
    const unavailable = results.filter(r => !r.available);

    console.log(`\n✓ Available (${available.length}):`);
    available.forEach(r => {
      console.log(`  - ${r.name}`);
    });

    console.log(`\n✗ Unavailable (${unavailable.length}):`);
    unavailable.forEach(r => {
      console.log(`  - ${r.name}: ${r.reason}`);
    });

    console.log("\n" + "=".repeat(60));

  } finally {
    await closeBrowser(browser);
  }
}

main().catch(console.error);
