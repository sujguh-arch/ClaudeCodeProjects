import { test, expect } from "@playwright/test";
import { goHome, switchToTab } from "./helpers";

test("Flow I: Outfit name editing", async ({ page }) => {
  await goHome(page);
  await switchToTab(page, "outfits");

  // Create new outfit
  const newOutfitBtn = page.locator("button").filter({ hasText: /new outfit/i });
  await newOutfitBtn.click();
  await page.waitForURL(/\/outfit\//);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  // Verify default name "New Outfit" is shown
  const outfitName = page.locator("h2").filter({ hasText: "New Outfit" });
  await expect(outfitName).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: "eval/bugfix-advanced/flowI-before-rename.png" });

  // Click name to edit (has "tap to edit" hint)
  await outfitName.click();
  await page.waitForTimeout(300);

  // Input should appear
  const nameInput = page.locator("input.text-2xl, input[class*='text-2xl']");
  await expect(nameInput).toBeVisible({ timeout: 3000 });

  // Clear and type new name
  await nameInput.fill("Date Night Outfit");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "eval/bugfix-advanced/flowI-typing.png" });

  // Press Enter to save
  await nameInput.press("Enter");
  await page.waitForTimeout(1000);

  // Verify name is updated
  const updatedName = page.locator("h2").filter({ hasText: "Date Night Outfit" });
  await expect(updatedName).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: "eval/bugfix-advanced/flowI-after-rename.png" });

  // Go back to outfits list
  const backLink = page.locator('a[href="/"]');
  await backLink.click();
  await page.waitForLoadState("networkidle");
  await switchToTab(page, "outfits");
  await page.waitForTimeout(1000);

  // Scroll down to find the outfit card with new name (might be at bottom)
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
  await page.waitForTimeout(500);

  // Verify new name shows on outfit card
  const outfitCard = page.locator("h3").filter({ hasText: "Date Night Outfit" });
  const nameVisible = await outfitCard.isVisible().catch(() => false);
  await page.screenshot({ path: "eval/bugfix-advanced/flowI-outfits-list.png" });

  if (!nameVisible) {
    // Try scrolling up if it's near the top
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(500);
    const nameVisible2 = await outfitCard.isVisible().catch(() => false);
    if (!nameVisible2) {
      // Check the page source for the text
      const pageContent = await page.textContent("body");
      expect(pageContent).toContain("Date Night Outfit");
    }
  }
});
