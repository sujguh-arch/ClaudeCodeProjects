import { chromium } from "playwright";
import * as path from "path";

const PROFILE_DIR = path.join(__dirname, "..", ".pw-profile");

async function testSpinachUrl() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    const testUrl = "https://shef.com/order/shef/wayne-x/murg-palak-chicken-and-spinach-16-oz-16936";
    console.log(`Testing: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    const addBtn = page.locator('button:has-text("Add")').first();
    const updateBtn = page.locator('button:has-text("Update")').first();
    const hasAdd = await addBtn.isVisible({ timeout: 1000 }).catch(() => false);
    const hasUpdate = await updateBtn.isVisible({ timeout: 1000 }).catch(() => false);

    console.log(`Add button: ${hasAdd}, Update button: ${hasUpdate}`);
    console.log(`Valid: ${hasAdd || hasUpdate}`);

  } finally {
    await context.close();
  }
}

testSpinachUrl().catch(console.error);
