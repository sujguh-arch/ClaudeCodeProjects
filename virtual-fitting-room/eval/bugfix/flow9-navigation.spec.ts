import { test, expect } from "@playwright/test";

test.describe("Flow 9: Tab navigation", () => {
  test("navigate between all tabs without crashes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });

    // Verify Closet tab content
    const products = page.locator('[data-testid="product-card"]');
    const initialCount = await products.count();
    expect(initialCount).toBeGreaterThan(0);
    await page.screenshot({ path: "eval/bugfix/flow9-closet.png" });
    console.log(`Closet: ${initialCount} products`);

    // Click Outfits tab
    await page.locator("button:has-text('Outfits')").click();
    await page.waitForTimeout(500);
    // Should show "Your Outfits" heading
    const outfitsHeading = page.getByRole("heading", { name: "Your Outfits" });
    await expect(outfitsHeading).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "eval/bugfix/flow9-outfits.png" });
    console.log("Outfits tab loaded");

    // Click Settings tab
    await page.locator("button:has-text('Settings')").click();
    await page.waitForTimeout(500);
    const settingsHeading = page.getByRole("heading", { name: "Settings" });
    await expect(settingsHeading).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "eval/bugfix/flow9-settings.png" });
    console.log("Settings tab loaded");

    // Click Closet tab again
    await page.locator("button:has-text('Closet')").click();
    await page.waitForTimeout(500);
    const productsAgain = page.locator('[data-testid="product-card"]');
    const finalCount = await productsAgain.count();
    expect(finalCount).toBe(initialCount);
    await page.screenshot({ path: "eval/bugfix/flow9-closet-again.png" });
    console.log(`Closet again: ${finalCount} products (same as initial)`);

    // No blank screens, no crashes - verify page title still exists
    const title = page.locator("h1:has-text('mirror')");
    await expect(title).toBeVisible();
  });
});
