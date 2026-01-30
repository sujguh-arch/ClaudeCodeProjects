// Shared TypeScript types for Shef Assistant

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_ABBREVIATIONS: Record<DayOfWeek, string> = {
  monday: "M",
  tuesday: "T",
  wednesday: "W",
  thursday: "Th",
  friday: "F",
  saturday: "Sa",
  sunday: "Su",
};

export interface ShefItem {
  id: string;
  name: string;
  url: string;
  quantity: number;
  // Optional extended fields (backward compatible)
  availableDays?: DayOfWeek[];
  preferredPortion?: string;
  tags?: string[];
}

export interface ShefConfig {
  shefHomeUrl: string;
  cartUrl: string;
  items: ShefItem[];
}

export interface AutomationStatus {
  status: "idle" | "running" | "success" | "error";
  message: string;
  logs: string[];
}

export interface AvailabilityResult {
  name: string;
  url: string;
  available: boolean;
  reason?: string; // "Sold out", "Button disabled", "Error: 404", etc.
}

export interface AvailabilityCheckResponse {
  available: ShefItem[];
  unavailable: Array<{
    item: ShefItem;
    reason: string;
  }>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  time: string; // HH:MM format
  days: DayOfWeek[];
  lastRun?: string; // ISO timestamp
}

// Validation helpers
export function isValidShefUrl(url: string): boolean {
  return url.startsWith("https://shef.com/");
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function isValidDayOfWeek(day: string): day is DayOfWeek {
  return DAYS_OF_WEEK.includes(day as DayOfWeek);
}

export function validateDays(days: unknown): DayOfWeek[] | undefined {
  if (!Array.isArray(days)) return undefined;
  const validDays = days.filter(isValidDayOfWeek);
  return validDays.length > 0 ? validDays : undefined;
}

const DAY_MAP: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getCurrentDayOfWeek(): DayOfWeek {
  const dayIndex = new Date().getDay();
  // JS getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  return DAY_MAP[dayIndex];
}

export function getTomorrowDayOfWeek(): DayOfWeek {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return DAY_MAP[tomorrow.getDay()];
}

export function getTomorrowDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

export function isAvailableToday(item: ShefItem): boolean {
  if (!item.availableDays || item.availableDays.length === 0) {
    return true; // No restriction = available every day
  }
  return item.availableDays.includes(getCurrentDayOfWeek());
}
