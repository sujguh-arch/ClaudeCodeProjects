import { test, expect } from "@playwright/test";
import { goHome, switchToTab } from "./helpers";

test("Flow J: Back navigation", async ({ page }) => {
  await goHome(page);

  // TEST 1: Closet → click product → lightbox → close → still on closet
  const firstCard = page.locator('[data-testid="product-card"]').first();
  await expect(firstCard).toBeVisible({ timeout: 10000 });

  await firstCard.click();
  await page.waitForTimeout(1000);

  const lightbox = page.locator('[data-testid="lightbox"]');
  await expect(lightbox).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: "eval/bugfix-advanced/flowJ-lightbox.png" });

  // Close lightbox via back
  await page.goBack();
  await page.waitForTimeout(500);
  await expect(lightbox).not.toBeVisible({ timeout: 3000 });

  // Still on closet - products visible
  const cards = page.locator('[data-testid="product-card"]');
  expect(await cards.count()).toBeGreaterThan(0);
  await page.screenshot({ path: "eval/bugfix-advanced/flowJ-back-to-closet.png" });

  // TEST 2: Closet → Outfits → create outfit → back → outfits list
  await switchToTab(page, "outfits");
  await page.waitForTimeout(500);

  // Check if we have an existing outfit to click into
  const outfitCards = page.locator(".grid .cursor-pointer").filter({ has: page.locator("h3") });
  const outfitCount = await outfitCards.count();

  if (outfitCount > 0) {
    // Click into first existing outfit
    await outfitCards.first().click();
    await page.waitForURL(/\/outfit\//);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "eval/bugfix-advanced/flowJ-in-outfit.png" });

    // Use back link
    const backLink = page.locator('a[href="/"]');
    await backLink.click();
    await page.waitForLoadState("networkidle");

    // Should be back on home
    const mainPage = page.locator("text=mirror");
    await expect(mainPage.first()).toBeVisible();
    await page.screenshot({ path: "eval/bugfix-advanced/flowJ-back-to-home.png" });

    // Navigate back to outfits tab
    await switchToTab(page, "outfits");
    await page.waitForTimeout(500);

    // Outfits should still be there
    await page.screenshot({ path: "eval/bugfix-advanced/flowJ-outfits-preserved.png" });
  }

  // TEST 3: Browser back button from outfit page
  // Create a new outfit to test browser back
  const newBtn = page.locator("button").filter({ hasText: /new outfit/i });
  if (await newBtn.isVisible()) {
    await newBtn.click();
    await page.waitForURL(/\/outfit\//);
    await page.waitForLoadState("networkidle");

    // Browser back
    await page.goBack();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Should not be a blank screen
    const bodyText = await page.textContent("body");
    expect(bodyText?.length).toBeGreaterThan(10);
    await page.screenshot({ path: "eval/bugfix-advanced/flowJ-browser-back.png" });
  }

  // TEST 4: Verify no blank screens at any point during tab switches
  const tabs = ["closet", "outfits", "settings"] as const;
  for (const tab of tabs) {
    await switchToTab(page, tab);
    await page.waitForTimeout(300);
    const content = await page.textContent("main");
    expect(content?.length).toBeGreaterThan(5);
  }

  await page.screenshot({ path: "eval/bugfix-advanced/flowJ-final.png" });
});
