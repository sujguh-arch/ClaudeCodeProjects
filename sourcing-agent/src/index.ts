import "dotenv/config";
import cron from "node-cron";
import { loadAgentConfig, loadSearchProfiles } from "./config.js";
import { HunterClient } from "./sources/hunter.js";
import { SheetsWriter } from "./output/sheets.js";
import { DedupTracker } from "./dedup.js";

async function runOnce(): Promise<void> {
  const config = loadAgentConfig();
  const profiles = await loadSearchProfiles();

  const hunter = new HunterClient(
    config.hunter.apiKey,
    config.hunter.minConfidence
  );
  const sheets = new SheetsWriter(
    config.sheets.spreadsheetId,
    config.sheets.credentialsPath
  );
  const dedup = new DedupTracker(config.dataDir);

  await dedup.load();

  let totalNew = 0;

  for (const profile of profiles) {
    console.log(`\n--- Running profile: ${profile.name} ---`);

    try {
      // Step 1: Search — Hunter returns emails directly, no enrichment needed
      const result = await hunter.search(profile);
      console.log(
        `[run] Found ${result.contacts.length} contacts (${result.totalAvailable} total available)`
      );

      if (result.contacts.length === 0) {
        console.log("[run] No contacts found for this profile");
        continue;
      }

      // Step 2: Dedup
      const newContacts = dedup.filterNew(result.contacts);
      if (newContacts.length === 0) {
        console.log("[run] No new contacts for this profile");
        continue;
      }
      console.log(`[run] ${newContacts.length} new contact(s) to process`);

      // Log quality summary
      const withEmail = newContacts.filter((c) => c.email);
      const highConf = newContacts.filter((c) => (c.confidence ?? 0) >= 80);
      const verified = newContacts.filter((c) => c.verificationStatus === "valid");
      console.log(
        `[run] Quality: ${withEmail.length} with email, ${highConf.length} high-confidence (≥80), ${verified.length} verified`
      );

      // Step 3: Write to Google Sheet
      const written = await sheets.appendContacts(newContacts);
      totalNew += written;

      // Step 4: Mark as seen
      dedup.markSeen(newContacts);
    } catch (err) {
      console.error(`[run] Error processing profile "${profile.name}":`, err);
    }
  }

  await dedup.save();

  console.log(`\n=== Run complete: ${totalNew} new contacts written to sheet ===`);
  console.log(`[run] Hunter: ${hunter.searchesRemaining}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isOnce = args.includes("--once");
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    console.log("=== DRY RUN MODE ===");
    console.log("Loading config and profiles to validate...\n");

    const config = loadAgentConfig();
    console.log("Config loaded:");
    console.log(`  Hunter min confidence: ${config.hunter.minConfidence}`);
    console.log(`  Spreadsheet ID: ${config.sheets.spreadsheetId}`);
    console.log(`  Schedule: ${config.schedule.cronExpression} (${config.schedule.timezone})`);

    const profiles = await loadSearchProfiles();
    for (const p of profiles) {
      console.log(`\n  Profile: ${p.name}`);
      console.log(`    Companies: ${p.companies.join(", ")}`);
      console.log(`    Titles: ${p.titles.join(", ")}`);
      console.log(`    Seniorities: ${p.seniorities.join(", ")}`);
      console.log(`    Locations: ${p.locations?.join(", ") ?? "any"}`);
      console.log(`    Max results/run: ${p.maxResultsPerRun}`);
    }
    console.log("\n=== Config valid. Ready to run. ===");
    return;
  }

  if (isOnce) {
    console.log("=== Running once ===\n");
    await runOnce();
    return;
  }

  // Scheduled mode
  const config = loadAgentConfig();
  const { cronExpression, timezone } = config.schedule;

  console.log(`=== Sourcing Agent started ===`);
  console.log(`Schedule: ${cronExpression} (${timezone})`);
  console.log("Waiting for next scheduled run...\n");

  // Run once immediately on startup
  console.log("Running initial search on startup...");
  await runOnce();

  // Then schedule recurring runs
  cron.schedule(
    cronExpression,
    async () => {
      console.log(`\n[scheduler] Triggered at ${new Date().toISOString()}`);
      try {
        await runOnce();
      } catch (err) {
        console.error("[scheduler] Run failed:", err);
      }
    },
    { timezone }
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
