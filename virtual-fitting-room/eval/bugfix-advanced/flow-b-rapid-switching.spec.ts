import { test, expect } from "@playwright/test";
import { goHome } from "./helpers";

test("Flow B: Rapid category switching", async ({ page }) => {
  await goHome(page);

  // Should be on closet tab by default
  const categoryBar = page.locator('[data-testid="category-tab"]');
  await expect(categoryBar).toBeVisible({ timeout: 10000 });

  // Get initial "All" count
  const allBtn = page.locator('[data-testid="category-all"]');
  const allText = await allBtn.textContent();
  expect(allText).toMatch(/All \(\d+\)/);

  const categories = ["dress", "shoes", "tights", "bag", "accessories", "all"];

  // Repeat rapid switching 3 times
  for (let round = 0; round < 3; round++) {
    for (const cat of categories) {
      const btn = page.locator(`[data-testid="category-${cat}"]`);
      await btn.click();
      await page.waitForTimeout(200);
    }
  }

  // After rapid switching, verify no crash
  await page.waitForTimeout(500);
  await page.screenshot({ path: "eval/bugfix-advanced/flowB-after-rapid.png" });

  // Verify counts are still correct
  for (const cat of categories) {
    const btn = page.locator(`[data-testid="category-${cat}"]`);
    const text = await btn.textContent();
    expect(text).toMatch(/\(\d+\)/);
  }

  // Verify product cards are visible (not empty/blank)
  const cards = page.locator('[data-testid="product-card"]');
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThan(0);

  // Test each category shows correct filtered results
  for (const cat of ["dress", "shoes", "tights", "bag", "accessories"]) {
    const btn = page.locator(`[data-testid="category-${cat}"]`);
    await btn.click();
    await page.waitForTimeout(300);

    const countMatch = (await btn.textContent())?.match(/\((\d+)\)/);
    const expectedCount = countMatch ? parseInt(countMatch[1]) : 0;

    if (expectedCount > 0) {
      const visibleCards = page.locator('[data-testid="product-card"]');
      const actualCount = await visibleCards.count();
      expect(actualCount).toBe(expectedCount);
    }
  }

  await page.screenshot({ path: "eval/bugfix-advanced/flowB-final.png" });
});
