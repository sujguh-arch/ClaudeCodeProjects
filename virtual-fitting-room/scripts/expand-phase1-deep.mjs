#!/usr/bin/env node
/**
 * Deep pagination script — fetches pages 2+ from Princess Polly & Peppermayo
 * Shopify collection APIs. Phase 1 only got page 1 (limit=50). This goes deeper.
 *
 * Enforces ALL CLAUDE.md constraints: colors, styles, prices, lengths, shoe size 5.
 * Deduplicates against existing products.json. 2s delay between requests.
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Constraint constants ──────────────────────────────────────────────
const ALLOWED_COLORS = [
  "emerald", "red", "wine", "burgundy", "blue", "navy",
  "yellow", "white", "black", "purple", "gold",
];
const EXCLUDED_COLORS = [
  "hot pink", "pink", "beige", "nude", "tan", "olive",
  "moss", "khaki", "gray", "grey", "brown", "orange",
  "coral", "peach", "sage", "cream", "taupe", "mocha",
  "camel", "latte", "stone", "oat", "sand",
];
const STYLE_EXCLUSIONS = [
  "strapless", "corset", "tube top", "tube dress", "cowl neck",
  "floral", "print", "printed", "flower", "tropical", "botanical",
  "beachy", "beach", "crochet",
];
const MAX_PRICE = 100;
const DRESS_LENGTH_LIMITS = { mini: 26, midi: 38, maxi: 48 };

// ── Helpers ───────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`${resp.status} fetching ${url}`);
  return resp.json();
}

function detectColor(title) {
  const t = title.toLowerCase();
  for (const c of EXCLUDED_COLORS) {
    if (t.includes(c)) return { color: c, allowed: false };
  }
  for (const c of ALLOWED_COLORS) {
    if (t.includes(c)) return { color: c, allowed: true };
  }
  return { color: null, allowed: false };
}

function hasStyleExclusion(title, tags) {
  const text = `${title} ${(tags || []).join(" ")}`.toLowerCase();
  return STYLE_EXCLUSIONS.some((ex) => text.includes(ex));
}

function detectDressLength(title, bodyHtml) {
  const t = title.toLowerCase();
  const text = `${t} ${(bodyHtml || "").toLowerCase()}`;
  if (t.includes("mini")) return "mini";
  if (t.includes("midi")) return "midi";
  if (t.includes("maxi")) return "maxi";
  if (text.includes("mini")) return "mini";
  if (text.includes("midi")) return "midi";
  if (text.includes("maxi")) return "maxi";
  return null;
}

function extractLengthInches(bodyHtml) {
  if (!bodyHtml) return null;
  const patterns = [
    /(?:garment\s+)?length[:\s]*(\d+(?:\.\d+)?)\s*(?:in|inches|")/i,
    /(?:garment\s+)?length[:\s]*(\d+(?:\.\d+)?)\s*cm/i,
  ];
  for (const pat of patterns) {
    const m = bodyHtml.match(pat);
    if (m) {
      let val = parseFloat(m[1]);
      if (pat.source.includes("cm")) val = val / 2.54;
      return val;
    }
  }
  return null;
}

function mapCategory(collectionHandle) {
  if (collectionHandle.includes("dress")) return "dress";
  if (collectionHandle.includes("shoe") || collectionHandle.includes("heel") || collectionHandle.includes("boot")) return "shoes";
  if (collectionHandle.includes("bag") || collectionHandle.includes("purse")) return "bag";
  if (collectionHandle.includes("jewel") || collectionHandle.includes("accessor") || collectionHandle.includes("earring") || collectionHandle.includes("necklace")) return "accessories";
  return "other";
}

function getProductImages(product) {
  if (!product.images || product.images.length === 0) return [];
  return product.images
    .map((img) => (typeof img === "string" ? img : img.src))
    .filter(Boolean)
    .slice(0, 6);
}

function getPrice(product) {
  if (product.variants && product.variants.length > 0) {
    const p = parseFloat(product.variants[0].price);
    if (!isNaN(p)) return p;
  }
  return null;
}

// ── Store configs with deep pagination ────────────────────────────────
const FETCH_TASKS = [
  // Princess Polly — deeper pages
  { domain: "us.princesspolly.com", store: "Princess Polly", collection: "dresses", pages: [2, 3] },
  { domain: "us.princesspolly.com", store: "Princess Polly", collection: "shoes", pages: [2] },
  { domain: "us.princesspolly.com", store: "Princess Polly", collection: "bags", pages: [2] },
  { domain: "us.princesspolly.com", store: "Princess Polly", collection: "jewellery", pages: [2, 3] },
  { domain: "us.princesspolly.com", store: "Princess Polly", collection: "accessories", pages: [2] },

  // Peppermayo — deeper pages
  { domain: "us.peppermayo.com", store: "Peppermayo", collection: "dresses", pages: [2, 3, 4] },
  { domain: "us.peppermayo.com", store: "Peppermayo", collection: "bags", pages: [2] },
  { domain: "us.peppermayo.com", store: "Peppermayo", collection: "accessories", pages: [2] },
  { domain: "us.peppermayo.com", store: "Peppermayo", collection: "jewellery", pages: [2, 3] },
];

// ── Filter a single product ──────────────────────────────────────────
function filterProduct(p, category, storeName, domain) {
  const title = p.title || "";
  const price = getPrice(p);
  const images = getProductImages(p);
  const handle = p.handle;
  const productUrl = `https://${domain}/products/${handle}`;

  if (images.length === 0 || price === null) return null;
  if (price > MAX_PRICE) return null;

  const { allowed: colorOk } = detectColor(title);
  if (!colorOk) return null;

  if (hasStyleExclusion(title, p.tags)) return null;

  if (category === "dress") {
    const lengthLabel = detectDressLength(title, p.body_html);
    if (!lengthLabel) return null;

    const lengthInches = extractLengthInches(p.body_html);
    const limit = DRESS_LENGTH_LIMITS[lengthLabel];
    if (lengthInches !== null && lengthInches >= limit) return null;

    return {
      id: randomUUID(),
      url: productUrl,
      title,
      price,
      store: storeName,
      category,
      lengthLabel,
      lengthInches: lengthInches || null,
      images,
      createdAt: new Date().toISOString(),
    };
  }

  if (category === "shoes") {
    const hasSize5 = p.variants?.some(
      (v) => v.title === "5" || v.option1 === "5" || v.option2 === "5"
    );
    const text = `${title} ${(p.tags || []).join(" ")}`.toLowerCase();
    const isOneSize = text.includes("one size") || text.includes("os");
    if (!hasSize5 && !isOneSize) return null;

    return {
      id: randomUUID(),
      url: productUrl,
      title,
      price,
      store: storeName,
      category,
      images,
      createdAt: new Date().toISOString(),
    };
  }

  // accessories, bag, other
  return {
    id: randomUUID(),
    url: productUrl,
    title,
    price,
    store: storeName,
    category,
    images,
    createdAt: new Date().toISOString(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log("=== Deep Pagination Catalog Expansion (Phase 1) ===\n");

  const existing = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  const existingUrls = new Set(existing.map((p) => p.url));
  console.log(`Existing products: ${existing.length}`);

  const allNew = [];
  const newUrls = new Set();
  const summary = {};
  let rejected = { noImage: 0, noPrice: 0, overBudget: 0, badColor: 0, badStyle: 0, noDressLength: 0, dressLengthFail: 0, noSize5: 0, duplicate: 0 };

  for (const task of FETCH_TASKS) {
    const category = mapCategory(task.collection);

    for (const page of task.pages) {
      const url = `https://${task.domain}/collections/${task.collection}/products.json?limit=50&page=${page}`;
      const key = `${task.store} / ${task.collection} p${page}`;
      console.log(`\nFetching ${url}`);

      let data;
      try {
        data = await fetchJSON(url);
      } catch (err) {
        console.log(`  SKIP: ${err.message}`);
        summary[key] = { raw: 0, passed: 0, added: 0 };
        await sleep(2000);
        continue;
      }

      const products = data.products || [];
      if (products.length === 0) {
        console.log(`  Empty page — no more products.`);
        summary[key] = { raw: 0, passed: 0, added: 0 };
        await sleep(2000);
        continue;
      }

      console.log(`  Got ${products.length} raw products`);

      let passed = 0;
      let added = 0;

      for (const p of products) {
        const result = filterProduct(p, category, task.store, task.domain);
        if (!result) continue;
        passed++;

        // Dedup against existing and this run
        if (existingUrls.has(result.url) || newUrls.has(result.url)) {
          rejected.duplicate++;
          continue;
        }

        newUrls.add(result.url);
        allNew.push(result);
        added++;
      }

      summary[key] = { raw: products.length, passed, added };
      console.log(`  Passed filters: ${passed}, New (deduped): ${added}`);

      await sleep(2000);
    }
  }

  // Merge and save
  const merged = [...existing, ...allNew];
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(merged, null, 2) + "\n");

  // Verify JSON roundtrip
  const verify = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  if (verify.length !== merged.length) {
    console.error("JSON VERIFICATION FAILED!");
    process.exit(1);
  }
  console.log("\nJSON verification passed.");

  // Summary
  console.log("\n=== SUMMARY ===");
  console.log(`Products before: ${existing.length}`);
  console.log(`New products added: ${allNew.length}`);
  console.log(`Total products now: ${merged.length}`);
  console.log(`Duplicates skipped: ${rejected.duplicate}`);

  console.log("\nBreakdown by fetch:");
  for (const [key, val] of Object.entries(summary)) {
    console.log(`  ${key}: ${val.raw} raw -> ${val.passed} passed -> ${val.added} new`);
  }

  const catCounts = {};
  for (const p of allNew) {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  }
  console.log("\nNew products by category:");
  for (const [cat, count] of Object.entries(catCounts)) {
    console.log(`  ${cat}: ${count}`);
  }

  const storeCounts = {};
  for (const p of allNew) {
    storeCounts[p.store] = (storeCounts[p.store] || 0) + 1;
  }
  console.log("\nNew products by store:");
  for (const [store, count] of Object.entries(storeCounts)) {
    console.log(`  ${store}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
