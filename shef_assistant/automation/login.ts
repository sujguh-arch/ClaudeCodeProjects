import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

interface Config {
  shefHomeUrl: string;
  cartUrl: string;
  items: { name: string; url: string; quantity: number }[];
}

const CONFIG_PATH = path.join(__dirname, "..", "data", "config.json");
const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");

function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("ERROR: config.json not found.");
    console.error("Copy data/config.example.json to data/config.json and customize it.");
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (error) {
    console.error("ERROR: Failed to parse config.json:", error instanceof Error ? error.message : String(error));
    console.error("Make sure config.json is valid JSON.");
    process.exit(1);
  }
}

function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question("\nPress Enter to close the browser...", () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const config = loadConfig();

  console.log("=".repeat(60));
  console.log("SHEF LOGIN - Persistent Browser Session");
  console.log("=".repeat(60));
  console.log(`\nProfile directory: ${PROFILE_DIR}`);
  console.log(`Navigating to: ${config.shefHomeUrl}`);

  // Launch browser with persistent context
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = context.pages()[0] || (await context.newPage());

  console.log("\n[Step 1] Opening Shef homepage...");
  await page.goto(config.shefHomeUrl, { waitUntil: "domcontentloaded" });

  console.log("\n" + "=".repeat(60));
  console.log("INSTRUCTIONS:");
  console.log("=".repeat(60));
  console.log("1. Log in to your Shef account in the browser window");
  console.log("2. Verify you are logged in (check for your profile/account)");
  console.log("3. Return here and press Enter to save your session");
  console.log("\nYour login will be saved in .pw-profile/ for future runs.");
  console.log("=".repeat(60));

  await waitForEnter();

  console.log("\n[Closing] Saving browser state...");
  await context.close();
  console.log("[Done] Session saved. You can now run shef:prefill.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
