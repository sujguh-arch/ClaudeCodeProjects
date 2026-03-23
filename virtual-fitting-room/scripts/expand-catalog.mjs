#!/usr/bin/env node
/**
 * Catalog expansion script — scrapes Princess Polly & Peppermayo Shopify APIs
 * and merges qualifying products into data/products.json.
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
const MAX_PRICE = 100; // House of CB exempt but not scraped here
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
  // No recognized color — reject to be safe
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
  // Check body HTML for length keywords
  if (text.includes("mini")) return "mini";
  if (text.includes("midi")) return "midi";
  if (text.includes("maxi")) return "maxi";
  return null;
}

function extractLengthInches(bodyHtml) {
  if (!bodyHtml) return null;
  // Look for patterns like "Length: 24.5" or "length 24.5in" or "garment length: 24.5"
  const patterns = [
    /(?:garment\s+)?length[:\s]*(\d+(?:\.\d+)?)\s*(?:in|inches|")/i,
    /(?:garment\s+)?length[:\s]*(\d+(?:\.\d+)?)\s*cm/i,
  ];
  for (const pat of patterns) {
    const m = bodyHtml.match(pat);
    if (m) {
      let val = parseFloat(m[1]);
      if (pat.source.includes("cm")) val = val / 2.54; // convert cm to inches
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

// ── Store configs ─────────────────────────────────────────────────────
const STORES = [
  {
    name: "Princess Polly",
    domain: "us.princesspolly.com",
    collections: ["dresses", "shoes", "bags", "accessories", "jewellery"],
  },
  {
    name: "Peppermayo",
    domain: "us.peppermayo.com",
    collections: ["dresses", "bags", "accessories", "jewellery"],
  },
];

// ── Main scraping logic ───────────────────────────────────────────────
async function scrapeCollection(domain, storeName, collection) {
  const category = mapCategory(collection);
  const url = `https://${domain}/collections/${collection}/products.json?limit=50`;
  console.log(`  Fetching ${url}`);

  let data;
  try {
    data = await fetchJSON(url);
  } catch (err) {
    console.log(`  ⚠ Failed: ${err.message}`);
    return [];
  }

  const products = data.products || [];
  console.log(`  Got ${products.length} raw products`);
  const accepted = [];

  for (const p of products) {
    const title = p.title || "";
    const price = getPrice(p);
    const images = getProductImages(p);
    const handle = p.handle;
    const productUrl = `https://${domain}/products/${handle}`;

    // Skip if no images or no price
    if (images.length === 0 || price === null) continue;

    // Price check
    if (price > MAX_PRICE) continue;

    // Color check
    const { allowed: colorOk } = detectColor(title);
    if (!colorOk) continue;

    // Style exclusion check
    if (hasStyleExclusion(title, p.tags)) continue;

    // Category-specific checks
    if (category === "dress") {
      const lengthLabel = detectDressLength(title, p.body_html);
      if (!lengthLabel) continue; // Must have a length label

      const lengthInches = extractLengthInches(p.body_html);
      const limit = DRESS_LENGTH_LIMITS[lengthLabel];

      // If we have measurements, enforce the limit
      if (lengthInches !== null && lengthInches >= limit) continue;

      // If labeled mini but no measurement, allow (trust label from these stores)
      accepted.push({
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
      });
    } else if (category === "shoes") {
      // Only include if title/tags suggest size 5 availability or one-size
      const text = `${title} ${(p.tags || []).join(" ")}`.toLowerCase();
      const hasSize5 = p.variants?.some(
        (v) => v.title === "5" || v.option1 === "5" || v.option2 === "5"
      );
      const isOneSize = text.includes("one size") || text.includes("os");
      if (!hasSize5 && !isOneSize) continue;

      accepted.push({
        id: randomUUID(),
        url: productUrl,
        title,
        price,
        store: storeName,
        category,
        images,
        createdAt: new Date().toISOString(),
      });
    } else {
      // accessories, bag, other
      accepted.push({
        id: randomUUID(),
        url: productUrl,
        title,
        price,
        store: storeName,
        category,
        images,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return accepted;
}

async function main() {
  console.log("=== Catalog Expansion Script ===\n");

  // Load existing products
  const existing = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  const existingUrls = new Set(existing.map((p) => p.url));
  console.log(`Existing products: ${existing.length}`);

  const allNew = [];
  const summary = {};

  for (const store of STORES) {
    console.log(`\n--- ${store.name} (${store.domain}) ---`);
    for (const collection of store.collections) {
      const products = await scrapeCollection(
        store.domain,
        store.name,
        collection
      );

      // Dedup against existing and against already-added
      const deduped = products.filter((p) => {
        if (existingUrls.has(p.url)) return false;
        // Also check if we already added this URL in this run
        if (allNew.some((n) => n.url === p.url)) return false;
        return true;
      });

      const key = `${store.name} / ${collection}`;
      summary[key] = { scraped: products.length, added: deduped.length };
      console.log(
        `  ✓ ${collection}: ${products.length} passed filters, ${deduped.length} new (after dedup)`
      );

      allNew.push(...deduped);

      // Delay between requests
      await sleep(2000);
    }
  }

  // Merge and save
  const merged = [...existing, ...allNew];
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(merged, null, 2) + "\n");

  console.log("\n=== Summary ===");
  console.log(`Products before: ${existing.length}`);
  console.log(`New products added: ${allNew.length}`);
  console.log(`Total products now: ${merged.length}`);
  console.log("\nBreakdown:");
  for (const [key, val] of Object.entries(summary)) {
    console.log(`  ${key}: ${val.added} added (${val.scraped} passed filters)`);
  }

  // Category breakdown of new products
  const catCounts = {};
  for (const p of allNew) {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  }
  console.log("\nNew products by category:");
  for (const [cat, count] of Object.entries(catCounts)) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
