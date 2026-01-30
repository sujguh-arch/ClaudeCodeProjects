/**
 * Search Module - Search Shef dishes by name
 *
 * Note: This module scrapes the Shef website. If the site structure changes,
 * this code may need updates.
 */

import { Page } from "playwright";
import { log } from "../prefill";

export interface SearchResult {
  name: string;
  url: string;
  price?: string;
  chef?: string;
  imageUrl?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  error?: string;
}

/**
 * Search for dishes on Shef
 *
 * @param page - Playwright page (must be logged in)
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 10)
 */
export async function searchDishes(
  page: Page,
  query: string,
  limit: number = 10
): Promise<SearchResponse> {
  log(`Searching for: "${query}"`);

  try {
    // Navigate to Shef search
    const searchUrl = `https://shef.com/search?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for search results to load
    await page.waitForTimeout(3000);

    // Try to find dish cards
    const results: SearchResult[] = [];

    // Strategy 1: Look for dish cards with price buttons
    const dishCards = page.locator('button:has-text("$")');
    const cardCount = await dishCards.count();

    log(`  Found ${cardCount} dish cards`);

    for (let i = 0; i < Math.min(cardCount, limit); i++) {
      try {
        const card = dishCards.nth(i);

        if (!await card.isVisible({ timeout: 500 })) continue;

        // Get dish info
        const text = await card.textContent() || "";

        // Extract price (format: $X.XX)
        const priceMatch = text.match(/\$[\d.]+/);
        const price = priceMatch ? priceMatch[0] : undefined;

        // Get dish name - usually text before the price
        let name = text.replace(/\$[\d.]+.*$/, "").trim();

        // If name is empty or too long, try getting from aria-label
        if (!name || name.length > 100) {
          const ariaLabel = await card.getAttribute("aria-label");
          if (ariaLabel) {
            name = ariaLabel.replace(/\$[\d.]+.*$/, "").trim();
          }
        }

        if (!name || name.length < 3) continue;

        // Get URL - click to get the dish URL
        // Note: We'll construct the URL from the dish name for now
        // This is a simplification - the actual URL would need clicking the card
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        // For now, use search URL as placeholder
        // In production, we'd click the card and capture the navigation URL
        const url = `https://shef.com/search?q=${encodeURIComponent(name)}`;

        results.push({
          name,
          url,
          price,
        });
      } catch (e) {
        log(`  Error parsing card ${i}: ${e}`);
      }
    }

    // If no results from strategy 1, try alternative selectors
    if (results.length === 0) {
      log("  Trying alternative search result parsing...");

      // Strategy 2: Look for links with dish-like content
      const links = page.locator('a[href*="/order/"]');
      const linkCount = await links.count();

      for (let i = 0; i < Math.min(linkCount, limit); i++) {
        try {
          const link = links.nth(i);

          if (!await link.isVisible({ timeout: 500 })) continue;

          const href = await link.getAttribute("href");
          const text = await link.textContent();

          if (!href || !text) continue;

          const name = text.trim();
          if (name.length < 3 || name.length > 100) continue;

          const url = href.startsWith("http")
            ? href
            : `https://shef.com${href}`;

          // Extract price if present
          const priceMatch = text.match(/\$[\d.]+/);
          const price = priceMatch ? priceMatch[0] : undefined;

          results.push({
            name: name.replace(/\$[\d.]+.*$/, "").trim(),
            url,
            price,
          });
        } catch {
          // Continue
        }
      }
    }

    log(`  Returning ${results.length} results`);

    return {
      query,
      results,
    };
  } catch (error) {
    log(`  Search error: ${error}`);
    return {
      query,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get dish details by navigating to its page
 */
export async function getDishDetails(
  page: Page,
  url: string
): Promise<SearchResult | null> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Get dish name from page title or heading
    const title = await page.title();
    const name = title.replace(" - Shef", "").trim();

    // Get price from Add to cart button or price display
    const priceElement = page.locator('button:has-text("$")').first();
    const priceText = await priceElement.textContent().catch(() => null);
    const priceMatch = priceText?.match(/\$[\d.]+/);
    const price = priceMatch ? priceMatch[0] : undefined;

    // Get chef name
    const chefElement = page.locator('text=/Chef [A-Za-z]+/').first();
    const chefText = await chefElement.textContent().catch(() => null);
    const chef = chefText?.replace(/^Chef\s+/, "").trim();

    return {
      name,
      url,
      price,
      chef,
    };
  } catch (error) {
    log(`  Error getting dish details: ${error}`);
    return null;
  }
}

// Test entry point
if (require.main === module) {
  import("./session").then(async ({ launchBrowser, closeBrowser, checkLoginStatus }) => {
    const query = process.argv[2] || "chicken";
    console.log(`\nSearching Shef for: "${query}"\n`);

    const context = await launchBrowser({ headless: false });
    const page = context.pages()[0] || await context.newPage();

    // Check login
    await page.goto("https://shef.com", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const loginStatus = await checkLoginStatus(page);

    if (!loginStatus.loggedIn) {
      console.log("Not logged in. Run 'npm run shef:login' first.");
      await closeBrowser(context);
      process.exit(1);
    }

    // Run search
    const results = await searchDishes(page, query);

    console.log("\nSearch Results:");
    console.log("=".repeat(50));

    if (results.error) {
      console.log(`Error: ${results.error}`);
    } else if (results.results.length === 0) {
      console.log("No results found.");
    } else {
      results.results.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.name}`);
        console.log(`   Price: ${r.price || "N/A"}`);
        console.log(`   URL: ${r.url}`);
      });
    }

    console.log("\n[Browser left open for inspection. Press Ctrl+C to exit.]");
  }).catch((err) => {
    console.error("Search failed:", err.message);
    process.exit(1);
  });
}
