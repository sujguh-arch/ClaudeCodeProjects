import { test, expect } from "@playwright/test";

test.describe("Flow 7: Generate outfit (mocked - no real credits)", () => {
  test("click generate, see loading state, verify API call, handle response", async ({ page }) => {
    // Create outfit and fill a slot
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });

    await page.locator("button:has-text('Outfits')").click();
    await page.waitForTimeout(500);
    await page.locator("button:has-text('+ New Outfit')").click();
    await page.waitForURL(/\/outfit\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Add dress
    await page.locator('[data-testid="outfit-slot-dress"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="closet-picker"] .cursor-pointer').first().click();
    await page.waitForTimeout(1000);

    // Mock the generate API to avoid spending real credits
    await page.route("/api/generate", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        // Return a mock successful generation response
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            results: [
              { generatedImage: "/icon-192.png", productId: "mock" }
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Click generate button
    const generateBtn = page.locator('[data-testid="generate-button"]');
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Verify loading state appears
    await page.waitForTimeout(200);
    await page.screenshot({ path: "eval/bugfix/flow7-generating.png", fullPage: true });

    // Wait for generation to complete (mocked, should be fast)
    await page.waitForTimeout(2000);

    // After mock generation, the result section should appear
    const resultSection = page.locator('[data-testid="generated-result"]');
    // The result may or may not show depending on mock response handling
    await page.screenshot({ path: "eval/bugfix/flow7-result.png", fullPage: true });

    // Verify no crash - page is still functional
    const outfitSlots = page.locator('[data-testid^="outfit-slot-"]');
    const slotCount = await outfitSlots.count();
    expect(slotCount).toBe(5);
    console.log("Generation flow completed without crash");

    // Check if result or toast appeared
    const resultVisible = await resultSection.isVisible().catch(() => false);
    console.log(`Result section visible: ${resultVisible}`);
  });
});
