import { test, expect } from "@playwright/test";

let outfitId: string;

test.beforeAll(async ({ request }) => {
  // Create a test outfit via API
  const resp = await request.post("/api/outfits", {
    data: { name: "E2E Test Outfit" },
  });
  const outfit = await resp.json();
  outfitId = outfit.id;
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
});

test.describe("outfit builder", () => {
  test("page loads and shows outfit name", async ({ page }) => {
    await page.goto(`/outfit/${outfitId}`);
    await expect(page.getByText("E2E Test Outfit")).toBeVisible();
  });

  test("outfit name is editable", async ({ page }) => {
    await page.goto(`/outfit/${outfitId}`);
    await page.getByText("E2E Test Outfit").click();
    const input = page.locator("input[type='text'], input:not([type])").first();
    // Should have an editable input or the h2 should be clickable
    await expect(page.locator("input")).toBeVisible();
  });

  test("all 5 empty slots visible with labels", async ({ page }) => {
    await page.goto(`/outfit/${outfitId}`);
    for (const label of ["Dress", "Shoes", "Tights", "Bag", "Accessories"]) {
      await expect(page.getByText(`Add ${label}`)).toBeVisible();
    }
  });

  test("clicking empty slot opens add-item sheet", async ({ page }) => {
    await page.goto(`/outfit/${outfitId}`);
    await page.getByText("Add Dress").click();
    await expect(page.getByPlaceholder(/paste.*link/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cancel/i })).toBeVisible();
  });

  test("cancel button closes the sheet", async ({ page }) => {
    await page.goto(`/outfit/${outfitId}`);
    await page.getByText("Add Shoes").click();
    await expect(page.getByPlaceholder(/paste.*link/i)).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();
    // Sheet should be gone
    await expect(page.getByPlaceholder(/paste.*link/i)).not.toBeVisible();
  });

  test("back button navigates to home", async ({ page }) => {
    await page.goto(`/outfit/${outfitId}`);
    // The back button is the first button in nav with an SVG arrow
    await page.locator("nav a").first().click();
    await expect(page).toHaveURL("/");
  });
});

test.afterAll(async ({ request }) => {
  // Clean up test outfit
  if (outfitId) {
    await request.delete("/api/outfits", {
      data: { id: outfitId },
    });
  }
});
