/**
 * House of CB Scraper using Playwright
 * HoCB uses a custom platform at app.houseofcb.com
 * Need to navigate category pages and scrape product details
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

const EXCLUDED_COLORS = [
  "hot pink", "pink", "blush", "beige", "nude", "tan", "olive", "moss",
  "khaki", "gray", "grey", "peach", "rose", "warm rose", "sage", "mint",
  "coral", "orange", "brown", "camel", "taupe", "cream",
];

const ALLOWED_COLORS = [
  "emerald", "red", "wine", "burgundy", "blue", "navy", "yellow", "lemon",
  "white", "ivory", "black", "purple", "gold",
];

const EXCLUDED_STYLES = [
  "strapless", "corset", "tube", "cowl neck", "cowl-neck",
  "floral", "print", "sundress",
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
    // Navigate to category page for dresses
    console.log("Loading HoCB category page...");
    await page.goto("https://app.houseofcb.com/category?category_id=1", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(5000);

    // Get all product links from the category page
    const productLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links
        .map((a) => ({
          href: (a as HTMLAnchorElement).href,
          text: (a as HTMLAnchorElement).textContent?.trim() || "",
        }))
        .filter(
          (l) =>
            l.href.includes("houseofcb.com/") &&
            !l.href.includes("category") &&
            !l.href.includes("login") &&
            !l.href.includes("register") &&
            !l.href.includes("help") &&
            !l.href.includes("cookie") &&
            !l.href.includes("terms") &&
            !l.href.includes("careers") &&
            !l.href.includes("about") &&
            !l.href.includes("sustainability") &&
            !l.href.includes("stores") &&
            !l.href.includes("wishlist") &&
            !l.href.includes("orders") &&
            !l.href.includes("mistressrocks") &&
            l.href.match(/\/[a-z][-a-z0-9]+$/)
        );
    });

    console.log(`Found ${productLinks.length} product links on category page`);
    console.log(
      "Links:",
      productLinks.map((l) => l.href).slice(0, 20)
    );

    // Also scroll down to load more products
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await sleep(1000);
    }

    const moreLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links
        .map((a) => (a as HTMLAnchorElement).href)
        .filter(
          (h) =>
            h.includes("houseofcb.com/") &&
            h.match(/\/[a-z][-a-z0-9]+-dress/)
        );
    });
    console.log(`After scrolling: ${moreLinks.length} dress links`);

    // Combine and deduplicate
    const allLinks = [
      ...new Set([
        ...productLinks.map((l) => l.href),
        ...moreLinks,
      ]),
    ];

    // Filter by URL slug for allowed colors
    const candidateLinks = allLinks.filter((url) => {
      const slug = url.split("/").pop() || "";
      if (EXCLUDED_STYLES.some((s) => slug.includes(s))) return false;
      if (EXCLUDED_COLORS.some((c) => slug.includes(c.replace(" ", "-"))))
        return false;
      // Must contain an allowed color in the slug
      return ALLOWED_COLORS.some((c) => slug.includes(c.replace(" ", "-")));
    });

    console.log(`Candidate product URLs after filtering: ${candidateLinks.length}`);
    console.log("Candidates:", candidateLinks.slice(0, 10));

    // If no candidates found by slug filtering, try all product links
    const urlsToScrape = candidateLinks.length > 0 ? candidateLinks : allLinks.slice(0, 10);

    for (const url of urlsToScrape) {
      if (products.length >= 4) break;

      await sleep(2000 + Math.random() * 1000);

      try {
        console.log(`\nScraping: ${url}`);
        await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
        await sleep(3000);

        const productData = await page.evaluate(() => {
          // Get title - try multiple selectors
          const title =
            document.querySelector(".pd_title")?.textContent?.trim() ||
            document.querySelector(".product-name")?.textContent?.trim() ||
            document.querySelector("h1")?.textContent?.trim() ||
            document.querySelector('[class*="title"]')?.textContent?.trim() ||
            "";

          // Get price - try multiple selectors
          let price = "";
          const priceEls = document.querySelectorAll(
            '.pd_price, .product-price, [class*="price"], .price'
          );
          for (const el of priceEls) {
            const text = el.textContent?.trim() || "";
            if (text.match(/\$[\d.]+/) || text.match(/[£€][\d.]+/) || text.match(/USD\s*[\d.]+/)) {
              price = text;
              break;
            }
          }

          // Get description for size/length info
          const desc =
            document.querySelector(".pd_description")?.textContent?.trim() ||
            document.querySelector('[class*="description"]')?.textContent?.trim() ||
            "";

          // Get images
          const images: string[] = [];
          const imgEls = document.querySelectorAll(
            '.pd_images img, .product-images img, [class*="gallery"] img, [class*="slider"] img, .swiper img, img[src*="cloudfront"], img[src*="houseofcb"]'
          );
          imgEls.forEach((img) => {
            const src =
              (img as HTMLImageElement).src ||
              img.getAttribute("data-src") ||
              "";
            if (
              src &&
              !src.includes("logo") &&
              !src.includes("icon") &&
              !src.includes("svg") &&
              src.startsWith("http") &&
              !images.includes(src)
            ) {
              images.push(src);
            }
          });

          // Also try background images
          if (images.length === 0) {
            const divs = document.querySelectorAll('[style*="background-image"]');
            divs.forEach((div) => {
              const style = div.getAttribute("style") || "";
              const match = style.match(/url\(["']?([^"')]+)/);
              if (match && match[1].startsWith("http")) {
                images.push(match[1]);
              }
            });
          }

          return { title, price, desc, images, html: document.title };
        });

        console.log(
          `  Title: "${productData.title}" | Price: "${productData.price}" | Images: ${productData.images.length} | Page title: "${productData.html}"`
        );

        // If no useful title found, try to extract from URL slug
        let title = productData.title;
        if (
          !title ||
          title.includes("House of CB") ||
          title.includes("Womenswear")
        ) {
          const slug = url.split("/").pop() || "";
          title = slug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        }

        if (!title) continue;

        const titleLower = title.toLowerCase();

        // Check excluded styles
        if (EXCLUDED_STYLES.some((s) => titleLower.includes(s))) {
          console.log("  Skipped: excluded style");
          continue;
        }

        // Check excluded colors
        if (EXCLUDED_COLORS.some((c) => titleLower.includes(c))) {
          console.log("  Skipped: excluded color");
          continue;
        }

        // Parse price
        const priceMatch = productData.price.match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : null;
        // HoCB is exempt from $100 price limit

        // Determine category
        let category = "dress";
        if (
          titleLower.includes("heel") ||
          titleLower.includes("shoe") ||
          titleLower.includes("sandal") ||
          titleLower.includes("mule")
        )
          category = "shoes";

        // Length
        let lengthInches: number | null = null;
        if (titleLower.includes("mini")) lengthInches = 24;
        else if (titleLower.includes("midi")) lengthInches = 35;
        else if (titleLower.includes("maxi")) lengthInches = 46;

        products.push({
          id: randomUUID(),
          url,
          title,
          price,
          store: "House of CB",
          category,
          lengthInches,
          images: productData.images.slice(0, 6),
          createdAt: new Date().toISOString(),
        });

        console.log(`  ADDED: ${title} ($${price})`);
      } catch (e) {
        console.error(`  Error on ${url}:`, e);
      }
    }
  } finally {
    await browser.close();
  }

  // Save to products.json
  if (products.length > 0) {
    const productsPath = join(process.cwd(), "data", "products.json");
    const existing = JSON.parse(readFileSync(productsPath, "utf-8"));
    const existingUrls = new Set(existing.map((p: Product) => p.url));

    const newProducts = products.filter((p) => !existingUrls.has(p.url));
    const all = [...existing, ...newProducts];
    writeFileSync(productsPath, JSON.stringify(all, null, 2) + "\n");
    console.log(`\nAdded ${newProducts.length} House of CB products`);
    console.log(`Total: ${all.length}`);
  } else {
    console.log("\nNo House of CB products found - site may need different approach");
  }

  return products;
}

main().catch(console.error);
