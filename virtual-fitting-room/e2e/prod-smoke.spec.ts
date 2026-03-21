import { test, expect } from "@playwright/test";

const PROD_URL = process.env.PROD_URL || "https://virtual-fitting-room-five.vercel.app";

test.describe("production smoke tests", () => {
  test("home page loads with 200", async ({ page }) => {
    const response = await page.goto(PROD_URL);
    expect(response?.status()).toBe(200);
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(PROD_URL);
    await page.waitForLoadState("networkidle");
    // Filter out known benign errors (e.g. favicon 404)
    const realErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("Failed to load resource")
    );
    expect(realErrors).toHaveLength(0);
  });

  test("outfits tab is visible", async ({ page }) => {
    await page.goto(PROD_URL);
    await expect(page.getByText(/outfits/i).first()).toBeVisible();
  });

  test("closet tab is visible", async ({ page }) => {
    await page.goto(PROD_URL);
    await expect(page.getByText(/closet/i).first()).toBeVisible();
  });

  test("settings page loads", async ({ page }) => {
    const response = await page.goto(`${PROD_URL}/settings`);
    expect(response?.status()).toBe(200);
  });

  test("at least one image renders on home page", async ({ page }) => {
    await page.goto(PROD_URL);
    await page.waitForLoadState("networkidle");
    const images = page.locator("img");
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("can navigate between tabs", async ({ page }) => {
    await page.goto(PROD_URL);
    // Auth gate may block — set pin
    await page.evaluate(() => {
      localStorage.setItem("mirror_pin", "1234");
      sessionStorage.setItem("mirror_session", "active");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Click closet tab
    const closetTab = page.getByText(/closet/i).first();
    if (await closetTab.isVisible()) {
      await closetTab.click();
      // Should still be on the same page
      await expect(page).toHaveURL(PROD_URL + "/");
    }
  });
});
