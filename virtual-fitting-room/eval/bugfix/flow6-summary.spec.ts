import { test, expect } from "@playwright/test";

test.describe("Flow 6: Outfit summary + price", () => {
  test("after filling slots, see thumbnails, total price, generate button, vibe chips", async ({ page }) => {
    // Create outfit and fill slots
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

    // Add shoes
    await page.locator('[data-testid="outfit-slot-shoes"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="closet-picker"] .cursor-pointer').first().click();
    await page.waitForTimeout(1000);

    // Add tights
    await page.locator('[data-testid="outfit-slot-tights"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-testid="closet-picker"] .cursor-pointer').first().click();
    await page.waitForTimeout(1000);

    // Now verify summary section
    await page.screenshot({ path: "eval/bugfix/flow6-summary-top.png", fullPage: false });

    // Scroll down to see summary
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "eval/bugfix/flow6-summary-bottom.png", fullPage: true });

    // Verify thumbnail row (60x60 images in summary)
    const thumbnails = page.locator('div[style*="width: 60px"]');
    const thumbCount = await thumbnails.count();
    console.log(`Thumbnail count: ${thumbCount}`);
    expect(thumbCount).toBeGreaterThanOrEqual(3);

    // Verify total price is visible
    const totalPrice = page.locator("text=Total:");
    await expect(totalPrice).toBeVisible();
    const priceText = await totalPrice.textContent();
    console.log(`Total price: ${priceText}`);
    expect(priceText).toMatch(/Total: \$/);

    // Verify GENERATE MY LOOK button exists
    const generateBtn = page.locator('[data-testid="generate-button"]');
    await expect(generateBtn).toBeVisible();
    const btnText = await generateBtn.textContent();
    console.log(`Generate button text: ${btnText}`);
    expect(btnText?.toLowerCase()).toContain("generate");

    // Verify vibe/pose selector chips
    const vibeChips = page.locator("text=Choose your vibe");
    await expect(vibeChips).toBeVisible();

    // Check specific pose options exist
    for (const pose of ["Editorial", "Walking", "Seated", "Candid"]) {
      const chip = page.locator(`button:has-text("${pose}")`);
      await expect(chip).toBeVisible();
    }

    await page.screenshot({ path: "eval/bugfix/flow6-complete.png", fullPage: true });
  });
});
