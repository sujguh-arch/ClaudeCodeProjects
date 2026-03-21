import { test } from "@playwright/test";

const BASE = "http://localhost:3000";

async function auth(page: any, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(2000);
}

test("capture all pages", async ({ page }) => {
  test.setTimeout(60000);

  // Desktop home - outfits tab
  await auth(page, BASE);
  await page.screenshot({ path: "ss-home-outfits.png", fullPage: true });

  // Desktop home - closet tab
  const closet = page.getByText(/closet/i).first();
  await closet.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "ss-home-closet.png", fullPage: true });

  // Desktop outfit builder
  const outfitsResp = await page.request.get(`${BASE}/api/outfits`);
  const outfits = await outfitsResp.json();
  if (outfits.length > 0) {
    await auth(page, `${BASE}/outfit/${outfits[0].id}`);
    await page.screenshot({ path: "ss-outfit-desktop.png", fullPage: true });
  }

  // Mobile home
  await page.setViewportSize({ width: 393, height: 852 });
  await auth(page, BASE);
  await page.screenshot({ path: "ss-home-mobile.png", fullPage: true });

  // Mobile closet
  const mCloset = page.getByText(/closet/i).first();
  await mCloset.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "ss-closet-mobile.png", fullPage: true });

  // Mobile outfit
  if (outfits.length > 0) {
    await auth(page, `${BASE}/outfit/${outfits[0].id}`);
    await page.screenshot({ path: "ss-outfit-mobile.png", fullPage: true });
  }
});
