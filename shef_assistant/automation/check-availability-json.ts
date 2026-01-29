/**
 * Availability checker that outputs JSON for API use
 *
 * Usage: npx tsx automation/check-availability-json.ts
 * Output: JSON to stdout
 */

import { launchBrowser, closeBrowser } from "./lib/session";
import { loadConfig } from "./lib/config";
import { checkAllItems, AvailabilityResult } from "./lib/availability";

interface CheckResult {
  success: boolean;
  available: Array<{ name: string; url: string }>;
  unavailable: Array<{ name: string; url: string; reason: string }>;
  error?: string;
}

async function main(): Promise<void> {
  const result: CheckResult = {
    success: false,
    available: [],
    unavailable: [],
  };

  try {
    const config = await loadConfig();

    if (config.items.length === 0) {
      result.success = true;
      console.log(JSON.stringify(result));
      return;
    }

    const browser = await launchBrowser({ headless: true });
    const page = browser.pages()[0] || (await browser.newPage());

    try {
      const results: AvailabilityResult[] = await checkAllItems(page, config.items);

      result.available = results
        .filter(r => r.available)
        .map(r => ({ name: r.name, url: r.url }));

      result.unavailable = results
        .filter(r => !r.available)
        .map(r => ({ name: r.name, url: r.url, reason: r.reason || "Unknown" }));

      result.success = true;
    } finally {
      await closeBrowser(browser);
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  console.log(JSON.stringify(result));
}

main();
