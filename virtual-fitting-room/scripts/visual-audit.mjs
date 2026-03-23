import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const OUT = 'eval/visual-audit-v2';
mkdirSync(OUT, { recursive: true });

const viewports = [
  { name: 'phone', width: 430, height: 932, isMobile: true },
  { name: 'desktop', width: 1440, height: 900 },
];

const pages = {
  phone: [
    { name: 'closet', url: '/' },
    { name: 'outfits', url: '/', clickTab: 'Outfits' },
    { name: 'settings', url: '/', clickTab: 'Settings' },
  ],
  desktop: [
    { name: 'closet', url: '/' },
    { name: 'outfits', url: '/', clickTab: 'Outfits' },
  ],
};

const browser = await chromium.launch();

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile || false,
    deviceScaleFactor: vp.isMobile ? 3 : 2,
  });

  for (const step of pages[vp.name]) {
    const page = await context.newPage();
    await page.goto(`http://localhost:3000${step.url}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    if (step.clickTab) {
      // Click the tab button by finding text content
      const tab = page.locator(`button:has(span:text("${step.clickTab}"))`).first();
      await tab.click({ timeout: 10000 });
      await page.waitForTimeout(1500);
    }

    const path = `${OUT}/${vp.name}-${step.name}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`Saved ${path}`);
    await page.close();
  }

  await context.close();
}

await browser.close();
console.log('Done.');
