/**
 * Config Service - File I/O for config.json
 *
 * Handles all CRUD operations for the Shef configuration file.
 */

import * as fs from "fs";
import * as path from "path";
import type { ShefItem, ShefConfig } from "./types";
import { generateId } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

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

  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = getDefaultConfig();
    writeConfig(defaultConfig);
    return defaultConfig;
  }

  const content = fs.readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(content) as ShefConfig;
}

export function writeConfig(config: ShefConfig): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
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

export function createItem(
  name: string,
  url: string,
  quantity: number
): ShefItem {
  const config = readConfig();

  const newItem: ShefItem = {
    id: generateId(),
    name: name.trim(),
    url: url.trim(),
    quantity: Math.max(1, quantity),
  };

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
    ...updates,
    id, // Ensure ID cannot be changed
  };

  // Validate quantity
  if (updatedItem.quantity < 1) {
    updatedItem.quantity = 1;
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
