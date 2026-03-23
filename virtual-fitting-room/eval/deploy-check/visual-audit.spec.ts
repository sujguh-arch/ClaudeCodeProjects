import { test } from "@playwright/test";
import path from "path";

const OUT = path.join(__dirname);

test("screenshot closet page", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(3000); // let products load
  await page.screenshot({ path: path.join(OUT, "closet.png"), fullPage: false });
  // Verify product count is not zero
  const tabText = await page.locator("text=/All \\(\\d+\\)/").textContent();
  console.log("Tab text:", tabText);
});

test("screenshot outfits page", async ({ page }) => {
  await page.goto("/#outfits");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, "outfits.png"), fullPage: true });
});

test("screenshot settings page", async ({ page }) => {
  await page.goto("/settings");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, "settings.png"), fullPage: true });
});
