/**
 * Reminder Service - Food reminder scheduling
 *
 * Handles reminder configuration and trigger logic for "Am I out of food?" notifications.
 */

import * as fs from "fs";
import * as path from "path";
import type { DayOfWeek } from "./types";
import { DAYS_OF_WEEK, getCurrentDayOfWeek } from "./types";

export interface ReminderConfig {
  enabled: boolean;
  time: string; // HH:MM format (24-hour)
  days: DayOfWeek[];
  browserNotification: boolean;
  lastTriggered?: string; // ISO timestamp
}

const REMINDER_CONFIG_PATH = path.join(process.cwd(), "data", "reminder.json");

function getDefaultReminderConfig(): ReminderConfig {
  return {
    enabled: false,
    time: "09:00",
    days: ["monday", "wednesday", "friday"],
    browserNotification: true,
  };
}

function ensureDataDir(): void {
  const dataDir = path.dirname(REMINDER_CONFIG_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function readReminderConfig(): ReminderConfig {
  ensureDataDir();

  try {
    if (!fs.existsSync(REMINDER_CONFIG_PATH)) {
      const defaultConfig = getDefaultReminderConfig();
      fs.writeFileSync(
        REMINDER_CONFIG_PATH,
        JSON.stringify(defaultConfig, null, 2) + "\n"
      );
      return defaultConfig;
    }

    const content = fs.readFileSync(REMINDER_CONFIG_PATH, "utf-8");
    const config = JSON.parse(content) as ReminderConfig;

    // Validate and fill defaults for missing fields
    return {
      enabled: config.enabled ?? false,
      time: isValidTime(config.time) ? config.time : "09:00",
      days: validateReminderDays(config.days) ?? ["monday", "wednesday", "friday"],
      browserNotification: config.browserNotification ?? true,
      lastTriggered: config.lastTriggered,
    };
  } catch (error) {
    console.error(
      "Failed to read reminder config:",
      error instanceof Error ? error.message : String(error)
    );
    return getDefaultReminderConfig();
  }
}

export function writeReminderConfig(config: ReminderConfig): void {
  ensureDataDir();

  // Validate before writing
  const validatedConfig: ReminderConfig = {
    enabled: !!config.enabled,
    time: isValidTime(config.time) ? config.time : "09:00",
    days: validateReminderDays(config.days) ?? ["monday", "wednesday", "friday"],
    browserNotification: config.browserNotification ?? true,
    lastTriggered: config.lastTriggered,
  };

  fs.writeFileSync(
    REMINDER_CONFIG_PATH,
    JSON.stringify(validatedConfig, null, 2) + "\n"
  );
}

export function updateReminderConfig(
  updates: Partial<ReminderConfig>
): ReminderConfig {
  const current = readReminderConfig();
  const updated: ReminderConfig = {
    ...current,
    ...updates,
  };

  // Validate time
  if (updates.time !== undefined && !isValidTime(updates.time)) {
    updated.time = current.time;
  }

  // Validate days
  if (updates.days !== undefined) {
    const validDays = validateReminderDays(updates.days);
    updated.days = validDays ?? current.days;
  }

  writeReminderConfig(updated);
  return updated;
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidTime(time: string): boolean {
  if (!time || typeof time !== "string") return false;
  const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return !!match;
}

function validateReminderDays(days: unknown): DayOfWeek[] | null {
  if (!Array.isArray(days)) return null;
  const validDays = days.filter((d): d is DayOfWeek =>
    DAYS_OF_WEEK.includes(d as DayOfWeek)
  );
  return validDays.length > 0 ? validDays : null;
}

// ============================================================================
// Reminder Trigger Logic
// ============================================================================

export function shouldTriggerReminder(config: ReminderConfig): boolean {
  if (!config.enabled) return false;
  if (config.days.length === 0) return false;

  const now = new Date();
  const today = getCurrentDayOfWeek();

  // Check if today is a reminder day
  if (!config.days.includes(today)) return false;

  // Parse reminder time
  const [hours, minutes] = config.time.split(":").map(Number);
  const reminderTime = new Date(now);
  reminderTime.setHours(hours, minutes, 0, 0);

  // Check if current time is within 5 minutes after reminder time
  const diffMs = now.getTime() - reminderTime.getTime();
  const fiveMinutesMs = 5 * 60 * 1000;

  if (diffMs < 0 || diffMs > fiveMinutesMs) return false;

  // Check if already triggered today
  if (config.lastTriggered) {
    const lastTriggeredDate = new Date(config.lastTriggered);
    const isSameDay =
      lastTriggeredDate.toDateString() === now.toDateString();
    if (isSameDay) return false;
  }

  return true;
}

export function getNextReminderTime(config: ReminderConfig): Date | null {
  if (!config.enabled || config.days.length === 0) return null;

  const now = new Date();
  const [hours, minutes] = config.time.split(":").map(Number);

  // Find the next occurrence
  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysAhead);
    targetDate.setHours(hours, minutes, 0, 0);

    // Get day of week for target date
    const dayIndex = targetDate.getDay();
    const dayMap: DayOfWeek[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const targetDay = dayMap[dayIndex];

    // Check if this day is in the reminder days
    if (config.days.includes(targetDay)) {
      // If it's today, only return if the time hasn't passed
      if (daysAhead === 0 && targetDate <= now) {
        continue;
      }
      return targetDate;
    }
  }

  return null;
}

export function markReminderTriggered(): void {
  const config = readReminderConfig();
  config.lastTriggered = new Date().toISOString();
  writeReminderConfig(config);
}

// ============================================================================
// Time Formatting Helpers
// ============================================================================

export function formatTime12Hour(time24: string): string {
  if (!isValidTime(time24)) return time24;

  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function formatTime24Hour(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}
