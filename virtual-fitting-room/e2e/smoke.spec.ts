import { test, expect } from "@playwright/test";

test("page loads and has correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/mirror/i);
});
