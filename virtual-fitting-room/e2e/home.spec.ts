import { test, expect } from "@playwright/test";

// Bypass AuthGate by setting PIN in localStorage before each test
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
  await page.reload();
  // Wait for the app to render past auth gate
  await page.waitForTimeout(500);
});

test.describe("home page", () => {
  test("loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.reload();
    await expect(page).toHaveTitle(/mirror/i);
    expect(errors).toHaveLength(0);
  });

  test("nav bar shows mirror text", async ({ page }) => {
    await expect(page.locator("nav h1")).toContainText("mirror");
  });

  test("outfits tab is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /outfits/i })).toBeVisible();
  });

  test("closet tab is visible and clickable", async ({ page }) => {
    const closetTab = page.getByRole("button", { name: /closet/i });
    await expect(closetTab).toBeVisible();
    await closetTab.click();
    // After clicking closet, should see the "All" category pill
    await expect(page.getByRole("button", { name: /^all$/i })).toBeVisible();
  });

  test("clicking closet tab shows category pills", async ({ page }) => {
    await page.getByRole("button", { name: /closet/i }).click();
    for (const cat of ["All", "Dresses", "Shoes", "Tights", "Bags", "Accessories"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${cat}$`, "i") })).toBeVisible();
    }
  });

  test("outfits tab shows New Outfit card", async ({ page }) => {
    await expect(page.getByText("New Outfit")).toBeVisible();
  });

  test("product input field is present", async ({ page }) => {
    await expect(page.getByPlaceholder(/paste a product link/i)).toBeVisible();
  });

  test("settings link is visible in nav", async ({ page }) => {
    // The settings button is inside a Link wrapping a motion.button
    const settingsBtn = page.locator("nav").locator("a").first();
    // There should be at least one link in the nav (settings)
    const navLinks = page.locator("nav a");
    await expect(navLinks).toHaveCount(1);
  });
});
