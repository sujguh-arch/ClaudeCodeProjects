/**
 * Phase 2: Catalog Scraping Script
 * Scrapes products from Oh Polly, House of CB, and Wolford
 * (Princess Polly and Peppermayo already populated)
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

function randomDelay() {
  return sleep(2000 + Math.random() * 1000);
}

// ==================== OH POLLY (Shopify) ====================

async function scrapeOhPollyDresses(): Promise<Product[]> {
  console.log("Scraping Oh Polly dresses...");
  const products: Product[] = [];

  const resp = await fetch(
    "https://www.ohpolly.com/collections/dresses/products.json?limit=50",
    { headers: { "User-Agent": UA } }
  );
  const data = await resp.json();

  // Allowed colors
  const allowedColors = [
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
  const excludedColors = [
    "hot pink",
    "pink",
    "blush",
    "beige",
    "nude",
    "tan",
    "olive",
    "moss",
    "khaki",
    "gray",
    "grey",
    "peach",
    "honey",
    "rose gold",
    "silver",
    "cream",
    "lilac",
    "orange",
    "coral",
    "brown",
    "sage",
    "mint",
  ];
  // Excluded styles
  const excludedStyles = [
    "strapless",
    "corset",
    "tube top",
    "cowl neck",
    "cowl-neck",
    "floral",
    "print",
    "bandeau",
  ];

  for (const p of data.products) {
    const title = (p.title as string).toLowerCase();
    const handle = p.handle as string;
    const price = parseFloat(p.variants?.[0]?.price || "0");

    // Price check (Oh Polly, not exempt)
    if (price > 100) continue;

    // Excluded styles
    if (excludedStyles.some((s) => title.includes(s) || handle.includes(s)))
      continue;

    // Color check
    if (excludedColors.some((c) => title.includes(c))) continue;
    if (!allowedColors.some((c) => title.includes(c))) continue;

    // Determine dress length type from title
    let lengthType = "";
    if (title.includes("mini")) lengthType = "mini";
    else if (title.includes("midi") || title.includes("midaxi"))
      lengthType = "midi";
    else if (title.includes("maxi")) lengthType = "maxi";

    // Estimate length from title (Oh Polly doesn't provide garment measurements in API)
    let lengthInches: number | null = null;
    if (lengthType === "mini") lengthInches = 24;
    else if (lengthType === "midi") lengthInches = 36;
    else if (lengthType === "maxi") lengthInches = 45;

    const images = (p.images || [])
      .slice(0, 6)
      .map((i: { src: string }) => i.src);
    if (images.length === 0) continue;

    products.push({
      id: randomUUID(),
      url: `https://www.ohpolly.com/products/${handle}`,
      title: p.title,
      price,
      store: "Oh Polly",
      category: "dress",
      lengthInches,
      images,
      createdAt: new Date().toISOString(),
    });

    if (products.length >= 4) break;
  }

  console.log(`  Found ${products.length} Oh Polly dresses`);
  return products;
}

async function scrapeOhPollyAccessories(): Promise<Product[]> {
  console.log("Scraping Oh Polly accessories...");
  const products: Product[] = [];

  await randomDelay();

  const resp = await fetch(
    "https://www.ohpolly.com/collections/accessories/products.json?limit=30",
    { headers: { "User-Agent": UA } }
  );
  const data = await resp.json();

  for (const p of data.products) {
    const title = (p.title as string).toLowerCase();
    const handle = p.handle as string;
    const price = parseFloat(p.variants?.[0]?.price || "0");
    const type = (p.product_type as string || "").toLowerCase();

    // Skip beach items
    if (title.includes("beach") || title.includes("towel") || title.includes("bikini")) continue;

    // Determine subcategory
    let category = "accessories";
    if (title.includes("bag") || title.includes("tote") || title.includes("clutch"))
      category = "bag";
    if (title.includes("tights") || title.includes("stockings"))
      category = "tights";

    const images = (p.images || [])
      .slice(0, 6)
      .map((i: { src: string }) => i.src);
    if (images.length === 0) continue;

    products.push({
      id: randomUUID(),
      url: `https://www.ohpolly.com/products/${handle}`,
      title: p.title,
      price,
      store: "Oh Polly",
      category,
      images,
      createdAt: new Date().toISOString(),
    });

    if (products.length >= 2) break;
  }

  console.log(`  Found ${products.length} Oh Polly accessories`);
  return products;
}

// ==================== WOLFORD (HTML/JSON-LD) ====================

async function scrapeWolfordProduct(
  url: string,
  colorVariant?: string
): Promise<Product | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    // Extract JSON-LD
    const ldMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    );
    if (!ldMatch) return null;

    const ldData = JSON.parse(ldMatch[1]);
    // The JSON-LD may contain multiple product variants
    let items: any[] = [];
    if (ldData["@graph"]) {
      items = ldData["@graph"].filter(
        (i: any) => i["@type"] === "Product"
      );
    } else if (Array.isArray(ldData)) {
      items = ldData.filter((i: any) => i["@type"] === "Product");
    } else if (ldData["@type"] === "Product") {
      items = [ldData];
    } else if (ldData["@type"] === "ProductGroup" && ldData.hasVariant) {
      items = Array.isArray(ldData.hasVariant)
        ? ldData.hasVariant
        : [ldData.hasVariant];
    }

    // Find the black variant or first variant
    let product = items[0];
    if (colorVariant) {
      const match = items.find(
        (i: any) =>
          (i.color || "").toLowerCase() === colorVariant.toLowerCase() ||
          (i.sku || "").includes(colorVariant)
      );
      if (match) product = match;
    }

    if (!product) return null;

    const name = product.name || ldData.name || "Wolford Tights";
    const price = product.offers?.price
      ? parseFloat(product.offers.price)
      : null;
    const images = Array.isArray(product.image)
      ? product.image.slice(0, 5)
      : product.image
        ? [product.image]
        : [];

    const colorName = product.color || colorVariant || "black";
    const fullTitle = `${name} ${colorName.charAt(0).toUpperCase() + colorName.slice(1)}`;

    return {
      id: randomUUID(),
      url,
      title: fullTitle,
      price,
      store: "Wolford",
      category: "tights",
      lengthInches: null,
      images,
      createdAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error(`  Error scraping ${url}:`, e);
    return null;
  }
}

async function scrapeWolfordTights(): Promise<Product[]> {
  console.log("Scraping Wolford tights...");
  const products: Product[] = [];

  const wolfordProducts = [
    {
      url: "https://www.wolford.com/en-us/velvet-de-luxe-66-tights-14775.7005.html",
      color: "black",
    },
    {
      url: "https://www.wolford.com/en-us/satin-touch-20-tights-14776.7005.html",
      color: "black",
    },
    {
      url: "https://www.wolford.com/en-us/neon-40-tights-14978.7005.html",
      color: "black",
    },
    {
      url: "https://www.wolford.com/en-us/mat-opaque-80-tights-18420.7005.html",
      color: "black",
    },
    {
      url: "https://www.wolford.com/en-us/individual-10-tights-18382.4365.html",
      color: "cosmetic",
    },
    {
      url: "https://www.wolford.com/en-us/velvet-de-luxe-66-tights-14775.5452.html",
      color: "navy",
    },
  ];

  for (const { url, color } of wolfordProducts) {
    await randomDelay();
    const product = await scrapeWolfordProduct(url, color);
    if (product) {
      products.push(product);
      console.log(`  Added: ${product.title} ($${product.price})`);
    }
    if (products.length >= 5) break;
  }

  console.log(`  Found ${products.length} Wolford tights`);
  return products;
}

// ==================== HOUSE OF CB (Playwright) ====================

async function scrapeHouseOfCB(): Promise<Product[]> {
  console.log("Scraping House of CB with Playwright...");
  const products: Product[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 800 },
  });

  try {
    const page = await context.newPage();

    // Navigate to the homepage to find product links
    console.log("  Loading House of CB homepage...");
    await page.goto("https://www.houseofcb.com/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await sleep(3000);

    // Try to find dress collection links
    const allLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links
        .map((a) => ({
          href: (a as HTMLAnchorElement).href,
          text: (a as HTMLAnchorElement).textContent?.trim() || "",
        }))
        .filter(
          (l) =>
            l.href.includes("houseofcb.com/") &&
            !l.href.includes("/login") &&
            !l.href.includes("/register") &&
            !l.href.includes("/help") &&
            !l.href.includes("/careers")
        );
    });

    console.log(`  Found ${allLinks.length} links on homepage`);

    // Find category/collection links
    const categoryLinks = allLinks.filter(
      (l) =>
        l.text.toLowerCase().includes("dress") ||
        l.text.toLowerCase().includes("shop") ||
        l.text.toLowerCase().includes("new") ||
        l.href.includes("dress") ||
        l.href.includes("collection") ||
        l.href.includes("new-in")
    );
    console.log(
      "  Category links:",
      categoryLinks.map((l) => l.href).slice(0, 10)
    );

    // Find product links from homepage
    const productLinks = allLinks.filter(
      (l) =>
        l.href.match(
          /houseofcb\.com\/[a-z][-a-z0-9]+-dress/
        ) ||
        l.href.match(/houseofcb\.com\/[a-z][-a-z0-9]+-heel/) ||
        l.href.match(/houseofcb\.com\/[a-z][-a-z0-9]+-shoe/)
    );
    console.log(
      "  Product links:",
      productLinks.map((l) => l.href)
    );

    // Try navigating to the new-in or dresses page
    for (const categoryUrl of [
      "https://www.houseofcb.com/new-in",
      "https://www.houseofcb.com/clothing/dresses",
      "https://www.houseofcb.com/all-dresses",
      "https://www.houseofcb.com/dresses",
    ]) {
      try {
        console.log(`  Trying category page: ${categoryUrl}`);
        await page.goto(categoryUrl, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        await sleep(2000);

        const pageProducts = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll("a[href]"));
          return links
            .map((a) => (a as HTMLAnchorElement).href)
            .filter(
              (h) =>
                h.includes("houseofcb.com/") &&
                h.match(/\/[a-z][-a-z0-9]+-dress/)
            );
        });
        if (pageProducts.length > 0) {
          console.log(
            `  Found ${pageProducts.length} products on ${categoryUrl}`
          );
          productLinks.push(
            ...pageProducts.map((href) => ({ href, text: "" }))
          );
          break;
        }
      } catch {
        continue;
      }
    }

    // Scrape individual product pages
    const uniqueUrls = [
      ...new Set(productLinks.map((l) => l.href.split("?")[0])),
    ];
    console.log(`  Unique product URLs to scrape: ${uniqueUrls.length}`);

    for (const url of uniqueUrls) {
      if (products.length >= 4) break;
      await randomDelay();

      try {
        console.log(`  Scraping: ${url}`);
        await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
        await sleep(2000);

        const productData = await page.evaluate(() => {
          const title =
            document.querySelector("h1")?.textContent?.trim() ||
            document.querySelector('[class*="product-name"]')?.textContent?.trim() ||
            document.querySelector("title")?.textContent?.trim() ||
            "";

          // Get price
          let price = "";
          const priceEl =
            document.querySelector('[class*="price"]') ||
            document.querySelector('[data-price]') ||
            document.querySelector(".product-price");
          if (priceEl) {
            price = priceEl.textContent?.trim() || "";
          }

          // Get images
          const images: string[] = [];
          const imgEls = document.querySelectorAll(
            'img[src*="houseofcb"], img[src*="cloudfront"], .product-image img, [class*="gallery"] img, [class*="slider"] img'
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
              !images.includes(src)
            ) {
              images.push(src);
            }
          });

          return { title, price, images };
        });

        if (!productData.title) continue;

        const title = productData.title.toLowerCase();

        // Check excluded styles
        const excludedStyles = [
          "strapless",
          "corset",
          "tube",
          "cowl neck",
          "floral",
          "print",
          "sundress",
        ];
        if (excludedStyles.some((s) => title.includes(s))) continue;

        // Check excluded colors
        const excludedColors = [
          "hot pink",
          "pink",
          "blush",
          "beige",
          "nude",
          "tan",
          "olive",
          "moss",
          "khaki",
          "gray",
          "grey",
          "peach",
          "rose",
          "warm rose",
        ];
        if (excludedColors.some((c) => title.includes(c))) continue;

        // Parse price
        const priceMatch = productData.price.match(/[\d.]+/);
        const price = priceMatch ? parseFloat(priceMatch[0]) : null;

        // Determine category
        let category = "dress";
        if (title.includes("heel") || title.includes("shoe") || title.includes("sandal"))
          category = "shoes";

        products.push({
          id: randomUUID(),
          url,
          title: productData.title,
          price,
          store: "House of CB",
          category,
          lengthInches: title.includes("mini")
            ? 24
            : title.includes("midi")
              ? 35
              : title.includes("maxi")
                ? 46
                : null,
          images: productData.images.slice(0, 6),
          createdAt: new Date().toISOString(),
        });

        console.log(
          `  Added: ${productData.title} ($${price})`
        );
      } catch (e) {
        console.error(`  Error on ${url}:`, e);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`  Found ${products.length} House of CB products`);
  return products;
}

// ==================== MAIN ====================

async function main() {
  const productsPath = join(process.cwd(), "data", "products.json");
  const existing: Product[] = JSON.parse(readFileSync(productsPath, "utf-8"));
  console.log(`Existing products: ${existing.length}`);

  // Track existing URLs to avoid duplicates
  const existingUrls = new Set(existing.map((p) => p.url));

  const newProducts: Product[] = [];

  // 1. Oh Polly dresses
  try {
    const ohPollyDresses = await scrapeOhPollyDresses();
    for (const p of ohPollyDresses) {
      if (!existingUrls.has(p.url)) {
        newProducts.push(p);
        existingUrls.add(p.url);
      }
    }
  } catch (e) {
    console.error("Oh Polly dresses failed:", e);
  }

  await randomDelay();

  // 2. Oh Polly accessories
  try {
    const ohPollyAcc = await scrapeOhPollyAccessories();
    for (const p of ohPollyAcc) {
      if (!existingUrls.has(p.url)) {
        newProducts.push(p);
        existingUrls.add(p.url);
      }
    }
  } catch (e) {
    console.error("Oh Polly accessories failed:", e);
  }

  await randomDelay();

  // 3. Wolford tights
  try {
    const wolfordTights = await scrapeWolfordTights();
    for (const p of wolfordTights) {
      if (!existingUrls.has(p.url)) {
        newProducts.push(p);
        existingUrls.add(p.url);
      }
    }
  } catch (e) {
    console.error("Wolford tights failed:", e);
  }

  await randomDelay();

  // 4. House of CB (Playwright)
  try {
    const hocbProducts = await scrapeHouseOfCB();
    for (const p of hocbProducts) {
      if (!existingUrls.has(p.url)) {
        newProducts.push(p);
        existingUrls.add(p.url);
      }
    }
  } catch (e) {
    console.error("House of CB failed:", e);
  }

  // Merge and save
  const allProducts = [...existing, ...newProducts];
  writeFileSync(productsPath, JSON.stringify(allProducts, null, 2) + "\n");

  console.log(`\nAdded ${newProducts.length} new products`);
  console.log(`Total products: ${allProducts.length}`);

  // Summary by store
  const byStore: Record<string, number> = {};
  const byCat: Record<string, number> = {};
  for (const p of allProducts) {
    byStore[p.store] = (byStore[p.store] || 0) + 1;
    byCat[p.category] = (byCat[p.category] || 0) + 1;
  }
  console.log("By store:", byStore);
  console.log("By category:", byCat);
}

main().catch(console.error);
