import { test, expect } from "@playwright/test";
import { goHome, switchToTab } from "./helpers";

test("Flow F: Empty states", async ({ page }) => {
  await goHome(page);

  // Check each category for empty states
  const categories = ["dress", "shoes", "tights", "bag", "accessories"];

  for (const cat of categories) {
    const btn = page.locator(`[data-testid="category-${cat}"]`);
    await btn.click();
    await page.waitForTimeout(500);

    const countMatch = (await btn.textContent())?.match(/\((\d+)\)/);
    const count = countMatch ? parseInt(countMatch[1]) : 0;

    if (count === 0) {
      // Should show empty state, NOT blank white screen
      const emptyState = page.locator("text=/no .+ yet|closet awaits|add your first/i");
      const isEmptyVisible = await emptyState.isVisible().catch(() => false);
      expect(isEmptyVisible).toBe(true);
      await page.screenshot({ path: `eval/bugfix-advanced/flowF-empty-${cat}.png` });
    } else {
      // Products visible
      const cards = page.locator('[data-testid="product-card"]');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  }

  // Create new outfit with no items
  await switchToTab(page, "outfits");
  const newOutfitBtn = page.locator("button").filter({ hasText: /new outfit/i });
  await newOutfitBtn.click();
  await page.waitForURL(/\/outfit\//);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  // Verify Generate button is NOT visible when no items are added
  const generateBtn = page.locator('[data-testid="generate-button"]');
  const genVisible = await generateBtn.isVisible().catch(() => false);
  expect(genVisible).toBe(false);
  await page.screenshot({ path: "eval/bugfix-advanced/flowF-empty-outfit.png" });

  // All 5 slots should show "Browse closet"
  for (const slot of ["dress", "shoes", "tights", "bag", "accessories"]) {
    const slotCard = page.locator(`[data-testid="outfit-slot-${slot}"]`);
    await expect(slotCard).toBeVisible();
    const browseText = slotCard.locator("text=Browse closet");
    await expect(browseText).toBeVisible();
  }

  await page.screenshot({ path: "eval/bugfix-advanced/flowF-final.png" });
});
