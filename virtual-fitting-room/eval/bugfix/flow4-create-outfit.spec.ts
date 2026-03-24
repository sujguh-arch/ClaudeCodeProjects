import { test, expect } from "@playwright/test";

test.describe("Flow 4: Create new outfit", () => {
  test("navigate to outfits, create new outfit, see empty slots", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });

    // Click Outfits tab
    const outfitsTab = page.locator("button:has-text('Outfits')");
    await outfitsTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "eval/bugfix/flow4-outfits-tab.png" });

    // Click + New Outfit button
    const newOutfitBtn = page.locator("button:has-text('+ New Outfit')");
    await expect(newOutfitBtn).toBeVisible({ timeout: 5000 });
    await newOutfitBtn.click();

    // Should navigate to /outfit/[id]
    await page.waitForURL(/\/outfit\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "eval/bugfix/flow4-outfit-page.png", fullPage: true });

    // Verify we're on the outfit page
    expect(page.url()).toMatch(/\/outfit\//);

    // Verify 5 empty slots exist
    const slots = page.locator('[data-testid^="outfit-slot-"]');
    await expect(slots.first()).toBeVisible({ timeout: 5000 });
    const slotCount = await slots.count();
    console.log(`Found ${slotCount} outfit slots`);
    expect(slotCount).toBe(5);

    // Verify slots have labels
    for (const label of ["Dress", "Shoes", "Tights", "Bag", "Accessories"]) {
      const slot = page.locator(`text=${label}`).first();
      await expect(slot).toBeVisible();
    }

    await page.screenshot({ path: "eval/bugfix/flow4-empty-slots.png", fullPage: true });
  });
});
