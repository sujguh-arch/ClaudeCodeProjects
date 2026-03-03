import {
  type Contact,
  type SearchProfile,
  type SearchResult,
  type SourceClient,
} from "./types.js";

const API_BASE = "https://api.hunter.io/v2";

interface HunterEmail {
  value: string;
  type: "personal" | "generic";
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  seniority: string | null;
  department: string | null;
  linkedin: string | null;
  twitter: string | null;
  phone_number: string | null;
  verification: {
    date: string | null;
    status: "valid" | "invalid" | "accept_all" | null;
  } | null;
}

interface HunterDomainSearchResponse {
  data: {
    domain: string;
    organization: string;
    emails: HunterEmail[];
  };
  meta: {
    results: number;
    limit: number;
    offset: number;
  };
}

// Map our seniority levels to Hunter's values: junior, senior, executive
const SENIORITY_MAP: Record<string, string> = {
  director: "senior",
  vp: "executive",
  c_suite: "executive",
  senior: "senior",
  manager: "senior",
};

/**
 * Check if a contact's position matches any of the desired title keywords.
 * Uses case-insensitive substring matching.
 */
function matchesTitle(position: string | null, titles: string[]): boolean {
  if (!position) return false;
  const posLower = position.toLowerCase();
  return titles.some((t) => posLower.includes(t.toLowerCase()));
}

export class HunterClient implements SourceClient {
  name = "hunter";
  private apiKey: string;
  private minConfidence: number;
  private searchesUsed = 0;

  constructor(apiKey: string, minConfidence = 0) {
    this.apiKey = apiKey;
    this.minConfidence = minConfidence;
  }

  /**
   * Search for people at companies matching a profile.
   * Hunter Domain Search returns emails directly — no separate enrichment needed.
   * One API call per domain.
   */
  async search(profile: SearchProfile): Promise<SearchResult> {
    const allContacts: Contact[] = [];
    let totalAvailable = 0;

    // Deduplicate seniority values for the API
    const hunterSeniorities = [
      ...new Set(
        profile.seniorities.map((s) => SENIORITY_MAP[s] ?? "senior")
      ),
    ];

    for (const domain of profile.companies) {
      try {
        const contacts = await this.searchDomain(
          domain,
          hunterSeniorities,
          profile.titles,
          profile.maxResultsPerRun ?? 10
        );
        allContacts.push(...contacts.contacts);
        totalAvailable += contacts.totalAvailable;
        this.searchesUsed++;

        // Rate limit: small delay between domain calls
        if (profile.companies.indexOf(domain) < profile.companies.length - 1) {
          await sleep(500);
        }
      } catch (err) {
        console.error(`[hunter] Error searching ${domain}:`, err);
      }
    }

    console.log(
      `[hunter] Total: ${allContacts.length} contacts across ${profile.companies.length} domains (${this.searchesUsed} API calls used)`
    );

    return {
      contacts: allContacts,
      totalAvailable,
      creditsUsed: 0, // Domain Search is free (counts against monthly search quota)
    };
  }

  private async searchDomain(
    domain: string,
    seniorities: string[],
    titles: string[],
    limit: number
  ): Promise<SearchResult> {
    const params = new URLSearchParams();
    params.set("domain", domain);
    params.set("api_key", this.apiKey);
    params.set("limit", String(Math.min(limit, 100)));
    params.set("type", "personal"); // Skip generic emails like info@

    // Hunter accepts one seniority per request, but we can pass comma-separated
    // Actually Hunter only supports one seniority value, so use the broadest
    // We'll do client-side title filtering for accuracy
    if (seniorities.length === 1) {
      params.set("seniority", seniorities[0]);
    }
    // If multiple seniorities, skip the filter and rely on title matching

    const url = `${API_BASE}/domain-search?${params.toString()}`;
    console.log(`[hunter] Searching domain: ${domain}`);

    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Hunter search failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as HunterDomainSearchResponse;
    const emails = data.data.emails ?? [];
    const org = data.data.organization ?? domain;

    console.log(
      `[hunter] ${domain}: ${emails.length} results (${data.meta.results} total available)`
    );

    // Filter by title accuracy (client-side)
    const matched = emails.filter((e) => {
      // Must have a name
      if (!e.first_name && !e.last_name) return false;
      // Must meet confidence threshold
      if (e.confidence < this.minConfidence) return false;
      // Must match at least one desired title (if titles specified)
      if (titles.length > 0 && !matchesTitle(e.position, titles)) return false;
      return true;
    });

    if (matched.length < emails.length) {
      console.log(
        `[hunter] ${domain}: ${matched.length}/${emails.length} matched title filter`
      );
    }

    const contacts: Contact[] = matched.map((e) => ({
      id: `hunter-${domain}-${e.value}`,
      firstName: e.first_name ?? "",
      lastName: e.last_name ?? "",
      fullName: [e.first_name, e.last_name].filter(Boolean).join(" "),
      title: e.position ?? "",
      company: org,
      email: e.value,
      linkedinUrl: e.linkedin ? `https://linkedin.com${e.linkedin}` : null,
      seniority: e.seniority ?? "",
      city: null,
      state: null,
      country: null,
      foundAt: new Date().toISOString(),
      source: "hunter",
      profileId: e.value, // Email is the unique ID for Hunter
      confidence: e.confidence,
      verificationStatus: e.verification?.status ?? null,
    }));

    return {
      contacts,
      totalAvailable: data.meta.results,
      creditsUsed: 0,
    };
  }

  get searchesRemaining(): string {
    return `${this.searchesUsed} searches used this session`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
