import { test, expect } from "@playwright/test";

test.describe("Flow 2: Product lightbox open/close", () => {
  test("click product opens lightbox with details, close works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });

    // Get first product card info
    const firstCard = page.locator('[data-testid="product-card"]').first();
    const cardTitle = await firstCard.locator("h3").textContent();
    console.log(`Clicking product: ${cardTitle}`);

    // Click the product card
    await firstCard.click();
    await page.waitForTimeout(500);

    // Verify lightbox opens
    const lightbox = page.locator('[data-testid="lightbox"]');
    await expect(lightbox).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "eval/bugfix/flow2-lightbox-open.png", fullPage: true });

    // Verify lightbox has product title
    const lightboxTitle = lightbox.locator("h2");
    await expect(lightboxTitle).toBeVisible();
    const lbTitleText = await lightboxTitle.textContent();
    console.log(`Lightbox title: ${lbTitleText}`);

    // Verify image is visible
    const lightboxImg = lightbox.locator("img").first();
    await expect(lightboxImg).toBeVisible();

    // Verify price is visible (if product has price)
    // Verify store name is visible
    const storeName = lightbox.locator("p").first();
    await expect(storeName).toBeVisible();

    // Close lightbox by clicking the overlay background
    // On mobile, the lightbox is a bottom sheet - click the overlay area at top
    await page.mouse.click(195, 20); // Click top area (overlay)
    await page.waitForTimeout(500);

    // Verify lightbox is closed
    await expect(lightbox).not.toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: "eval/bugfix/flow2-lightbox-closed.png", fullPage: true });

    // Verify app still works - products still visible
    const cards = page.locator('[data-testid="product-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});
