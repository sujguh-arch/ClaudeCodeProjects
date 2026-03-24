import { Page } from "@playwright/test";

export async function bypassAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
}

export async function goHome(page: Page) {
  await page.goto("/");
  await bypassAuth(page);
  await page.reload();
  await page.waitForLoadState("networkidle");
}

export async function switchToTab(page: Page, tab: "closet" | "outfits" | "settings") {
  const tabButton = page.locator(`nav button`).filter({ hasText: tab.charAt(0).toUpperCase() + tab.slice(1) });
  await tabButton.click();
  await page.waitForTimeout(500);
}
