/**
 * Cleanup script - removes stale browser locks
 *
 * Usage:
 *   npx tsx automation/cleanup.ts         # Clean up stale locks only
 *   npx tsx automation/cleanup.ts --force # Kill browser and clean up
 */

import { cleanupStaleLock, forceCleanupLock, isBrowserRunning } from "./lib/session";
import { PATHS } from "./lib/config";
import * as fs from "fs";

console.log("=".repeat(50));
console.log("Shef Browser Profile Cleanup");
console.log("=".repeat(50));
console.log();

// Check if profile exists
if (!fs.existsSync(PATHS.profile)) {
  console.log("No browser profile found. Nothing to clean up.");
  process.exit(0);
}

const forceMode = process.argv.includes("--force");

if (forceMode) {
  console.log("Force mode: Will kill browser if running...");
  console.log();

  const result = forceCleanupLock();

  if (result.killed) {
    console.log("Browser was killed.");
  }
  if (result.cleaned) {
    console.log("Lock files removed.");
    console.log();
    console.log("SUCCESS: Profile is now available for use.");
  } else if (!result.killed) {
    console.log("No active browser or lock found.");
  }
} else {
  // Normal mode: only clean up stale locks
  console.log("Checking for stale locks...");
  console.log();

  if (isBrowserRunning()) {
    console.log("Browser is currently running with this profile.");
    console.log();
    console.log("Options:");
    console.log("  1. Close the Shef browser window manually");
    console.log("  2. Run: npm run shef:cleanup -- --force");
    console.log();
    process.exit(1);
  }

  const cleaned = cleanupStaleLock();

  if (cleaned) {
    console.log("Stale lock cleaned up.");
    console.log();
    console.log("SUCCESS: Profile is now available for use.");
  } else {
    console.log("No stale locks found. Profile is ready.");
  }
}
