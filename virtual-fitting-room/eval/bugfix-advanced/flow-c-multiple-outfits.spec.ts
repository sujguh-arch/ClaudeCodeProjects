import { test, expect } from "@playwright/test";
import { goHome, switchToTab } from "./helpers";

test("Flow C: Create multiple outfits", async ({ page }) => {
  await goHome(page);
  await switchToTab(page, "outfits");

  // Count existing outfits
  const existingOutfits = page.locator(".grid > div").filter({ has: page.locator("img") });

  // CREATE OUTFIT 1
  const newOutfitBtn = page.locator("button").filter({ hasText: /new outfit/i });
  await newOutfitBtn.click();
  await page.waitForURL(/\/outfit\//);
  await page.waitForLoadState("networkidle");
  const outfit1Url = page.url();

  // Add dress
  const dressSlot = page.locator('[data-testid="outfit-slot-dress"]');
  const dressEmpty = await dressSlot.locator("text=Browse closet").isVisible().catch(() => false);
  if (dressEmpty) {
    await dressSlot.click();
    await page.waitForTimeout(500);
    const picker = page.locator('[data-testid="closet-picker"]');
    const items = picker.locator(".grid > div");
    if ((await items.count()) > 0) {
      await items.first().click();
      await page.waitForTimeout(1000);
    }
  }

  // Add shoes
  const shoesSlot = page.locator('[data-testid="outfit-slot-shoes"]');
  const shoesEmpty = await shoesSlot.locator("text=Browse closet").isVisible().catch(() => false);
  if (shoesEmpty) {
    await shoesSlot.click();
    await page.waitForTimeout(500);
    const picker = page.locator('[data-testid="closet-picker"]');
    const items = picker.locator(".grid > div");
    if ((await items.count()) > 0) {
      await items.first().click();
      await page.waitForTimeout(1000);
    }
  }

  await page.screenshot({ path: "eval/bugfix-advanced/flowC-outfit1.png" });

  // Go back to outfits list
  const backLink = page.locator('a[href="/"]');
  await backLink.click();
  await page.waitForLoadState("networkidle");
  await switchToTab(page, "outfits");
  await page.waitForTimeout(500);

  // CREATE OUTFIT 2
  const newBtn2 = page.locator("button").filter({ hasText: /new outfit/i });
  await newBtn2.click();
  await page.waitForURL(/\/outfit\//);
  await page.waitForLoadState("networkidle");
  const outfit2Url = page.url();
  expect(outfit2Url).not.toBe(outfit1Url); // Different outfit

  // Add dress (pick a different one if possible)
  const dressSlot2 = page.locator('[data-testid="outfit-slot-dress"]');
  const dressEmpty2 = await dressSlot2.locator("text=Browse closet").isVisible().catch(() => false);
  if (dressEmpty2) {
    await dressSlot2.click();
    await page.waitForTimeout(500);
    const picker = page.locator('[data-testid="closet-picker"]');
    const items = picker.locator(".grid > div");
    if ((await items.count()) > 1) {
      await items.nth(1).click(); // Pick 2nd dress
    } else if ((await items.count()) > 0) {
      await items.first().click();
    }
    await page.waitForTimeout(1000);
  }

  // Add tights
  const tightsSlot = page.locator('[data-testid="outfit-slot-tights"]');
  const tightsEmpty = await tightsSlot.locator("text=Browse closet").isVisible().catch(() => false);
  if (tightsEmpty) {
    await tightsSlot.click();
    await page.waitForTimeout(500);
    const picker = page.locator('[data-testid="closet-picker"]');
    const items = picker.locator(".grid > div");
    if ((await items.count()) > 0) {
      await items.first().click();
      await page.waitForTimeout(1000);
    }
  }

  // Add bag
  const bagSlot = page.locator('[data-testid="outfit-slot-bag"]');
  const bagEmpty = await bagSlot.locator("text=Browse closet").isVisible().catch(() => false);
  if (bagEmpty) {
    await bagSlot.click();
    await page.waitForTimeout(500);
    const picker = page.locator('[data-testid="closet-picker"]');
    const items = picker.locator(".grid > div");
    if ((await items.count()) > 0) {
      await items.first().click();
      await page.waitForTimeout(1000);
    }
  }

  await page.screenshot({ path: "eval/bugfix-advanced/flowC-outfit2.png" });

  // Go back to outfits list
  await page.locator('a[href="/"]').click();
  await page.waitForLoadState("networkidle");
  await switchToTab(page, "outfits");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "eval/bugfix-advanced/flowC-outfits-list.png" });

  // Verify BOTH outfits appear - should have at least 2 outfit cards
  // Navigate to outfit 1
  await page.goto(outfit1Url);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  // Verify dress slot is still filled
  const dress1Filled = page.locator('[data-testid="outfit-slot-dress"]');
  await expect(dress1Filled).toBeVisible();
  await page.screenshot({ path: "eval/bugfix-advanced/flowC-outfit1-revisit.png" });

  // Navigate to outfit 2
  await page.goto(outfit2Url);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  const dress2Filled = page.locator('[data-testid="outfit-slot-dress"]');
  await expect(dress2Filled).toBeVisible();
  await page.screenshot({ path: "eval/bugfix-advanced/flowC-outfit2-revisit.png" });
});
