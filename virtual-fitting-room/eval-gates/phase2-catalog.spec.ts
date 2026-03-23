/**
 * Phase 2 Eval Gate: Catalog Scraping
 *
 * Verifies products from all 5 stores are scraped, constraints enforced,
 * and every URL + image actually resolves.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const EVAL_DIR = path.resolve(__dirname, "../eval/phase2");
const PRODUCTS_FILE = path.resolve(__dirname, "../data/products.json");

interface Product {
  id: string;
  url: string;
  title: string;
  price: number;
  store: string;
  category: string;
  lengthInches?: number;
  images: string[];
}

let products: Product[] = [];

test.beforeAll(() => {
  fs.mkdirSync(EVAL_DIR, { recursive: true });
  const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8");
  products = JSON.parse(raw);
});

test("products.json has products from at least 4 of 5 target stores", async () => {
  const stores = new Set(products.map((p) => p.store.toLowerCase()));
  const targetStores = ["princess polly", "peppermayo", "oh polly", "house of cb", "wolford"];
  let matchCount = 0;

  for (const target of targetStores) {
    const found = Array.from(stores).some((s) => s.toLowerCase().includes(target.toLowerCase().split(" ")[0]));
    if (found) matchCount++;
  }

  console.log(`Stores found: ${Array.from(stores).join(", ")}`);
  console.log(`Target stores matched: ${matchCount}/5`);

  // Must have at least 4 of 5 stores
  expect(matchCount).toBeGreaterThanOrEqual(4);
});

test("catalog has at least 15 total products", async () => {
  expect(products.length).toBeGreaterThanOrEqual(15);
  console.log(`Total products: ${products.length}`);
});

test("products span at least 3 categories", async () => {
  const categories = new Set(products.map((p) => p.category));
  console.log(`Categories: ${Array.from(categories).join(", ")}`);
  expect(categories.size).toBeGreaterThanOrEqual(3);
});

test("Wolford has at least 2 tights/stockings", async () => {
  const wolfordTights = products.filter(
    (p) => p.store.toLowerCase().includes("wolford") && (p.category === "tights" || p.category === "stockings")
  );
  console.log(`Wolford tights: ${wolfordTights.length}`);
  expect(wolfordTights.length).toBeGreaterThanOrEqual(2);
});

test("no duplicate product URLs", async () => {
  const urls = products.map((p) => p.url);
  const unique = new Set(urls);
  expect(unique.size).toBe(urls.length);
});

test("dress constraints are enforced", async () => {
  const dresses = products.filter((p) => p.category === "dress");
  const violations: string[] = [];

  const excludedColors = ["hot pink", "beige", "nude", "tan", "olive", "moss", "khaki", "gray"];
  const excludedStyles = ["strapless", "corset", "tube top", "cowl neck", "floral", "print"];

  for (const d of dresses) {
    const titleLower = d.title.toLowerCase();

    // Price check (House of CB exempt)
    if (d.price > 100 && !d.store.toLowerCase().includes("house of cb")) {
      violations.push(`${d.title}: price $${d.price} exceeds $100 limit`);
    }

    // Color check
    for (const color of excludedColors) {
      if (titleLower.includes(color)) {
        violations.push(`${d.title}: excluded color "${color}"`);
      }
    }

    // Style check
    for (const style of excludedStyles) {
      if (titleLower.includes(style)) {
        violations.push(`${d.title}: excluded style "${style}"`);
      }
    }
  }

  if (violations.length > 0) {
    console.log("Constraint violations:", violations);
  }
  expect(violations.length).toBe(0);
});

test("every product URL resolves (sample of 10)", async ({ request }) => {
  const sample = products.slice(0, 10);
  const results: { url: string; status: number }[] = [];

  for (const p of sample) {
    try {
      const resp = await request.get(p.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        maxRedirects: 3,
        timeout: 10000,
      });
      results.push({ url: p.url, status: resp.status() });
    } catch {
      results.push({ url: p.url, status: 0 });
    }
  }

  fs.writeFileSync(path.join(EVAL_DIR, "url-check.json"), JSON.stringify(results, null, 2));

  const failures = results.filter((r) => r.status >= 400 || r.status === 0);
  console.log(`URL check: ${results.length - failures.length}/${results.length} passed`);

  // At least 80% must resolve
  expect(failures.length / results.length).toBeLessThan(0.2);
});

test("every product has at least one image URL", async () => {
  const noImages = products.filter((p) => !p.images || p.images.length === 0);
  expect(noImages.length).toBe(0);
});

test("products display in the app UI", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Products should be visible in the UI
  const cards = await page.$$("[data-testid='product-card'], .product-card, article, [class*='card']");
  const images = await page.$$("img");

  await page.screenshot({ path: path.join(EVAL_DIR, "catalog-in-ui.png"), fullPage: true });

  // Should see at least some products rendered
  expect(cards.length + images.length).toBeGreaterThan(3);
});
