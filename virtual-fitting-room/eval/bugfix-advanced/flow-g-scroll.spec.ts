import { test, expect } from "@playwright/test";
import { goHome } from "./helpers";

test("Flow G: Scroll performance", async ({ page }) => {
  await goHome(page);

  // Ensure All tab is selected
  const allBtn = page.locator('[data-testid="category-all"]');
  await allBtn.click();
  await page.waitForTimeout(1000);

  const allText = await allBtn.textContent();
  const countMatch = allText?.match(/\((\d+)\)/);
  const totalProducts = countMatch ? parseInt(countMatch[1]) : 0;
  expect(totalProducts).toBeGreaterThan(50); // Should have many products

  await page.screenshot({ path: "eval/bugfix-advanced/flowG-top.png" });

  // Check that images use lazy loading
  const images = page.locator('[data-testid="product-card"] img');
  const firstImgLoading = await images.first().getAttribute("loading");
  expect(firstImgLoading).toBe("lazy");

  // Scroll to bottom
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "eval/bugfix-advanced/flowG-bottom.png" });

  // Verify products are still rendered at bottom
  const visibleCards = page.locator('[data-testid="product-card"]');
  const cardCount = await visibleCards.count();
  expect(cardCount).toBeGreaterThan(0);

  // Scroll back to top
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "eval/bugfix-advanced/flowG-back-to-top.png" });

  // Verify products are still rendered at top
  const topCards = page.locator('[data-testid="product-card"]');
  const topCount = await topCards.count();
  expect(topCount).toBeGreaterThan(0);

  // Verify no jank - page should still be interactive
  const categoryBtn = page.locator('[data-testid="category-dress"]');
  await categoryBtn.click();
  await page.waitForTimeout(500);
  const dressCards = page.locator('[data-testid="product-card"]');
  const dressCount = await dressCards.count();
  expect(dressCount).toBeGreaterThan(0);

  await page.screenshot({ path: "eval/bugfix-advanced/flowG-final.png" });
});
