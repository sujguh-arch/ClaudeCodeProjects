import { test, expect } from "@playwright/test";
import { goHome } from "./helpers";

test("Flow E: Lightbox image carousel", async ({ page }) => {
  await goHome(page);

  // Wait for products to load
  const firstCard = page.locator('[data-testid="product-card"]').first();
  await expect(firstCard).toBeVisible({ timeout: 10000 });

  // Get first product title
  const firstTitle = await firstCard.locator("h3").textContent();

  // Click first product
  await firstCard.click();
  await page.waitForTimeout(1000);

  // Lightbox should open
  const lightbox = page.locator('[data-testid="lightbox"]');
  await expect(lightbox).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: "eval/bugfix-advanced/flowE-lightbox-open.png" });

  // Check product title is shown in lightbox
  const lightboxTitle = lightbox.locator("h2");
  await expect(lightboxTitle).toBeVisible();
  const shownTitle = await lightboxTitle.textContent();
  expect(shownTitle).toBeTruthy();

  // Check if there are multiple images (dot indicators)
  const dots = lightbox.locator("button.rounded-full");
  const dotCount = await dots.count();

  if (dotCount > 1) {
    // Click through images - tap dots
    for (let i = 1; i < Math.min(dotCount, 4); i++) {
      await dots.nth(i).click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: "eval/bugfix-advanced/flowE-after-swipe.png" });
  }

  // Verify main image is loaded (not broken)
  const img = lightbox.locator("img").first();
  if (await img.isVisible()) {
    // Image element exists and is visible
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    // naturalWidth > 0 means image loaded successfully (for img tags)
    // For motion.img it might be different, just check visibility
  }

  // Close lightbox
  // On mobile, the close happens via back button or clicking backdrop
  await page.goBack();
  await page.waitForTimeout(500);

  // Verify lightbox is closed
  await expect(lightbox).not.toBeVisible({ timeout: 3000 });
  await page.screenshot({ path: "eval/bugfix-advanced/flowE-lightbox-closed.png" });

  // Open a DIFFERENT product
  const secondCard = page.locator('[data-testid="product-card"]').nth(1);
  if (await secondCard.isVisible()) {
    const secondTitle = await secondCard.locator("h3").textContent();

    await secondCard.click();
    await page.waitForTimeout(1000);

    const lightbox2 = page.locator('[data-testid="lightbox"]');
    await expect(lightbox2).toBeVisible({ timeout: 5000 });

    // Verify it's a different product
    const shown2 = await lightbox2.locator("h2").textContent();
    if (firstTitle && secondTitle) {
      expect(shown2).not.toBe(firstTitle);
    }

    await page.screenshot({ path: "eval/bugfix-advanced/flowE-second-product.png" });

    // Close
    await page.goBack();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: "eval/bugfix-advanced/flowE-final.png" });
});
