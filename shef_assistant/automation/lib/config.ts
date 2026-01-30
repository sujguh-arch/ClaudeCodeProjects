/**
 * Module 1: Config & State
 *
 * Handles loading, validating, and managing configuration for the Shef assistant.
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types
// ============================================================================

export interface ConfigItem {
  name: string;        // Human-readable name for logging
  url: string;         // Full URL to the dish page
  quantity: number;    // Desired quantity to add
  preferredPortion?: string;  // Optional portion preference (e.g., "Large (16oz)")
}

export interface Config {
  shefHomeUrl: string;  // Base URL (e.g., "https://shef.com")
  cartUrl: string;      // Cart page URL
  items: ConfigItem[];  // Items to add to cart
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Paths
// ============================================================================

const PROJECT_ROOT = path.join(__dirname, "..", "..");
export const PATHS = {
  config: path.join(PROJECT_ROOT, "data", "config.json"),
  configExample: path.join(PROJECT_ROOT, "data", "config.example.json"),
  profile: path.join(PROJECT_ROOT, ".pw-profile"),
  artifacts: path.join(PROJECT_ROOT, "artifacts"),
};

// ============================================================================
// Validation
// ============================================================================

function validateItem(item: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `items[${index}]`;

  if (typeof item !== "object" || item === null) {
    return [`${prefix}: must be an object`];
  }

  const obj = item as Record<string, unknown>;

  // name
  if (typeof obj.name !== "string" || obj.name.trim() === "") {
    errors.push(`${prefix}.name: must be a non-empty string`);
  }

  // url
  if (typeof obj.url !== "string") {
    errors.push(`${prefix}.url: must be a string`);
  } else if (!obj.url.startsWith("https://shef.com/")) {
    errors.push(`${prefix}.url: must start with https://shef.com/`);
  }

  // quantity
  if (typeof obj.quantity !== "number") {
    errors.push(`${prefix}.quantity: must be a number`);
  } else if (!Number.isInteger(obj.quantity) || obj.quantity < 1 || obj.quantity > 10) {
    errors.push(`${prefix}.quantity: must be an integer between 1 and 10`);
  }

  return errors;
}

export function validateConfig(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: ["Config must be an object"] };
  }

  const obj = data as Record<string, unknown>;

  // shefHomeUrl
  if (typeof obj.shefHomeUrl !== "string") {
    errors.push("shefHomeUrl: must be a string");
  } else if (!obj.shefHomeUrl.startsWith("https://")) {
    errors.push("shefHomeUrl: must start with https://");
  }

  // cartUrl
  if (typeof obj.cartUrl !== "string") {
    errors.push("cartUrl: must be a string");
  } else if (!obj.cartUrl.startsWith("https://")) {
    errors.push("cartUrl: must start with https://");
  }

  // items
  if (!Array.isArray(obj.items)) {
    errors.push("items: must be an array");
  } else if (obj.items.length === 0) {
    errors.push("items: must have at least one item");
  } else {
    for (let i = 0; i < obj.items.length; i++) {
      errors.push(...validateItem(obj.items[i], i));
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Loading
// ============================================================================

export function configExists(): boolean {
  return fs.existsSync(PATHS.config);
}

export function loadConfig(): Config {
  // Check if config exists
  if (!configExists()) {
    throw new Error(
      `Config file not found at ${PATHS.config}\n` +
      `Run: cp data/config.example.json data/config.json`
    );
  }

  // Read and parse
  let data: unknown;
  try {
    const raw = fs.readFileSync(PATHS.config, "utf-8");
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to parse config.json: ${e}`);
  }

  // Validate
  const result = validateConfig(data);
  if (!result.valid) {
    throw new Error(`Invalid config:\n  - ${result.errors.join("\n  - ")}`);
  }

  return data as Config;
}

// ============================================================================
// Utilities
// ============================================================================

export function ensureArtifactsDir(): void {
  if (!fs.existsSync(PATHS.artifacts)) {
    fs.mkdirSync(PATHS.artifacts, { recursive: true });
  }
}

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// ============================================================================
// Test Entry Point
// ============================================================================

if (require.main === module) {
  console.log("=".repeat(50));
  console.log("MODULE 1: Config & State - Test");
  console.log("=".repeat(50));
  console.log();

  // Check paths
  console.log("Paths:");
  console.log(`  Config:    ${PATHS.config}`);
  console.log(`  Profile:   ${PATHS.profile}`);
  console.log(`  Artifacts: ${PATHS.artifacts}`);
  console.log();

  // Check if config exists
  if (!configExists()) {
    console.log("ERROR: Config file not found!");
    console.log(`  Expected: ${PATHS.config}`);
    console.log(`  Run: cp data/config.example.json data/config.json`);
    process.exit(1);
  }

  // Load and validate
  try {
    const config = loadConfig();
    console.log("Config valid!");
    console.log();
    console.log("Contents:");
    console.log(`  Home URL: ${config.shefHomeUrl}`);
    console.log(`  Cart URL: ${config.cartUrl}`);
    console.log(`  Items (${config.items.length}):`);
    for (const item of config.items) {
      console.log(`    - ${item.name} (qty: ${item.quantity})`);
      console.log(`      ${item.url}`);
    }
    console.log();
    console.log("SUCCESS: Config loaded and validated");
  } catch (e) {
    console.log(`ERROR: ${e}`);
    process.exit(1);
  }
}
