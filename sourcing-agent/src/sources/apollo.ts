import {
  type Contact,
  type SearchProfile,
  type SearchResult,
  type SourceClient,
} from "./types.js";

const API_BASE = "https://api.apollo.io/api/v1";

interface ApolloPersonRaw {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  headline: string;
  linkedin_url: string;
  email: string | null;
  email_status: string | null;
  organization?: {
    id: string;
    name: string;
    website_url: string;
  };
  city: string | null;
  state: string | null;
  country: string | null;
  seniority: string;
}

interface ApolloSearchResponse {
  people: ApolloPersonRaw[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

interface ApolloBulkMatchResponse {
  status: string;
  matches: Array<{
    id: string;
    first_name: string;
    last_name: string;
    name: string;
    title: string;
    linkedin_url: string;
    email: string | null;
    organization?: { name: string };
    city: string | null;
    state: string | null;
    country: string | null;
    seniority: string;
  }>;
  credits_consumed: number;
}

// Map our seniority levels to Apollo's API values
const SENIORITY_MAP: Record<string, string> = {
  director: "director",
  vp: "vp",
  c_suite: "c_suite",
  senior: "senior",
  manager: "manager",
};

export class ApolloClient implements SourceClient {
  name = "apollo";
  private apiKey: string;
  private maxCreditsPerDay: number;
  private creditsUsedToday = 0;

  constructor(apiKey: string, maxCreditsPerDay = 10) {
    this.apiKey = apiKey;
    this.maxCreditsPerDay = maxCreditsPerDay;
  }

  /**
   * Search for people matching a profile. This endpoint is FREE (no credits).
   * However, it does NOT return emails. We enrich separately.
   */
  async search(profile: SearchProfile, page = 1): Promise<SearchResult> {
    const perPage = Math.min(profile.maxResultsPerRun ?? 25, 100);

    // Build query parameters
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    for (const title of profile.titles) {
      params.append("person_titles[]", title);
    }
    for (const seniority of profile.seniorities) {
      const mapped = SENIORITY_MAP[seniority] ?? seniority;
      params.append("person_seniorities[]", mapped);
    }
    for (const company of profile.companies) {
      params.append("q_organization_domains_list[]", company);
    }
    if (profile.locations) {
      for (const loc of profile.locations) {
        params.append("person_locations[]", loc);
      }
    }

    const url = `${API_BASE}/mixed_people/api_search?${params.toString()}`;
    console.log(`[apollo] Searching: ${profile.name} (page ${page})`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": this.apiKey,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Apollo search failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as ApolloSearchResponse;
    const people = data.people ?? [];

    console.log(
      `[apollo] Found ${people.length} people (${data.pagination.total_entries} total)`
    );

    // Convert to our Contact format (no emails yet)
    const contacts: Contact[] = people.map((p) => ({
      id: `apollo-${p.id}`,
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      fullName: p.name ?? `${p.first_name} ${p.last_name}`,
      title: p.title ?? "",
      company: p.organization?.name ?? "",
      email: null, // Search doesn't return emails
      linkedinUrl: p.linkedin_url ?? null,
      seniority: p.seniority ?? "",
      city: p.city ?? null,
      state: p.state ?? null,
      country: p.country ?? null,
      foundAt: new Date().toISOString(),
      source: "apollo",
      profileId: p.id,
    }));

    return {
      contacts,
      totalAvailable: data.pagination.total_entries,
      creditsUsed: 0, // Search is free
    };
  }

  /**
   * Enrich contacts with email addresses using Bulk People Enrichment.
   * Costs 1 credit per person. Max 10 per call.
   */
  async enrichEmails(contacts: Contact[]): Promise<Contact[]> {
    if (contacts.length === 0) return [];

    const remaining = this.maxCreditsPerDay - this.creditsUsedToday;
    if (remaining <= 0) {
      console.log(
        `[apollo] Daily credit limit reached (${this.maxCreditsPerDay}). Skipping enrichment.`
      );
      return contacts;
    }

    // Only enrich up to our daily budget
    const toEnrich = contacts.slice(0, Math.min(contacts.length, remaining));
    const enriched: Contact[] = [];

    // Process in batches of 10 (API limit)
    for (let i = 0; i < toEnrich.length; i += 10) {
      const batch = toEnrich.slice(i, i + 10);
      const details = batch.map((c) => ({
        id: c.profileId,
        first_name: c.firstName,
        last_name: c.lastName,
        organization_name: c.company,
      }));

      console.log(
        `[apollo] Enriching batch ${Math.floor(i / 10) + 1} (${batch.length} people)`
      );

      const res = await fetch(`${API_BASE}/people/bulk_match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          details,
          reveal_personal_emails: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`[apollo] Enrichment failed (${res.status}): ${body}`);
        // Return what we have so far, don't lose search results
        enriched.push(...batch);
        continue;
      }

      const data = (await res.json()) as ApolloBulkMatchResponse;
      this.creditsUsedToday += data.credits_consumed;
      console.log(
        `[apollo] Credits used: ${data.credits_consumed} (total today: ${this.creditsUsedToday}/${this.maxCreditsPerDay})`
      );

      // Merge enriched data back into contacts
      const matchMap = new Map(data.matches.map((m) => [m.id, m]));
      for (const contact of batch) {
        const match = matchMap.get(contact.profileId);
        if (match?.email) {
          contact.email = match.email;
        }
        enriched.push(contact);
      }

      // Rate limit: small delay between batches
      if (i + 10 < toEnrich.length) {
        await sleep(1000);
      }
    }

    // Append any contacts we didn't enrich due to budget
    const skipped = contacts.slice(toEnrich.length);
    if (skipped.length > 0) {
      console.log(
        `[apollo] Skipped enrichment for ${skipped.length} contacts (credit limit)`
      );
    }

    return [...enriched, ...skipped];
  }

  resetDailyCredits(): void {
    this.creditsUsedToday = 0;
  }

  get creditsRemaining(): number {
    return this.maxCreditsPerDay - this.creditsUsedToday;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
