import { test } from "@playwright/test";

test.use({
  video: { mode: "on", size: { width: 390, height: 844 } },
  viewport: { width: 390, height: 844 },
});

test("complete happy path video recording", async ({ page }) => {
  // 1. Open app — show home screen with products
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 2. Browse categories — click through each tab
  const tabs = ["dress", "shoes", "tights", "accessories"];
  for (const tab of tabs) {
    const tabEl = await page.$(
      `[data-category="${tab}"], button:has-text("${tab}"), [data-testid="category-tab"]:has-text("${tab}")`
    );
    if (tabEl) {
      await tabEl.click();
      await page.waitForTimeout(1500);
    }
  }

  // 3. Click all tab to show everything
  const allTab = await page.$("[data-category=all], button:has-text('All')");
  if (allTab) await allTab.click();
  await page.waitForTimeout(1000);

  // 4. Click a product — open lightbox
  const card = await page.$("[data-testid=product-card], article:has(img)");
  if (card) {
    await card.click();
    await page.waitForTimeout(2000);
  }

  // 5. Close lightbox
  const closeBtn = await page.$(
    "[aria-label=Close], button:has-text('Close'), [class*=close]"
  );
  if (closeBtn) await closeBtn.click();
  await page.waitForTimeout(1000);

  // 6. Navigate to settings
  const settingsTab = await page.$(
    "a[href='/settings'], button:has-text('Settings'), [data-testid=tab-settings]"
  );
  if (settingsTab) {
    await settingsTab.click();
    await page.waitForTimeout(2000);
  }

  // 7. Go back to closet
  await page.goto("/");
  await page.waitForTimeout(2000);
});
