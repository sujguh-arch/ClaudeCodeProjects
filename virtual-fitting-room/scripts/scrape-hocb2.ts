/**
 * House of CB Scraper v2 - intercept API calls
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
  });

  const apiResponses: any[] = [];
  const page = await context.newPage();

  // Intercept API/XHR responses
  page.on("response", async (response) => {
    const url = response.url();
    if (
      url.includes("api") ||
      url.includes("product") ||
      url.includes("catalog") ||
      url.includes("graphql") ||
      url.includes(".json")
    ) {
      try {
        const contentType = response.headers()["content-type"] || "";
        if (contentType.includes("json")) {
          const body = await response.json();
          apiResponses.push({ url, body });
        }
      } catch {}
    }
  });

  try {
    // Load a product page and capture API calls
    console.log("Loading HoCB product page...");
    await page.goto(
      "https://app.houseofcb.com/tallulah-white-halter-neck-cotton-midi-dress",
      { waitUntil: "networkidle", timeout: 30000 }
    );
    await sleep(5000);

    console.log(`Captured ${apiResponses.length} API responses`);
    for (const r of apiResponses) {
      console.log(`  API: ${r.url.substring(0, 120)}`);
      if (typeof r.body === "object") {
        const keys = Object.keys(r.body).slice(0, 5);
        console.log(`  Keys: ${keys.join(", ")}`);
      }
    }

    // Now try to read rendered content after full load
    const renderedContent = await page.evaluate(() => {
      // Get ALL text content
      const body = document.body?.innerText || "";
      return body.substring(0, 3000);
    });
    console.log("\n--- Rendered page content ---");
    console.log(renderedContent.substring(0, 1500));

    // Try extracting from JavaScript variables
    const jsData = await page.evaluate(() => {
      // Check for common patterns
      const win = window as any;
      const candidates = [
        win.__NEXT_DATA__,
        win.__INITIAL_STATE__,
        win.__NUXT__,
        win.product,
        win.productData,
        win.dataLayer,
      ];
      return candidates.map((c) => (c ? JSON.stringify(c).substring(0, 500) : null));
    });
    console.log("\n--- JS data candidates ---");
    jsData.forEach((d, i) => {
      if (d) console.log(`  [${i}]: ${d}`);
    });

    // Load category page to find products
    console.log("\n\nLoading category page...");
    apiResponses.length = 0;
    await page.goto("https://app.houseofcb.com/category?category_id=1", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(5000);

    console.log(`Captured ${apiResponses.length} API responses from category`);
    for (const r of apiResponses) {
      console.log(`  API: ${r.url.substring(0, 150)}`);
      if (typeof r.body === "object") {
        const snippet = JSON.stringify(r.body).substring(0, 300);
        console.log(`  Data: ${snippet}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
