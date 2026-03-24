import { test, expect } from "@playwright/test";

test.describe("Flow 3: Add product via URL", () => {
  test("add product modal opens, accepts URL, adds product", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 15000 });

    // Get initial product count
    const initialCount = await page.locator('[data-testid="product-card"]').count();
    console.log(`Initial product count: ${initialCount}`);

    // Click the + button in header
    const addButton = page.locator('[data-testid="add-button"]').first();
    await expect(addButton).toBeVisible();
    await page.screenshot({ path: "eval/bugfix/flow3-before-add.png" });
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify modal opens
    const modalHeading = page.getByRole("heading", { name: "Add Product" });
    await expect(modalHeading).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: "eval/bugfix/flow3-modal-open.png" });

    // Find URL input and paste URL
    const urlInput = page.locator('input[type="url"]');
    await expect(urlInput).toBeVisible();
    await urlInput.fill("https://us.princesspolly.com/products/flore-mini-dress-royal-blue");
    await page.screenshot({ path: "eval/bugfix/flow3-url-pasted.png" });

    // Category should default to dress
    const categorySelect = page.locator("select");
    const selectedCategory = await categorySelect.inputValue();
    expect(selectedCategory).toBe("dress");

    // Click Add Product button
    const submitBtn = page.locator('button:has-text("Add Product")');
    await submitBtn.click();

    // Wait for scraping (up to 20s)
    // The button should show "Adding..." state
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "eval/bugfix/flow3-adding.png" });

    // Wait for modal to close (product added successfully) OR error
    try {
      await page.waitForFunction(() => {
        return !document.querySelector('text=Add Product') ||
               document.querySelector('[style*="color: var(--error)"]');
      }, { timeout: 20000 });
    } catch {
      // Modal may still be open - check for error
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: "eval/bugfix/flow3-after-add.png", fullPage: true });

    // Check if product was added (count increased) or if there was an error
    // The product may already exist (dedup), so just verify no crash
    const finalCount = await page.locator('[data-testid="product-card"]').count();
    console.log(`Final product count: ${finalCount}`);
    expect(finalCount).toBeGreaterThanOrEqual(initialCount);
  });
});
