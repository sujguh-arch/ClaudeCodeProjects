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
