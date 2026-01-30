#!/usr/bin/env npx tsx
/**
 * Scheduled Prefill Script
 *
 * Runs the prefill automation only if:
 * 1. Schedule is enabled
 * 2. Current day is in the schedule
 * 3. Not already run today (idempotent)
 *
 * Usage:
 *   npx tsx automation/scheduled-prefill.ts
 *
 * Or via cron:
 *   0 10 * * * cd /path/to/shef_assistant && npm run shef:scheduled
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import type { DayOfWeek, ScheduleConfig } from "../src/lib/types";

const CONFIG_PATH = path.join(__dirname, "..", "data", "config.json");
const SCHEDULE_PATH = path.join(__dirname, "..", "data", "schedule.json");
const LOG_DIR = path.join(__dirname, "..", "artifacts", "scheduled-runs");

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function getCurrentDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay();
  const dayMap: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return dayMap[dayIndex];
}

function loadScheduleConfig(): ScheduleConfig {
  const defaultConfig: ScheduleConfig = {
    enabled: false,
    time: "10:00",
    days: ["monday", "wednesday", "friday"],
  };

  if (!fs.existsSync(SCHEDULE_PATH)) {
    log(`No schedule.json found, creating default at ${SCHEDULE_PATH}`);
    fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  try {
    const data = JSON.parse(fs.readFileSync(SCHEDULE_PATH, "utf-8"));
    return { ...defaultConfig, ...data };
  } catch (error) {
    log(`Failed to parse schedule.json: ${error}`);
    return defaultConfig;
  }
}

function saveScheduleConfig(config: ScheduleConfig): void {
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(config, null, 2));
}

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getToday(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function hasRunToday(config: ScheduleConfig): boolean {
  if (!config.lastRun) return false;
  const lastRunDate = config.lastRun.split("T")[0];
  return lastRunDate === getToday();
}

function shouldRun(config: ScheduleConfig): { run: boolean; reason: string } {
  if (!config.enabled) {
    return { run: false, reason: "Schedule is disabled" };
  }

  const today = getCurrentDayOfWeek();
  if (!config.days.includes(today)) {
    return { run: false, reason: `Today (${today}) is not a scheduled day` };
  }

  if (hasRunToday(config)) {
    return { run: false, reason: "Already ran today (idempotent check)" };
  }

  return { run: true, reason: `Scheduled run for ${today}` };
}

async function runPrefill(): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const prefillScript = path.join(__dirname, "prefill.ts");
    const child = spawn("npx", ["tsx", prefillScript], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env },
    });

    let output = "";

    child.stdout?.on("data", (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr?.on("data", (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        output,
      });
    });

    child.on("error", (err) => {
      output += `Error: ${err.message}`;
      resolve({
        success: false,
        output,
      });
    });
  });
}

async function main(): Promise<void> {
  log("=".repeat(60));
  log("SCHEDULED PREFILL");
  log("=".repeat(60));

  // Check if config exists
  if (!fs.existsSync(CONFIG_PATH)) {
    log("ERROR: config.json not found. Cannot run prefill.");
    process.exit(1);
  }

  // Load schedule config
  const scheduleConfig = loadScheduleConfig();
  log(`Schedule: enabled=${scheduleConfig.enabled}, days=${scheduleConfig.days.join(",")}, time=${scheduleConfig.time}`);

  // Check if we should run
  const { run, reason } = shouldRun(scheduleConfig);
  log(`Decision: ${reason}`);

  if (!run) {
    log("Skipping prefill run.");
    process.exit(0);
  }

  // Run prefill
  log("");
  log("Starting prefill...");
  log("-".repeat(60));

  const result = await runPrefill();

  log("-".repeat(60));
  log(`Prefill ${result.success ? "completed successfully" : "failed"}`);

  // Update lastRun timestamp
  scheduleConfig.lastRun = new Date().toISOString();
  saveScheduleConfig(scheduleConfig);
  log(`Updated lastRun to ${scheduleConfig.lastRun}`);

  // Save run log
  ensureLogDir();
  const logFileName = `run-${getToday()}.log`;
  const logPath = path.join(LOG_DIR, logFileName);
  fs.writeFileSync(logPath, result.output);
  log(`Run log saved to ${logPath}`);

  process.exit(result.success ? 0 : 1);
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
