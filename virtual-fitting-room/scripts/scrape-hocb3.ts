/**
 * House of CB Scraper v3 - extract from rendered page text
 */

import { chromium } from "playwright";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface Product {
  id: string;
  url: string;
  title: string;
  price: number | null;
  store: string;
  category: string;
  lengthInches?: number | null;
  images: string[];
  createdAt: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Products to scrape - picked from category page, in allowed colors
const PRODUCT_URLS = [
  "https://app.houseofcb.com/tallulah-white-halter-neck-cotton-midi-dress",
  "https://app.houseofcb.com/tallulah-lemon-halter-neck-cotton-midi-dress",
  "https://app.houseofcb.com/kaia-white-cotton-mini-dress",
  "https://app.houseofcb.com/carmine-lemon-yellow-halter-neck-mesh-maxi-dress",
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
  });

  const products: Product[] = [];
  const page = await context.newPage();

  try {
    for (const url of PRODUCT_URLS) {
      if (products.length >= 4) break;

      console.log(`\nScraping: ${url}`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await sleep(4000);

      const data = await page.evaluate(() => {
        const text = document.body?.innerText || "";

        // Find price pattern "USD $XXX"
        const priceMatch = text.match(/USD\s*\$(\d+(?:\.\d+)?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;

        // Get all images from the page
        const images: string[] = [];
        document.querySelectorAll("img").forEach((img) => {
          const src = img.src || img.getAttribute("data-src") || "";
          if (
            src &&
            src.startsWith("http") &&
            (src.includes("cloudfront") || src.includes("houseofcb")) &&
            !src.includes("logo") &&
            !src.includes("icon") &&
            !src.includes("svg") &&
            !src.includes("pixel") &&
            !images.includes(src)
          ) {
            images.push(src);
          }
        });

        return { text: text.substring(0, 2000), price, images };
      });

      // Extract title from URL slug since DOM doesn't have reliable selectors
      const slug = url.split("/").pop() || "";
      const titleFromSlug = slug
        .replace(/^b\//, "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      // Try to extract price from rendered text if not found
      let price = data.price;
      if (!price) {
        const m = data.text.match(/\$(\d+)/);
        if (m) price = parseFloat(m[1]);
      }

      console.log(`  Title: ${titleFromSlug}`);
      console.log(`  Price: $${price}`);
      console.log(`  Images: ${data.images.length}`);

      if (data.images.length === 0) {
        console.log("  Skipped: no images");
        continue;
      }

      // Determine dress length from title
      const titleLower = titleFromSlug.toLowerCase();
      let lengthInches: number | null = null;
      if (titleLower.includes("mini")) lengthInches = 24;
      else if (titleLower.includes("midi")) lengthInches = 35;
      else if (titleLower.includes("maxi")) lengthInches = 46;

      // Determine category
      let category = "dress";
      if (titleLower.includes("cardigan") || titleLower.includes("top"))
        category = "other";
      if (category !== "dress") {
        console.log("  Skipped: not a dress/shoes");
        continue;
      }

      products.push({
        id: randomUUID(),
        url: url.replace("app.houseofcb.com", "www.houseofcb.com"),
        title: titleFromSlug,
        price,
        store: "House of CB",
        category,
        lengthInches,
        images: data.images.slice(0, 6),
        createdAt: new Date().toISOString(),
      });

      console.log(`  ADDED!`);
      await sleep(2000 + Math.random() * 1000);
    }
  } finally {
    await browser.close();
  }

  // Save
  if (products.length > 0) {
    const productsPath = join(process.cwd(), "data", "products.json");
    const existing = JSON.parse(readFileSync(productsPath, "utf-8"));
    const existingUrls = new Set(existing.map((p: any) => p.url));
    const newProducts = products.filter((p) => !existingUrls.has(p.url));
    const all = [...existing, ...newProducts];
    writeFileSync(productsPath, JSON.stringify(all, null, 2) + "\n");
    console.log(`\nAdded ${newProducts.length} House of CB products`);
    console.log(`Total: ${all.length}`);
  }
}

main().catch(console.error);
