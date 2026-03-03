import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import type { Contact } from "./sources/types.js";

interface DedupStore {
  seenIds: string[]; // profile IDs (emails for Hunter) we've already processed
  lastUpdated: string;
}

export class DedupTracker {
  private storePath: string;
  private seenIds = new Set<string>();

  constructor(dataDir: string) {
    this.storePath = resolve(dataDir, "seen-contacts.json");
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.storePath, "utf-8");
      const data: DedupStore = JSON.parse(raw);
      this.seenIds = new Set(data.seenIds);
      console.log(`[dedup] Loaded ${this.seenIds.size} seen contact IDs`);
    } catch {
      // File doesn't exist yet, start fresh
      this.seenIds = new Set();
      console.log("[dedup] No existing dedup store, starting fresh");
    }
  }

  /**
   * Filter out contacts we've already seen. Returns only new contacts.
   */
  filterNew(contacts: Contact[]): Contact[] {
    const newContacts = contacts.filter((c) => !this.seenIds.has(c.profileId));
    const dupeCount = contacts.length - newContacts.length;
    if (dupeCount > 0) {
      console.log(`[dedup] Filtered out ${dupeCount} duplicate(s)`);
    }
    return newContacts;
  }

  /**
   * Mark contacts as seen.
   */
  markSeen(contacts: Contact[]): void {
    for (const c of contacts) {
      this.seenIds.add(c.profileId);
    }
  }

  /**
   * Persist the dedup store to disk.
   */
  async save(): Promise<void> {
    await mkdir(dirname(this.storePath), { recursive: true });
    const data: DedupStore = {
      seenIds: [...this.seenIds],
      lastUpdated: new Date().toISOString(),
    };
    await writeFile(this.storePath, JSON.stringify(data, null, 2));
    console.log(`[dedup] Saved ${this.seenIds.size} contact IDs`);
  }
}
