import { test, expect } from "@playwright/test";

test.describe("Flow 8: Settings page", () => {
  test("settings tab shows reference photo section, choose photo button, no PIN", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });

    // Click Settings tab
    const settingsTab = page.locator("button:has-text('Settings')");
    await settingsTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "eval/bugfix/flow8-settings-tab.png" });

    // Verify "Reference Photo" heading exists
    const refPhotoHeading = page.getByRole("heading", { name: "Reference Photo" });
    await expect(refPhotoHeading).toBeVisible({ timeout: 5000 });

    // Verify "Choose Photo" button exists
    const choosePhotoBtn = page.locator("text=Choose Photo");
    await expect(choosePhotoBtn).toBeVisible();

    // Verify NO PIN section exists (should have been removed)
    const pinSection = page.locator("text=PIN");
    const pinVisible = await pinSection.isVisible().catch(() => false);
    expect(pinVisible).toBe(false);
    console.log("No PIN section found (correct)");

    // Verify reference photo area - either shows photo or upload prompt
    const photoOrPrompt = page.locator("text=Upload a clear face photo").or(
      page.locator('img[alt="Reference"]')
    );
    await expect(photoOrPrompt.first()).toBeVisible();

    // Verify app info footer
    const appInfo = page.locator("text=mirror -- Virtual Fitting Room");
    await expect(appInfo).toBeVisible();

    await page.screenshot({ path: "eval/bugfix/flow8-settings-complete.png", fullPage: true });
  });
});
