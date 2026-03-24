import { test, expect } from "@playwright/test";

test.describe("Flow 1: Closet products load + category filtering", () => {
  test("products load and categories filter correctly", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for products to load (skeleton should disappear)
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });

    // Screenshot: initial closet view
    await page.screenshot({ path: "eval/bugfix/flow1-initial.png", fullPage: true });

    // Count products
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} products in closet`);

    // Check category chips exist and show counts
    const categoryChips = page.locator('[data-testid="category-tab"] button');
    const chipCount = await categoryChips.count();
    expect(chipCount).toBeGreaterThanOrEqual(2); // At least All + one category

    // Verify "All" chip shows total count
    const allChip = page.locator('[data-category="all"]');
    const allText = await allChip.textContent();
    expect(allText).toContain(`(${count})`);

    // Click Dresses category
    const dressChip = page.locator('[data-category="dress"]');
    await dressChip.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "eval/bugfix/flow1-dresses.png", fullPage: true });

    const dressCards = page.locator('[data-testid="product-card"]');
    const dressCount = await dressCards.count();
    console.log(`Found ${dressCount} dresses`);
    // Verify the count in the chip matches visible cards
    const dressChipText = await dressChip.textContent();
    expect(dressChipText).toContain(`(${dressCount})`);

    // Click Shoes category
    const shoesChip = page.locator('[data-category="shoes"]');
    await shoesChip.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "eval/bugfix/flow1-shoes.png", fullPage: true });

    const shoesCards = page.locator('[data-testid="product-card"]');
    const shoesCount = await shoesCards.count();
    console.log(`Found ${shoesCount} shoes`);
    const shoesChipText = await shoesChip.textContent();
    expect(shoesChipText).toContain(`(${shoesCount})`);

    // Go back to All
    await allChip.click();
    await page.waitForTimeout(500);
    const allCards = page.locator('[data-testid="product-card"]');
    const allCount = await allCards.count();
    expect(allCount).toBe(count);
    await page.screenshot({ path: "eval/bugfix/flow1-all-again.png", fullPage: true });
  });
});
