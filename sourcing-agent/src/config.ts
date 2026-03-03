import { readFile } from "fs/promises";
import { resolve } from "path";
import type { AgentConfig, SearchProfile } from "./sources/types.js";

export function loadAgentConfig(): AgentConfig {
  const hunterKey = process.env.HUNTER_API_KEY;
  if (!hunterKey) {
    throw new Error("HUNTER_API_KEY environment variable is required");
  }

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SPREADSHEET_ID environment variable is required");
  }

  const credentialsPath =
    process.env.GOOGLE_CREDENTIALS_PATH ?? "./credentials.json";

  return {
    hunter: {
      apiKey: hunterKey,
      minConfidence: parseInt(
        process.env.HUNTER_MIN_CONFIDENCE ?? "0",
        10
      ),
    },
    sheets: {
      spreadsheetId,
      credentialsPath: resolve(credentialsPath),
    },
    schedule: {
      cronExpression: process.env.CRON_SCHEDULE ?? "0 8 * * *",
      timezone: process.env.CRON_TIMEZONE ?? "America/Los_Angeles",
    },
    dataDir: resolve(process.env.DATA_DIR ?? "./data"),
  };
}

export async function loadSearchProfiles(
  configPath?: string
): Promise<SearchProfile[]> {
  const filePath = resolve(
    configPath ?? "./config/search-profiles.json"
  );

  const raw = await readFile(filePath, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.profiles)) {
    throw new Error(
      `Invalid search-profiles.json: expected { profiles: [...] }`
    );
  }

  const profiles: SearchProfile[] = [];
  for (const p of data.profiles) {
    if (!p.name || !p.companies?.length || !p.titles?.length) {
      throw new Error(
        `Invalid profile "${p.name ?? "unnamed"}": name, companies, and titles are required`
      );
    }
    profiles.push({
      name: p.name,
      companies: p.companies,
      titles: p.titles,
      seniorities: p.seniorities ?? ["director", "vp"],
      locations: p.locations,
      maxResultsPerRun: p.maxResultsPerRun ?? 10,
    });
  }

  console.log(`[config] Loaded ${profiles.length} search profile(s)`);
  return profiles;
}
