import { test, expect } from "@playwright/test";

const SCREENSHOT_DIR = "eval/interactive";

test.describe.serial("Outfit Builder", () => {
  let outfitUrl: string;

  test("1 — create outfit and see empty slots", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click the Outfits tab in the bottom nav
    const outfitsTab = page.locator("button", { hasText: "Outfits" });
    await outfitsTab.click();
    await page.waitForTimeout(500);

    // Create outfit via API (avoids click-interception from outfit grid images)
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Outfit" }),
      });
      return res.json();
    });
    const outfitId = response.id;
    expect(outfitId).toBeTruthy();

    // Navigate to the new outfit page
    await page.goto(`/outfit/${outfitId}`);
    await page.waitForLoadState("networkidle");
    outfitUrl = page.url();
    expect(outfitUrl).toContain(`/outfit/${outfitId}`);

    // Verify 5 empty slots visible
    for (const slot of ["dress", "shoes", "tights", "bag", "accessories"]) {
      await expect(page.getByTestId(`outfit-slot-${slot}`)).toBeVisible({
        timeout: 10000,
      });
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-empty-outfit.png`,
      fullPage: true,
    });
  });

  test("2 — click dress slot and browse closet", async ({ page }) => {
    await page.goto(outfitUrl);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Click the dress empty slot
    const dressSlot = page.getByTestId("outfit-slot-dress");
    await dressSlot.click();

    // Verify closet picker opens
    const picker = page.getByTestId("closet-picker");
    await expect(picker).toBeVisible({ timeout: 5000 });

    // Verify it shows product cards with images (filtered to dresses)
    const productCards = picker.locator(".cursor-pointer .relative img");
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-closet-picker-dresses.png`,
      fullPage: true,
    });
  });

  test("3 — select a dress from picker", async ({ page }) => {
    await page.goto(outfitUrl);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Open dress slot picker
    const dressSlot = page.getByTestId("outfit-slot-dress");
    await dressSlot.click();
    const picker = page.getByTestId("closet-picker");
    await expect(picker).toBeVisible({ timeout: 5000 });

    // Click first product in the picker grid
    const firstProduct = picker.locator(".cursor-pointer").first();
    await firstProduct.click();

    // Wait for picker to close
    await expect(picker).toBeHidden({ timeout: 5000 });

    // Verify dress slot now has an image
    const dressSlotAfter = page.getByTestId("outfit-slot-dress");
    await expect(dressSlotAfter.locator("img").first()).toBeVisible({
      timeout: 5000,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-dress-selected.png`,
      fullPage: true,
    });
  });

  test("4 — add shoes and tights too", async ({ page }) => {
    await page.goto(outfitUrl);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Add shoes
    const shoesSlot = page.getByTestId("outfit-slot-shoes");
    await shoesSlot.click();
    const picker = page.getByTestId("closet-picker");
    await expect(picker).toBeVisible({ timeout: 5000 });
    const firstShoe = picker.locator(".cursor-pointer").first();
    await firstShoe.click();
    await expect(picker).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(300);

    // Add tights
    const tightsSlot = page.getByTestId("outfit-slot-tights");
    await tightsSlot.click();
    await expect(picker).toBeVisible({ timeout: 5000 });
    const firstTights = picker.locator(".cursor-pointer").first();
    await firstTights.click();
    await expect(picker).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(300);

    // Verify at least 2 slots now have images (shoes + tights; dress from test 3 too)
    let filledCount = 0;
    for (const slot of ["dress", "shoes", "tights", "bag", "accessories"]) {
      const slotEl = page.getByTestId(`outfit-slot-${slot}`);
      const imgCount = await slotEl.locator("img").count();
      if (imgCount > 0) filledCount++;
    }
    expect(filledCount).toBeGreaterThanOrEqual(2);

    // Verify total price shown
    const totalText = page.locator("text=/Total: \\$/");
    await expect(totalText).toBeVisible({ timeout: 3000 });

    // Verify GENERATE MY LOOK button visible
    const generateBtn = page.getByTestId("generate-button");
    await expect(generateBtn).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-multi-items.png`,
      fullPage: true,
    });
  });

  test("5 — no auto generation", async ({ page }) => {
    await page.goto(outfitUrl);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Button should say "Generate my look" not "Generating..."
    // This verifies no auto-generation is in progress after adding items
    const generateBtn = page.getByTestId("generate-button");
    if (await generateBtn.isVisible()) {
      await expect(generateBtn).toContainText(/generate my look/i);
      await expect(generateBtn).not.toContainText(/generating/i);
    }

    // Verify no "Creating look" text anywhere on the page
    await expect(page.locator("text=Creating look")).toBeHidden();

    // Verify no loading spinner is active on any card
    // (a spinner would have animate-spin class or the Generating... text)
    const spinners = page.locator(".animate-spin");
    const spinnerCount = await spinners.count();
    expect(spinnerCount).toBe(0);
  });

  test("6 — remove and swap dress", async ({ page }) => {
    await page.goto(outfitUrl);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const dressSlot = page.getByTestId("outfit-slot-dress");

    // Check if dress is filled (has an image); if so remove it
    const hasImage = (await dressSlot.locator("img").count()) > 0;
    if (hasImage) {
      // Click the remove button on the dress slot
      const removeBtn = dressSlot.locator("button").filter({ hasText: "✕" });
      await removeBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify dress slot is empty (shows "Browse closet" text)
    await expect(dressSlot.locator("text=Browse closet")).toBeVisible({
      timeout: 3000,
    });

    // Click dress slot to open picker
    await dressSlot.click();
    const picker = page.getByTestId("closet-picker");
    await expect(picker).toBeVisible({ timeout: 5000 });

    // Select a dress (pick second one if available for a different dress)
    const dressCards = picker.locator(".cursor-pointer");
    const cardCount = await dressCards.count();
    const pickIndex = cardCount > 1 ? 1 : 0;
    await dressCards.nth(pickIndex).click();
    await expect(picker).toBeHidden({ timeout: 5000 });

    // Verify dress slot is now filled
    await expect(dressSlot.locator("img").first()).toBeVisible({
      timeout: 5000,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-swapped-dress.png`,
      fullPage: true,
    });
  });

  test("7 — generate button click (mocked)", async ({ page }) => {
    // Intercept the generate API to delay response (keep loading state visible)
    await page.route("**/api/generate", async (route) => {
      // Only intercept POST (the generate call), let GET through
      if (route.request().method() === "POST") {
        await new Promise((r) => setTimeout(r, 10000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ results: [], errors: 0 }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(outfitUrl);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const generateBtn = page.getByTestId("generate-button");
    await expect(generateBtn).toBeVisible({ timeout: 5000 });

    // Click the generate button
    await generateBtn.click();

    // Verify loading state appears
    await expect(generateBtn).toContainText(/generating/i, { timeout: 3000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-generating.png`,
      fullPage: true,
    });
  });
});
