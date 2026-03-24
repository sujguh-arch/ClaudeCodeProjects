import { test, expect } from "@playwright/test";

test.describe("Flow 10: Mobile responsiveness", () => {
  test("iPhone 14 Pro (390x844) layout is correct", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });
    await page.screenshot({ path: "eval/bugfix/flow10-iphone14.png", fullPage: true });

    // Verify 2-column grid
    const firstCard = page.locator('[data-testid="product-card"]').first();
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    // On 390px width with 2-col grid, each card should be roughly half width minus gaps/padding
    // Max width is 430px (from layout), so cards should be < 220px each
    expect(cardBox!.width).toBeLessThan(220);
    expect(cardBox!.width).toBeGreaterThan(100);
    console.log(`Card width on iPhone 14: ${cardBox!.width}px`);

    // Verify no horizontal overflow
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(430); // App max-width is 430px
    console.log(`Page scroll width: ${pageWidth}px`);

    // Verify bottom nav is visible and proportional
    const bottomNav = page.locator("nav.fixed.bottom-0");
    await expect(bottomNav).toBeVisible();
    const navBox = await bottomNav.boundingBox();
    expect(navBox).not.toBeNull();
    expect(navBox!.width).toBeLessThanOrEqual(430);
    console.log(`Bottom nav width: ${navBox!.width}px, height: ${navBox!.height}px`);

    // Verify category chips are scrollable (overflow-x-auto)
    const chipContainer = page.locator('[data-testid="category-tab"]');
    await expect(chipContainer).toBeVisible();
    const chipOverflow = await chipContainer.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.overflowX;
    });
    expect(chipOverflow).toBe("auto");
    console.log(`Category chips overflow-x: ${chipOverflow}`);
  });

  test("iPhone 15 Pro Max (430x932) layout is correct", async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });
    await page.screenshot({ path: "eval/bugfix/flow10-iphone15max.png", fullPage: true });

    // Verify 2-column grid
    const firstCard = page.locator('[data-testid="product-card"]').first();
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.width).toBeLessThan(240);
    expect(cardBox!.width).toBeGreaterThan(100);
    console.log(`Card width on iPhone 15 Pro Max: ${cardBox!.width}px`);

    // No horizontal overflow
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(430);
    console.log(`Page scroll width: ${pageWidth}px`);

    // Bottom nav visible and proportional
    const bottomNav = page.locator("nav.fixed.bottom-0");
    await expect(bottomNav).toBeVisible();

    // Category chips scrollable
    const chipContainer = page.locator('[data-testid="category-tab"]');
    await expect(chipContainer).toBeVisible();
  });
});
