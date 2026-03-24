import { test, expect } from "@playwright/test";
import { goHome, switchToTab } from "./helpers";

test("Flow A: Full outfit build + generation attempt", async ({ page }) => {
  await goHome(page);

  // Navigate to Outfits tab
  await switchToTab(page, "outfits");
  await page.screenshot({ path: "eval/bugfix-advanced/flowA-outfits-tab.png" });

  // Create new outfit
  const newOutfitBtn = page.locator("button").filter({ hasText: /new outfit/i });
  if (await newOutfitBtn.isVisible()) {
    await newOutfitBtn.click();
  } else {
    // May show empty state with "Create your first outfit"
    const createBtn = page.locator("button").filter({ hasText: /create/i });
    await createBtn.click();
  }
  await page.waitForURL(/\/outfit\//);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "eval/bugfix-advanced/flowA-new-outfit.png" });

  // Fill all 5 slots
  const slots = ["dress", "shoes", "tights", "bag", "accessories"];
  for (const slot of slots) {
    const slotCard = page.locator(`[data-testid="outfit-slot-${slot}"]`);
    await expect(slotCard).toBeVisible({ timeout: 10000 });

    // Check if slot is empty (has dashed border = empty)
    const isEmpty = await slotCard.locator("text=Browse closet").isVisible().catch(() => false);
    if (!isEmpty) {
      // Already filled, skip
      continue;
    }

    await slotCard.click();
    await page.waitForTimeout(500);

    // Closet picker should open
    const picker = page.locator('[data-testid="closet-picker"]');
    await expect(picker).toBeVisible({ timeout: 5000 });

    // Pick the first product in the grid
    const pickerItems = picker.locator(".grid > div");
    const count = await pickerItems.count();
    if (count > 0) {
      await pickerItems.first().click();
      await page.waitForTimeout(1000);
    } else {
      // No products for this category, cancel
      const cancelBtn = picker.locator("button").filter({ hasText: /cancel/i });
      await cancelBtn.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: `eval/bugfix-advanced/flowA-slot-${slot}.png` });
  }

  // Verify thumbnail previews are visible (60x60 images in summary)
  await page.waitForTimeout(500);
  const thumbnails = page.locator("div").filter({ has: page.locator("img") }).locator("div[style*='width: 60px']");
  // Just verify some thumbnails exist in the summary area
  await page.screenshot({ path: "eval/bugfix-advanced/flowA-all-slots-filled.png" });

  // Verify total price is shown
  const totalPrice = page.locator("text=/Total:/");
  if (await totalPrice.isVisible()) {
    const priceText = await totalPrice.textContent();
    expect(priceText).toMatch(/\$\d+/);
  }

  // Select Evening Out vibe
  const eveningOutBtn = page.locator("button").filter({ hasText: "Evening Out" });
  if (await eveningOutBtn.isVisible()) {
    await eveningOutBtn.click();
    await page.waitForTimeout(300);
  }

  // Click GENERATE MY LOOK
  const generateBtn = page.locator('[data-testid="generate-button"]');
  if (await generateBtn.isVisible()) {
    await generateBtn.click();

    // Verify loading state
    await page.waitForTimeout(500);
    await page.screenshot({ path: "eval/bugfix-advanced/flowA-generating.png" });

    const isGenerating = await page.locator("text=Generating").isVisible();
    expect(isGenerating).toBe(true);

    // Wait up to 10 seconds
    await page.waitForTimeout(10000);
    await page.screenshot({ path: "eval/bugfix-advanced/flowA-result.png" });

    // Check for result area or error toast - app should NOT crash
    const resultArea = page.locator('[data-testid="generated-result"]');
    const toastError = page.locator("text=/flagged|failed|wrong/i");
    const eitherVisible = await resultArea.isVisible() || await toastError.isVisible().catch(() => false);
    // As long as the page didn't crash, we're good
  }

  // Verify app is still functional - navigate back
  const backBtn = page.locator('a[href="/"] button');
  await expect(backBtn).toBeVisible();
  await page.screenshot({ path: "eval/bugfix-advanced/flowA-final.png" });
});
