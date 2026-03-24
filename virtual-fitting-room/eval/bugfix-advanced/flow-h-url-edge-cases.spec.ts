import { test, expect } from "@playwright/test";
import { goHome } from "./helpers";

test("Flow H: URL input edge cases", async ({ page }) => {
  await goHome(page);

  // Click + to open add product modal
  const addBtn = page.locator('[data-testid="add-button"]').first();
  await addBtn.click();
  await page.waitForTimeout(500);

  const modal = page.locator('[data-testid="add-product-modal"]');
  await expect(modal).toBeVisible({ timeout: 5000 });
  await page.screenshot({ path: "eval/bugfix-advanced/flowH-modal-open.png" });

  // Test 1: Submit empty URL
  const submitBtn = modal.locator("button[type='submit']");
  await submitBtn.click();
  await page.waitForTimeout(500);
  // HTML5 validation should prevent submission (required field)
  // Modal should still be open
  await expect(modal).toBeVisible();
  await page.screenshot({ path: "eval/bugfix-advanced/flowH-empty-url.png" });

  // Test 2: Submit invalid URL
  const urlInput = modal.locator("input[type='url']");
  await urlInput.fill("not-a-url");
  await submitBtn.click();
  await page.waitForTimeout(500);
  // HTML5 url validation should catch this
  await expect(modal).toBeVisible();
  await page.screenshot({ path: "eval/bugfix-advanced/flowH-invalid-url.png" });

  // Test 3: Submit a URL that doesn't exist
  await urlInput.fill("https://www.notarealstore12345.com/products/fake");
  await submitBtn.click();
  await page.waitForTimeout(5000); // Wait for scraping to fail

  // Should show error message
  const errorMsg = modal.locator("p").filter({ hasText: /failed|error|couldn/i });
  const hasError = await errorMsg.isVisible().catch(() => false);
  await page.screenshot({ path: "eval/bugfix-advanced/flowH-fake-url-error.png" });

  // Test 4: Check for duplicate detection - get first product URL from API
  const products = await page.evaluate(async () => {
    const res = await fetch("/api/products");
    return res.json();
  });

  if (products.length > 0) {
    // Close modal first if error state
    const cancelBtn = modal.locator("button").filter({ hasText: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
    }

    // Re-open modal
    await addBtn.click();
    await page.waitForTimeout(500);

    const modal2 = page.locator('[data-testid="add-product-modal"]');
    const urlInput2 = modal2.locator("input[type='url']");
    const submitBtn2 = modal2.locator("button[type='submit']");

    // Submit existing product URL
    await urlInput2.fill(products[0].url);
    await submitBtn2.click();
    await page.waitForTimeout(5000);

    // Should show duplicate warning/error
    await page.screenshot({ path: "eval/bugfix-advanced/flowH-duplicate-url.png" });
  }

  await page.screenshot({ path: "eval/bugfix-advanced/flowH-final.png" });
});
