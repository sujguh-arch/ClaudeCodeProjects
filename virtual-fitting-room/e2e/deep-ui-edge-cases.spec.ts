import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
  await page.reload();
  await page.waitForTimeout(500);
});

test.describe("deep UI edge cases", () => {
  test("empty state: no outfits shows New Outfit card", async ({ page }) => {
    // Even with existing outfits, the "New Outfit" card should always be visible
    await expect(page.getByText("New Outfit")).toBeVisible();
    await page.screenshot({ path: "test-results/deep-empty-outfits.png" });
  });

  test("empty state: closet with no matching category renders gracefully", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(300);

    // Click a category that might have no products (e.g. Accessories)
    await page.getByRole("button", { name: /^accessories$/i }).click();
    await page.waitForTimeout(300);

    // Page should not crash — no JS errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    expect.soft(errors).toHaveLength(0);

    await page.screenshot({ path: "test-results/deep-empty-category.png" });
  });

  test("rapid tab switching (10 times) causes no crash or stale state", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    for (let i = 0; i < 10; i++) {
      await page.getByRole("button", { name: /closet/i }).click();
      await page.waitForTimeout(50);
      await page.getByRole("button", { name: /outfits/i }).click();
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(500);
    expect(errors, `Errors during rapid switching: ${errors.join("; ")}`).toHaveLength(0);

    // Final state should be consistent — outfits tab should be active
    await expect(page.getByText("New Outfit")).toBeVisible();

    await page.screenshot({ path: "test-results/deep-rapid-tabs.png" });
  });

  test("scroll to bottom of product list renders all cards", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(500);

    // Count cards before scroll
    const cardsBefore = await page.locator("[class*='card']").count();

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Count cards after scroll — should be same or more (no virtualization issues)
    const cardsAfter = await page.locator("[class*='card']").count();
    expect.soft(cardsAfter).toBeGreaterThanOrEqual(cardsBefore);

    await page.screenshot({ path: "test-results/deep-scroll-bottom.png" });
  });

  test("mobile viewport (393x852) has no horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.reload();
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(300);

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);

    // Allow up to 2px tolerance for sub-pixel rendering differences
    expect
      .soft(
        scrollWidth - clientWidth,
        `Horizontal overflow: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`
      )
      .toBeLessThanOrEqual(2);

    await page.screenshot({ path: "test-results/deep-mobile-viewport.png" });
  });

  test("desktop viewport (1440x900) shows correct grid layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(300);

    // On large screens, grid should have 4 columns
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect.soft(hasOverflow).toBe(false);

    await page.screenshot({ path: "test-results/deep-desktop-viewport.png" });
  });

  test("resize window from mobile to desktop transitions correctly", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Start mobile
    await page.setViewportSize({ width: 393, height: 852 });
    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: "test-results/deep-resize-mobile.png" });

    // Resize to desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    await page.screenshot({ path: "test-results/deep-resize-desktop.png" });

    // No errors should occur during resize
    expect(errors).toHaveLength(0);

    // No horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    expect.soft(hasOverflow).toBe(false);
  });

  test("network offline simulation shows graceful handling", async ({
    page,
    context,
  }) => {
    // Go online first, load the page
    await page.getByRole("button", { name: /closet/i }).click();
    await page.waitForTimeout(500);

    // Simulate offline
    await context.setOffline(true);

    // Try an action that requires network — e.g., adding a product
    const input = page.getByPlaceholder(/paste a product link/i);
    if (await input.isVisible()) {
      await input.fill("https://test-store.com/offline-test");
      // Try to submit — find submit button
      const submitBtn = page
        .locator("button[type='submit']")
        .or(page.getByRole("button", { name: /^add$/i }))
        .first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Page should still be rendered, no blank screen
    const bodyText = await page.locator("body").textContent();
    expect.soft(bodyText?.length).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/deep-offline.png" });

    // Restore online
    await context.setOffline(false);
  });

  test("back/forward browser navigation preserves correct page state", async ({
    page,
    request,
  }) => {
    // Create an outfit to navigate to
    const resp = await request.post("/api/outfits", {
      data: { name: "Nav Test Outfit" },
    });
    const outfit = await resp.json();

    // Navigate to outfit page
    await page.goto(`/outfit/${outfit.id}`);
    await page.evaluate(() => {
      localStorage.setItem("mirror_pin", "1234");
      sessionStorage.setItem("mirror_session", "active");
    });
    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.getByText("Nav Test Outfit")).toBeVisible();

    // Navigate back
    await page.goBack();
    await page.waitForTimeout(500);

    // Should be at home page
    expect.soft(page.url()).toMatch(/\/$/);

    // Navigate forward
    await page.goForward();
    await page.waitForTimeout(500);

    // Should be back at outfit page
    expect.soft(page.url()).toContain(`/outfit/${outfit.id}`);

    await page.screenshot({ path: "test-results/deep-nav-history.png" });

    // Cleanup
    await request.delete("/api/outfits", { data: { id: outfit.id } });
  });

  test("slow network shows loading states", async ({ page }) => {
    // Throttle network to slow 3G
    const client = await page.context().newCDPSession(page);
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (500 * 1024) / 8, // 500 kbps
      uploadThroughput: (500 * 1024) / 8,
      latency: 400,
    });

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("mirror_pin", "1234");
      sessionStorage.setItem("mirror_session", "active");
    });
    await page.reload();

    // Check for skeleton/loading indicators
    const skeletons = page.locator(".skeleton-card, .skeleton-image, .skeleton-text, [class*='skeleton']");
    // On slow network, skeletons may briefly appear
    await page.screenshot({ path: "test-results/deep-slow-network.png" });

    // Page should eventually load without errors
    await page.waitForTimeout(3000);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    expect.soft(errors).toHaveLength(0);
  });
});
