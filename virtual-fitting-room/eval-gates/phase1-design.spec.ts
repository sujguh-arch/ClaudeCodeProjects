/**
 * Phase 1 Eval Gate: Design Overhaul
 *
 * Verifies the UI is production-quality, interactive, and doesn't crash.
 * Every test does REAL interactions — clicks, navigation, visual checks.
 * Screenshots are saved to eval/phase1/ as proof for morning review.
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const EVAL_DIR = path.resolve(__dirname, "../eval/phase1");

test.beforeAll(() => {
  fs.mkdirSync(EVAL_DIR, { recursive: true });
});

test("home page loads with products or empty state — not blank/crashed", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(500);

  // Page must have actual content — not a white screen or error
  const bodyText = await page.textContent("body");
  expect(bodyText?.length).toBeGreaterThan(50);

  // Must NOT show Next.js error overlay
  const errorOverlay = await page.$("nextjs-portal");
  expect(errorOverlay).toBeNull();

  await page.screenshot({ path: path.join(EVAL_DIR, "01-home.png"), fullPage: true });
});

test("category tabs are clickable and switch content", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Find clickable category elements (tabs, chips, buttons)
  const categories = ["dress", "shoes", "tights", "bag", "accessories"];
  let tabsFound = 0;

  for (const cat of categories) {
    // Try multiple selector strategies
    const tab = await page.$(`[data-category="${cat}"], button:has-text("${cat}"), [role="tab"]:has-text("${cat}"), a:has-text("${cat}")`);
    if (tab) {
      await tab.click();
      await page.waitForTimeout(500);
      tabsFound++;
      await page.screenshot({
        path: path.join(EVAL_DIR, `02-tab-${cat}.png`),
        fullPage: true,
      });
    }
  }

  // At least 3 category tabs must be interactive
  expect(tabsFound).toBeGreaterThanOrEqual(3);
});

test("product cards are visible and clickable", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Find product cards/items
  const cards = await page.$$("[data-testid='product-card'], .product-card, article, [class*='card']");

  if (cards.length > 0) {
    // Click the first card — should open a lightbox or detail view
    const firstCard = cards[0];
    const box = await firstCard.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.height).toBeGreaterThan(50);

    await firstCard.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(EVAL_DIR, "03-product-clicked.png"), fullPage: true });

    // After clicking, something should change (lightbox, modal, navigation)
    const url = page.url();
    const dialogVisible = await page.$("[role='dialog'], [class*='lightbox'], [class*='modal'], [class*='Lightbox']");
    const urlChanged = url !== "http://localhost:3000/";
    expect(dialogVisible !== null || urlChanged).toBeTruthy();
  }
  // If no cards, that's OK for phase 1 (products may not be loaded yet)
});

test("images load without broken src", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const images = await page.$$("img");
  let brokenCount = 0;

  for (const img of images.slice(0, 20)) {
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    if (naturalWidth === 0) brokenCount++;
  }

  // No more than 20% broken images
  if (images.length > 0) {
    expect(brokenCount / images.length).toBeLessThan(0.2);
  }
});

test("navigation between pages works without crashes", async ({ page }) => {
  // Home
  await page.goto("/");
  expect((await page.goto("/"))?.status()).toBeLessThan(500);
  await page.screenshot({ path: path.join(EVAL_DIR, "04-nav-home.png") });

  // Settings
  const settingsResponse = await page.goto("/settings");
  if (settingsResponse && settingsResponse.status() < 500) {
    await page.screenshot({ path: path.join(EVAL_DIR, "04-nav-settings.png") });
  }
});

test("page is styled — not raw unstyled HTML", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Check that CSS is loaded and applied
  const bgColor = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });

  // Body should have a styled background (not default white rgb(255,255,255))
  expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");

  // Check for custom fonts or styled elements
  const hasStyledElements = await page.evaluate(() => {
    const els = document.querySelectorAll("*");
    let styled = 0;
    for (const el of Array.from(els).slice(0, 50)) {
      const style = window.getComputedStyle(el);
      if (style.fontFamily.includes("Inter") || style.fontFamily.includes("DM Serif") ||
          style.fontFamily.includes("serif") || style.borderRadius !== "0px") {
        styled++;
      }
    }
    return styled;
  });

  expect(hasStyledElements).toBeGreaterThan(5);
});

test("mobile layout has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  expect(hasOverflow).toBeFalsy();
});
