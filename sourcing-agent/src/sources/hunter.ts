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

// Hunter department values that map to product/leadership roles
const DEPARTMENT_FILTERS = ["management", "executive"];

export class HunterClient implements SourceClient {
  name = "hunter";
  private apiKey: string;
  private minConfidence: number;
  private searchesUsed = 0;

  constructor(apiKey: string, minConfidence = 0) {
    this.apiKey = apiKey;
    this.minConfidence = minConfidence;
  }

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
        // Search each department filter separately to maximize relevant results
        const seenEmails = new Set<string>();

        for (const dept of DEPARTMENT_FILTERS) {
          const result = await this.searchDomain(
            domain,
            hunterSeniorities,
            dept,
            profile.maxResultsPerRun ?? 10
          );
          this.searchesUsed++;

          // Dedup across department calls for same domain
          for (const c of result.contacts) {
            if (!seenEmails.has(c.email!)) {
              seenEmails.add(c.email!);
              allContacts.push(c);
            }
          }
          totalAvailable += result.totalAvailable;

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
      creditsUsed: 0,
    };
  }

  private async searchDomain(
    domain: string,
    seniorities: string[],
    department: string,
    limit: number
  ): Promise<SearchResult> {
    const params = new URLSearchParams();
    params.set("domain", domain);
    params.set("api_key", this.apiKey);
    params.set("limit", String(Math.min(limit, 10)));
    params.set("type", "personal");
    params.set("department", department);

    if (seniorities.length === 1) {
      params.set("seniority", seniorities[0]);
    }

    const url = `${API_BASE}/domain-search?${params.toString()}`;
    console.log(`[hunter] Searching ${domain} (dept: ${department})`);

    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Hunter search failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as HunterDomainSearchResponse;
    const emails = data.data.emails ?? [];
    const org = data.data.organization ?? domain;

    // Log what titles came back so we can see what Hunter has
    const titles = emails
      .map((e) => e.position)
      .filter(Boolean);
    console.log(
      `[hunter] ${domain}/${department}: ${emails.length} results — titles: ${titles.length > 0 ? titles.join(", ") : "(none listed)"}`
    );

    // Accept all contacts that have a name — title is in the sheet for review
    const matched = emails.filter((e) => {
      if (!e.first_name && !e.last_name) return false;
      if (e.confidence < this.minConfidence) return false;
      return true;
    });

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
      profileId: e.value,
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
