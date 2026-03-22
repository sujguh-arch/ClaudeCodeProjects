import { test, expect } from "@playwright/test";

test.use({
  video: { mode: "on", size: { width: 393, height: 852 } },
  viewport: { width: 393, height: 852 },
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
  await page.reload();
  await page.waitForTimeout(500);
});

test("Sexy Date Night in SF — full app walkthrough", async ({ page }) => {
  // Increase timeout for this demo recording
  test.setTimeout(120_000);

  // 1. Home page — outfits tab (default)
  await expect(page.getByRole("button", { name: /outfits/i })).toBeVisible();
  await page.waitForTimeout(2000);

  // 2. Switch to closet tab
  await page.getByRole("button", { name: /closet/i }).click();
  await page.waitForTimeout(2000);

  // 3. Scroll slowly through the product grid
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(1000);
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(1000);

  // 4. Click on a sexy dress (black or red)
  const dressCard = page.getByText(/eterna mini dress/i).first();
  const hasDress = (await dressCard.count()) > 0;

  if (hasDress) {
    await dressCard.click();
  } else {
    // Fallback: click any dress card
    const anyDress = page.getByText(/mini dress/i).first();
    if ((await anyDress.count()) > 0) {
      await anyDress.click();
    }
  }
  await page.waitForTimeout(1000);

  // 5. Swipe through lightbox images (use arrow keys for reliability)
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(1500);
  }

  // 6. Close lightbox
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // 7. Highlight a Shop button on a product (hover, don't navigate away)
  const shopButtons = page.locator("a").filter({ hasText: /shop/i });
  if ((await shopButtons.count()) > 0) {
    await shopButtons.first().scrollIntoViewIfNeeded();
    await shopButtons.first().hover();
    await page.waitForTimeout(1500);
  }

  // 8. Switch to outfits tab
  await page.getByRole("button", { name: /outfits/i }).click();
  await page.waitForTimeout(1000);

  // 9. Click existing outfit ("Date Night SF") or New Outfit
  const dateNight = page.getByText(/date night/i).first();
  if ((await dateNight.count()) > 0) {
    await dateNight.click();
  } else {
    await page.getByText("New Outfit").click();
  }
  await page.waitForTimeout(2000);

  // 10. Show outfit builder page
  await expect(page).toHaveURL(/\/outfit\//);
  await page.waitForTimeout(2000);

  // 11. Go back home
  await page.locator("nav a").first().click();
  await page.waitForTimeout(1000);

  // 12. Click through category filters
  await page.getByRole("button", { name: /closet/i }).click();
  await page.waitForTimeout(500);

  const categories = ["Shoes", "Accessories", "Bags", "Tights"];
  for (const cat of categories) {
    const filterBtn = page.getByRole("button", { name: new RegExp(`^${cat}$`, "i") });
    if ((await filterBtn.count()) > 0) {
      await filterBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // 13. End on full closet view
  const allBtn = page.getByRole("button", { name: /^all$/i });
  if ((await allBtn.count()) > 0) {
    await allBtn.click();
  }
  await page.waitForTimeout(3000);
});
