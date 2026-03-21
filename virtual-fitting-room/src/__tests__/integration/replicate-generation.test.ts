/**
 * Phase 8: Real Replicate Generation Tests
 *
 * These tests make REAL API calls to Replicate (~$0.05-0.10 per generation).
 * They validate that category-specific prompts produce valid outputs.
 *
 * Run manually: npx vitest run src/__tests__/integration/replicate-generation.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";

// Check if server is reachable before running any tests
const serverAvailable = await fetch("http://localhost:3000/api/products", {
  signal: AbortSignal.timeout(1000),
}).then(() => true).catch(() => false);

const BASE_URL = "http://localhost:3000";

// Real product images from known-working CDNs for each category
const TEST_PRODUCTS = [
  {
    category: "dress",
    title: "Control: Black Mini Dress",
    images: ["https://cdn.shopify.com/s/files/1/0061/8627/0804/files/0-modelinfo-elise-us2_fc1d775e-b4a9-40c4-976f-e6a7e2d5c9f9.jpg?v=1772647646"],
    price: 65,
  },
  {
    category: "shoes",
    title: "Test: Black Strappy Heels",
    images: ["https://cdn.shopify.com/s/files/1/0061/8627/0804/files/0-modelinfo-elise-us2_d13de659-fb69-430f-a08c-2cb5e53e474e.jpg?v=1738637301"],
    price: 89,
  },
  {
    category: "tights",
    title: "Test: Sheer Black Tights",
    images: ["https://cdn.shopify.com/s/files/1/0506/5886/9443/files/CerinaHighNeckMiniDressNavy4Peppermayo.jpg?v=1764654211"],
    price: 35,
  },
  {
    category: "bag",
    title: "Test: Black Evening Clutch",
    images: ["https://cdn.shopify.com/s/files/1/0061/8627/0804/files/1-modelinfo-elise-us2_d497f64c-65af-467d-9454-c7e9ba1de551.jpg?v=1738637301"],
    price: 150,
  },
  {
    category: "accessories",
    title: "Test: Gold Hoop Earrings",
    images: ["https://cdn.shopify.com/s/files/1/0506/5886/9443/files/CerinaHighNeckMiniDressNavy1Peppermayo.jpg?v=1764654211"],
    price: 45,
  },
];

const productIds: Record<string, string> = {};

async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries - 1) throw err;
      // Wait before retry — server may need a moment after heavy generation
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("unreachable");
}

describe.skipIf(!serverAvailable)("real replicate generation", () => {
  beforeAll(async () => {
    // Add test products via API (manual add with title+images, no scraping)
    for (const tp of TEST_PRODUCTS) {
      const resp = await fetchWithRetry(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tp.title,
          images: tp.images,
          price: tp.price,
          store: "TestStore",
          category: tp.category,
          url: `https://test.com/${tp.category}/gen-test`,
        }),
      });
      const product = await resp.json();
      productIds[tp.category] = product.id;
    }
  }, 30000);

  for (const tp of TEST_PRODUCTS) {
    it(
      `generates rendering for ${tp.category} product`,
      async () => {
        const pid = productIds[tp.category];
        expect(pid).toBeDefined();

        const resp = await fetchWithRetry(`${BASE_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: pid }),
        });

        expect(resp.ok).toBe(true);
        const result = await resp.json();

        // Should have generated at least 1 image
        expect(result.generated).toBeGreaterThanOrEqual(1);

        // Check renderings via API — retry in case server is recovering
        const rResp = await fetchWithRetry(`${BASE_URL}/api/generate?productId=${pid}`);
        const renderings = await rResp.json();
        const done = renderings.filter((r: any) => r.status === "done");

        expect(done.length).toBeGreaterThanOrEqual(1);
        expect(done[0].generatedImage).toMatch(/^\/generated\/.+\.jpg$/);

        console.log(`  ✓ ${tp.category}: generated ${done.length} image(s) — ${done[0].generatedImage}`);
      },
      180000 // 3 min timeout per generation
    );
  }
});
