import { chromium, type Browser, type Page } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const PRODUCTS_PATH = resolve(__dirname, "../data/products.json");
const TIMEOUT = 15_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface Product {
  id: string;
  name: string;
  url: string;
  images: string[];
  [key: string]: unknown;
}

type Result = "PASS" | "FAIL";

async function checkPage(page: Page, url: string): Promise<{ result: Result; reason: string }> {
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT,
    });

    // Try waiting for network idle, but don't fail if it times out
    await page.waitForLoadState("networkidle").catch(() => {});

    const status = response?.status() ?? 0;

    // Hard 404 or 410
    if (status === 404 || status === 410) {
      // Double-check: some sites return 404 status but still show product content
      const hasContent = await page
        .locator('img[src*="product"], img[src*="cdn"], [class*="product"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (hasContent) {
        return { result: "PASS", reason: `status ${status} but has product content` };
      }
      return { result: "FAIL", reason: `HTTP ${status}` };
    }

    // Check for "page not found" text patterns
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const lower = bodyText.toLowerCase();

    const is404Page =
      (lower.includes("page not found") || lower.includes("404") || lower.includes("no longer available")) &&
      !lower.includes("add to") &&
      !lower.includes("price") &&
      bodyText.length < 2000;

    if (is404Page) {
      return { result: "FAIL", reason: "page content indicates 404/removed" };
    }

    // Page loaded (even if it has interstitials, age gates, bot checks) = PASS
    return { result: "PASS", reason: `HTTP ${status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ERR_NAME_NOT_RESOLVED") || msg.includes("ERR_CONNECTION_REFUSED")) {
      return { result: "FAIL", reason: "domain not found / connection refused" };
    }
    if (msg.includes("Timeout")) {
      return { result: "FAIL", reason: "timeout after 15s" };
    }
    return { result: "FAIL", reason: msg.slice(0, 100) };
  }
}

async function checkImage(page: Page, imageUrl: string): Promise<{ result: Result; reason: string }> {
  try {
    const response = await page.goto(imageUrl, {
      waitUntil: "load",
      timeout: 10_000,
    });
    const status = response?.status() ?? 0;
    const contentType = response?.headers()?.["content-type"] ?? "";

    if (status >= 400) {
      return { result: "FAIL", reason: `image HTTP ${status}` };
    }
    if (contentType.includes("text/html") && !contentType.includes("image")) {
      // Some CDNs redirect to an HTML error page
      return { result: "FAIL", reason: "image URL returned HTML, not image" };
    }
    return { result: "PASS", reason: `image OK (${status})` };
  } catch {
    return { result: "FAIL", reason: "image load failed" };
  }
}

async function main() {
  const products: Product[] = JSON.parse(readFileSync(PRODUCTS_PATH, "utf-8"));
  console.log(`\nVerifying ${products.length} products with Playwright...\n`);

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });

  const failed: Set<string> = new Set();
  const results: { name: string; url: Result; image: Result; urlReason: string; imageReason: string }[] = [];

  for (const product of products) {
    const page = await context.newPage();

    // Check product URL
    const urlCheck = await checkPage(page, product.url);

    // Check first image (only if URL passed or we want full info)
    let imageCheck: { result: Result; reason: string } = { result: "PASS", reason: "skipped" };
    if (product.images?.[0]) {
      imageCheck = await checkImage(page, product.images[0]);
    }

    const urlStatus = urlCheck.result === "PASS" ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    const imgStatus = imageCheck.result === "PASS" ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";

    console.log(`${urlStatus} URL  | ${imgStatus} IMG  | ${product.name}`);
    if (urlCheck.result === "FAIL") console.log(`       URL reason: ${urlCheck.reason}`);
    if (imageCheck.result === "FAIL" && imageCheck.reason !== "skipped")
      console.log(`       IMG reason: ${imageCheck.reason}`);

    // Only remove if the page truly fails (not just the image)
    if (urlCheck.result === "FAIL") {
      failed.add(product.id);
    }

    results.push({
      name: product.name,
      url: urlCheck.result,
      image: imageCheck.result,
      urlReason: urlCheck.reason,
      imageReason: imageCheck.reason,
    });

    await page.close();

    // Small delay between requests to be polite
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
  }

  await browser.close();

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Total: ${products.length} | Passed: ${products.length - failed.size} | Failed: ${failed.size}`);

  if (failed.size > 0) {
    const removed = products.filter((p) => failed.has(p.id));
    console.log(`\nRemoving ${failed.size} failed products:`);
    removed.forEach((p) => console.log(`  - ${p.name} (${p.url})`));

    const remaining = products.filter((p) => !failed.has(p.id));
    writeFileSync(PRODUCTS_PATH, JSON.stringify(remaining, null, 2) + "\n");
    console.log(`\nUpdated products.json: ${remaining.length} products remaining.`);
  } else {
    console.log("\nAll products passed! No changes to products.json.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
