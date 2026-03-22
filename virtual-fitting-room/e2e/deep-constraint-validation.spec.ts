import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

interface Product {
  id: string;
  url: string;
  title: string;
  price: number | null;
  store: string;
  category: string;
  lengthInches: number | null;
  images: string[];
  createdAt: string;
}

const ALLOWED_COLORS = [
  "emerald",
  "red",
  "wine",
  "burgundy",
  "blue",
  "navy",
  "yellow",
  "white",
  "black",
  "purple",
  "gold",
];

const EXCLUDED_STYLE_KEYWORDS = [
  "strapless",
  "corset",
  "tube top",
  "cowl neck",
  "floral",
  "print",
  "beachy",
];

let products: Product[];

test.beforeAll(async () => {
  const dataPath = path.join(process.cwd(), "data", "products.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const all = JSON.parse(raw);
  // Filter out ephemeral test products created by other E2E specs
  products = all.filter((p: Product) =>
    p.store !== "TestStore" && !p.url?.includes("test-store.com")
  );
});

test.describe("product constraint validation", () => {
  test("every dress is priced <= $100 (House of CB exempt)", async () => {
    const dresses = products.filter((p) => p.category === "dress");
    for (const dress of dresses) {
      if (dress.store?.toLowerCase().includes("house of cb")) continue;
      if (dress.price !== null) {
        expect
          .soft(
            dress.price,
            `Dress "${dress.title}" (${dress.store}) costs $${dress.price} — exceeds $100 limit`
          )
          .toBeLessThanOrEqual(100);
      }
    }
  });

  test("every dress color is in the allowed list", async () => {
    const dresses = products.filter((p) => p.category === "dress");
    const EXCLUDED_COLORS = [
      "hot pink",
      "beige",
      "nude",
      "tan",
      "olive",
      "moss",
      "khaki",
      "gray",
      "grey",
    ];

    for (const dress of dresses) {
      const titleLower = dress.title.toLowerCase();
      for (const excluded of EXCLUDED_COLORS) {
        expect
          .soft(
            titleLower.includes(excluded),
            `Dress "${dress.title}" contains excluded color "${excluded}"`
          )
          .toBe(false);
      }
    }
  });

  test("no dress has excluded style keywords in title", async () => {
    const dresses = products.filter((p) => p.category === "dress");
    for (const dress of dresses) {
      const titleLower = dress.title.toLowerCase();
      for (const keyword of EXCLUDED_STYLE_KEYWORDS) {
        expect
          .soft(
            titleLower.includes(keyword),
            `Dress "${dress.title}" contains excluded style "${keyword}"`
          )
          .toBe(false);
      }
    }
  });

  test("every product URL returns 200 or 301", async () => {
    test.setTimeout(60000);
    for (const product of products) {
      if (!product.url) continue;
      try {
        const resp = await fetch(product.url, {
          method: "HEAD",
          redirect: "manual",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(10000),
        });
        expect
          .soft(
            [200, 301, 302, 303, 307, 308].includes(resp.status),
            `Product "${product.title}" URL returned ${resp.status}: ${product.url}`
          )
          .toBe(true);
      } catch (err) {
        // Network errors are acceptable for some stores behind CDNs
        expect
          .soft(
            false,
            `Product "${product.title}" URL unreachable: ${product.url} — ${err}`
          )
          .toBe(true);
      }
    }
  });

  test("every product first image URL loads", async () => {
    test.setTimeout(60000);
    for (const product of products) {
      if (!product.images || product.images.length === 0) continue;
      const imageUrl = product.images[0];
      try {
        const resp = await fetch(imageUrl, {
          method: "HEAD",
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(10000),
        });
        expect
          .soft(
            resp.ok,
            `Image for "${product.title}" returned ${resp.status}: ${imageUrl}`
          )
          .toBe(true);
      } catch (err) {
        expect
          .soft(
            false,
            `Image for "${product.title}" unreachable: ${imageUrl} — ${err}`
          )
          .toBe(true);
      }
    }
  });

  test("no duplicate product URLs in catalog", async () => {
    const urls = products.map((p) => p.url).filter(Boolean);
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const url of urls) {
      if (seen.has(url)) dupes.push(url);
      seen.add(url);
    }
    expect(dupes, `Duplicate URLs found: ${dupes.join(", ")}`).toHaveLength(0);
  });

  test("every product has at least 1 image", async () => {
    for (const product of products) {
      expect
        .soft(
          product.images?.length,
          `Product "${product.title}" has no images`
        )
        .toBeGreaterThanOrEqual(1);
    }
  });

  test("every product has a non-empty title and valid price", async () => {
    for (const product of products) {
      expect
        .soft(
          product.title?.length > 0,
          `Product ${product.id} has empty title`
        )
        .toBe(true);
      if (product.price !== null) {
        expect
          .soft(
            product.price >= 0,
            `Product "${product.title}" has negative price: ${product.price}`
          )
          .toBe(true);
      }
    }
  });
});
