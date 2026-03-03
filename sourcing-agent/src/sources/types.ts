export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  company: string;
  email: string | null;
  linkedinUrl: string | null;
  seniority: string;
  city: string | null;
  state: string | null;
  country: string | null;
  foundAt: string; // ISO date string
  source: string; // e.g. "apollo"
  profileId: string; // source-specific ID for dedup
}

export interface SearchProfile {
  name: string;
  companies: string[];
  titles: string[];
  seniorities: SeniorityLevel[];
  locations?: string[];
  maxResultsPerRun?: number;
}

export type SeniorityLevel =
  | "director"
  | "vp"
  | "c_suite"
  | "senior"
  | "manager";

export interface SearchResult {
  contacts: Contact[];
  totalAvailable: number;
  creditsUsed: number;
}

export interface SourceClient {
  name: string;
  search(profile: SearchProfile, page?: number): Promise<SearchResult>;
}

export interface AgentConfig {
  apollo: {
    apiKey: string;
    maxCreditsPerDay: number;
  };
  sheets: {
    spreadsheetId: string;
    credentialsPath: string;
  };
  schedule: {
    cronExpression: string;
    timezone: string;
  };
  dataDir: string;
}
