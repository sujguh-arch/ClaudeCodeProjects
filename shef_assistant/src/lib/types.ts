// Shared TypeScript types for Shef Assistant

export interface ShefItem {
  id: string;
  name: string;
  url: string;
  quantity: number;
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

// Validation helpers
export function isValidShefUrl(url: string): boolean {
  return url.startsWith("https://shef.com/");
}

export function generateId(): string {
  return crypto.randomUUID();
}
