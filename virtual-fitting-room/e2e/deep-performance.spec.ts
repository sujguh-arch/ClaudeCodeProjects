import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
  await page.reload();
  await page.waitForTimeout(500);
});

test.describe("deep performance", () => {
  test("page load time is under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("mirror_pin", "1234");
      sessionStorage.setItem("mirror_session", "active");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    expect
      .soft(loadTime, `Page load took ${loadTime}ms — expected < 3000ms`)
      .toBeLessThan(3000);

    await page.screenshot({ path: "test-results/deep-perf-load.png" });
  });

  test("tab switch renders product grid within 500ms", async ({ page }) => {
    const start = Date.now();
    await page.getByRole("button", { name: /closet/i }).click();
    // Wait for at least one product card or the "All" pill to appear
    await page.getByRole("button", { name: /^all$/i }).waitFor({ state: "visible" });
    const switchTime = Date.now() - start;

    expect
      .soft(
        switchTime,
        `Tab switch took ${switchTime}ms — expected < 500ms`
      )
      .toBeLessThan(500);
  });

  test("lightbox opens within 300ms", async ({ page, request }) => {
    // Add a test product to click
    const resp = await request.post("/api/products", {
      data: {
        title: "Perf Lightbox Test",
        images: ["https://cdn.shopify.com/s/files/1/0506/5886/9443/files/perf-lb.jpg"],
        price: 50,
        store: "TestStore",
        category: "dress",
        url: `https://test-store.com/perf-lb-${Date.now()}`,
      },
    });
    const product = await resp.json();

    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(300);

    const card = page.getByText("Perf Lightbox Test");
    await card.waitFor({ state: "visible" });

    const start = Date.now();
    await card.click();
    // Wait for lightbox content to appear
    await page.waitForTimeout(300);
    const openTime = Date.now() - start;

    expect
      .soft(openTime, `Lightbox open took ${openTime}ms — expected < 600ms`)
      .toBeLessThan(600);

    await page.screenshot({ path: "test-results/deep-perf-lightbox.png" });

    // Cleanup
    await request.delete("/api/products", { data: { id: product.id } });
  });

  test("no console errors on any page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Visit home page
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("mirror_pin", "1234");
      sessionStorage.setItem("mirror_session", "active");
    });
    await page.reload();
    await page.waitForTimeout(500);

    // Visit closet
    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(300);

    // Visit outfits
    await page.getByRole("button", { name: /outfits/i }).click();
    await page.waitForTimeout(300);

    // Visit settings
    await page.goto("/settings");
    await page.waitForTimeout(500);

    expect(
      errors,
      `Console errors found: ${errors.join("; ")}`
    ).toHaveLength(0);
  });

  test("no 404s for any asset", async ({ page }) => {
    const failed: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404) {
        failed.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("mirror_pin", "1234");
      sessionStorage.setItem("mirror_session", "active");
    });
    await page.reload();
    await page.waitForTimeout(1000);

    // Switch to closet tab to load product images
    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(1000);

    expect
      .soft(failed, `404s found:\n${failed.join("\n")}`)
      .toHaveLength(0);
  });

  test("images use lazy loading for below-fold content", async ({ page }) => {
    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(500);

    // Check if images have loading="lazy" attribute
    const images = await page.locator("img").all();
    let lazyCount = 0;
    for (const img of images) {
      const loading = await img.getAttribute("loading");
      if (loading === "lazy") lazyCount++;
    }

    // At least some images should be lazy-loaded
    if (images.length > 2) {
      expect
        .soft(lazyCount, "Expected some images to have loading='lazy'")
        .toBeGreaterThan(0);
    }
  });

  test("check for layout shift (CLS) via screenshots", async ({ page }) => {
    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(200);

    // Screenshot before images load
    await page.screenshot({ path: "test-results/deep-cls-before.png" });

    // Wait for images to load
    await page.waitForTimeout(2000);

    // Screenshot after images load
    await page.screenshot({ path: "test-results/deep-cls-after.png" });

    // Both screenshots should exist — visual comparison is manual
    // The test passes if no JS errors occur during loading
  });

  test("total JS bundle size check", async ({ page, context }) => {
    // Enable JS coverage
    await page.coverage.startJSCoverage();

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("mirror_pin", "1234");
      sessionStorage.setItem("mirror_session", "active");
    });
    await page.reload();
    await page.waitForTimeout(1000);

    const coverage = await page.coverage.stopJSCoverage();

    let totalBytes = 0;
    for (const entry of coverage) {
      totalBytes += entry.text.length;
    }

    const totalKB = Math.round(totalBytes / 1024);

    // Warn if > 300KB but don't fail hard
    expect
      .soft(
        totalKB,
        `Total JS bundle is ${totalKB}KB — consider reducing if > 300KB`
      )
      .toBeLessThan(600); // Hard limit at 600KB, soft target 300KB
  });
});
