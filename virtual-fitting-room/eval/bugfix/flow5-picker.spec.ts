import { test, expect } from "@playwright/test";

test.describe("Flow 5: Closet picker and add items to outfit", () => {
  test("pick dress, shoes, tights from closet picker", async ({ page }) => {
    // First create a new outfit
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });

    // Go to outfits tab and create new outfit
    await page.locator("button:has-text('Outfits')").click();
    await page.waitForTimeout(500);
    await page.locator("button:has-text('+ New Outfit')").click();
    await page.waitForURL(/\/outfit\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Click the Dress empty slot
    const dressSlot = page.locator('[data-testid="outfit-slot-dress"]');
    await expect(dressSlot).toBeVisible({ timeout: 5000 });
    await dressSlot.click();
    await page.waitForTimeout(500);

    // Closet picker should open
    const picker = page.locator('[data-testid="closet-picker"]');
    await expect(picker).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "eval/bugfix/flow5-dress-picker.png", fullPage: true });

    // Verify picker shows dress products
    const pickerItems = picker.locator(".cursor-pointer .relative");
    const pickerCount = await pickerItems.count();
    console.log(`Dress picker has ${pickerCount} items`);
    expect(pickerCount).toBeGreaterThan(0);

    // Click the first dress
    await picker.locator(".cursor-pointer").first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "eval/bugfix/flow5-dress-selected.png", fullPage: true });

    // Verify dress slot is now filled (has an image)
    const dressSlotImg = page.locator('[data-testid="outfit-slot-dress"] img');
    await expect(dressSlotImg).toBeVisible({ timeout: 5000 });

    // Click the Shoes empty slot
    const shoesSlot = page.locator('[data-testid="outfit-slot-shoes"]');
    await shoesSlot.click();
    await page.waitForTimeout(500);

    // Picker should open for shoes
    const shoesPicker = page.locator('[data-testid="closet-picker"]');
    await expect(shoesPicker).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "eval/bugfix/flow5-shoes-picker.png", fullPage: true });

    // Pick first shoes
    await shoesPicker.locator(".cursor-pointer").first().click();
    await page.waitForTimeout(1000);

    // Verify shoes slot filled
    const shoesSlotImg = page.locator('[data-testid="outfit-slot-shoes"] img');
    await expect(shoesSlotImg).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "eval/bugfix/flow5-shoes-selected.png", fullPage: true });

    // Click Tights slot
    const tightsSlot = page.locator('[data-testid="outfit-slot-tights"]');
    await tightsSlot.click();
    await page.waitForTimeout(500);

    const tightsPicker = page.locator('[data-testid="closet-picker"]');
    await expect(tightsPicker).toBeVisible({ timeout: 5000 });

    // Pick first tights
    await tightsPicker.locator(".cursor-pointer").first().click();
    await page.waitForTimeout(1000);

    // Verify tights slot filled
    const tightsSlotImg = page.locator('[data-testid="outfit-slot-tights"] img');
    await expect(tightsSlotImg).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "eval/bugfix/flow5-all-selected.png", fullPage: true });

    // All 3 slots should be filled
    console.log("All 3 slots (dress, shoes, tights) filled successfully");
  });
});
