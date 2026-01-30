/**
 * Config Service - File I/O for config.json
 *
 * Handles all CRUD operations for the Shef configuration file.
 */

import * as fs from "fs";
import * as path from "path";
import type { ShefItem, ShefConfig, DayOfWeek } from "./types";
import { generateId, validateDays } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");
const LOCK_PATH = CONFIG_PATH + ".lock";
const LOCK_TIMEOUT = 5000; // 5 seconds max wait for lock
const LOCK_CHECK_INTERVAL = 10; // Check every 10ms

function acquireLockSync(): void {
  const startTime = Date.now();

  while (true) {
    try {
      // Try to create lock file exclusively
      fs.writeFileSync(LOCK_PATH, String(process.pid), { flag: "wx" });
      return; // Lock acquired
    } catch {
      // Lock file exists, wait and retry
      if (Date.now() - startTime > LOCK_TIMEOUT) {
        throw new Error("Failed to acquire config lock (timeout after 5s)");
      }
      // Busy wait with small sleep
      const end = Date.now() + LOCK_CHECK_INTERVAL;
      while (Date.now() < end) {
        // Spin loop for sync sleep
      }
    }
  }
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_PATH)) {
      fs.unlinkSync(LOCK_PATH);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

function ensureDataDir(): void {
  const dataDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getDefaultConfig(): ShefConfig {
  return {
    shefHomeUrl: "https://shef.com",
    cartUrl: "https://shef.com/cart",
    items: [],
  };
}

export function readConfig(): ShefConfig {
  ensureDataDir();
  acquireLockSync();

  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const defaultConfig = getDefaultConfig();
      // writeConfigUnsafe to avoid recursive lock
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2) + "\n");
      return defaultConfig;
    }

    const content = fs.readFileSync(CONFIG_PATH, "utf-8");
    try {
      return JSON.parse(content) as ShefConfig;
    } catch (error) {
      console.error("Failed to parse config.json:", error instanceof Error ? error.message : String(error));
      console.warn("Returning default config due to parse error");
      return getDefaultConfig();
    }
  } finally {
    releaseLock();
  }
}

export function writeConfig(config: ShefConfig): void {
  ensureDataDir();
  acquireLockSync();

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
  } finally {
    releaseLock();
  }
}

// ============================================================================
// Item CRUD Operations
// ============================================================================

export function getAllItems(): ShefItem[] {
  const config = readConfig();
  return config.items;
}

export function getItemById(id: string): ShefItem | null {
  const config = readConfig();
  return config.items.find((item) => item.id === id) || null;
}

export interface CreateItemOptions {
  name: string;
  url: string;
  quantity: number;
  availableDays?: DayOfWeek[];
  preferredPortion?: string;
  tags?: string[];
}

export function createItem(
  name: string,
  url: string,
  quantity: number,
  options?: Partial<Pick<ShefItem, "availableDays" | "preferredPortion" | "tags">>
): ShefItem {
  const config = readConfig();

  const newItem: ShefItem = {
    id: generateId(),
    name: name.trim(),
    url: url.trim(),
    quantity: Math.max(1, quantity),
  };

  // Add optional extended fields if provided
  if (options?.availableDays && options.availableDays.length > 0) {
    newItem.availableDays = validateDays(options.availableDays);
  }
  if (options?.preferredPortion?.trim()) {
    newItem.preferredPortion = options.preferredPortion.trim();
  }
  if (options?.tags && options.tags.length > 0) {
    newItem.tags = options.tags.map((t) => t.trim()).filter(Boolean);
  }

  config.items.push(newItem);
  writeConfig(config);

  return newItem;
}

export function updateItem(
  id: string,
  updates: Partial<Omit<ShefItem, "id">>
): ShefItem | null {
  const config = readConfig();
  const index = config.items.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const updatedItem: ShefItem = {
    ...config.items[index],
    id, // Ensure ID cannot be changed
  };

  // Apply basic field updates
  if (updates.name !== undefined) {
    updatedItem.name = updates.name;
  }
  if (updates.url !== undefined) {
    updatedItem.url = updates.url;
  }
  if (updates.quantity !== undefined) {
    updatedItem.quantity = Math.max(1, updates.quantity);
  }

  // Apply extended field updates
  if (updates.availableDays !== undefined) {
    if (updates.availableDays === null || updates.availableDays.length === 0) {
      delete updatedItem.availableDays;
    } else {
      updatedItem.availableDays = validateDays(updates.availableDays);
    }
  }
  if (updates.preferredPortion !== undefined) {
    if (!updates.preferredPortion?.trim()) {
      delete updatedItem.preferredPortion;
    } else {
      updatedItem.preferredPortion = updates.preferredPortion.trim();
    }
  }
  if (updates.tags !== undefined) {
    if (updates.tags === null || updates.tags.length === 0) {
      delete updatedItem.tags;
    } else {
      const validTags = updates.tags.map((t) => t.trim()).filter(Boolean);
      updatedItem.tags = validTags.length > 0 ? validTags : undefined;
    }
  }

  config.items[index] = updatedItem;
  writeConfig(config);

  return updatedItem;
}

export function deleteItem(id: string): boolean {
  const config = readConfig();
  const index = config.items.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  config.items.splice(index, 1);
  writeConfig(config);

  return true;
}

// ============================================================================
// Bulk Operations
// ============================================================================

export function clearAllItems(): void {
  const config = readConfig();
  config.items = [];
  writeConfig(config);
}

export function reorderItems(itemIds: string[]): boolean {
  const config = readConfig();

  // Validate all IDs exist
  const existingIds = new Set(config.items.map((item) => item.id));
  if (!itemIds.every((id) => existingIds.has(id))) {
    return false;
  }

  // Create new ordered array
  const reorderedItems: ShefItem[] = [];
  for (const id of itemIds) {
    const item = config.items.find((i) => i.id === id);
    if (item) {
      reorderedItems.push(item);
    }
  }

  config.items = reorderedItems;
  writeConfig(config);

  return true;
}
