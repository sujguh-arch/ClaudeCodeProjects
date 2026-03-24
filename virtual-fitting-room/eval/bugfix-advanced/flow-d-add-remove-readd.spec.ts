import { test, expect } from "@playwright/test";
import { goHome, switchToTab } from "./helpers";

test("Flow D: Add then remove then re-add items", async ({ page }) => {
  await goHome(page);
  await switchToTab(page, "outfits");

  // Create a new outfit
  const newOutfitBtn = page.locator("button").filter({ hasText: /new outfit/i });
  await newOutfitBtn.click();
  await page.waitForURL(/\/outfit\//);
  await page.waitForLoadState("networkidle");

  // Helper to check if a slot is filled
  async function isSlotFilled(slot: string): Promise<boolean> {
    const slotCard = page.locator(`[data-testid="outfit-slot-${slot}"]`);
    const browseTxt = slotCard.locator("text=Browse closet");
    return !(await browseTxt.isVisible().catch(() => false));
  }

  // Helper to add item to slot
  async function addToSlot(slot: string, itemIndex: number = 0) {
    const slotCard = page.locator(`[data-testid="outfit-slot-${slot}"]`);
    await slotCard.click();
    await page.waitForTimeout(500);
    const picker = page.locator('[data-testid="closet-picker"]');
    await expect(picker).toBeVisible({ timeout: 5000 });
    const items = picker.locator(".grid > div");
    const count = await items.count();
    if (count > itemIndex) {
      await items.nth(itemIndex).click();
    } else if (count > 0) {
      await items.first().click();
    }
    await page.waitForTimeout(1000);
  }

  // Helper to remove item from slot
  async function removeFromSlot(slot: string) {
    const slotCard = page.locator(`[data-testid="outfit-slot-${slot}"]`);
    // Find the ✕ remove button inside the slot
    const removeBtn = slotCard.locator("button").filter({ hasText: "✕" });
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Test with dress: add → verify → remove → verify → re-add different
  await addToSlot("dress", 0);
  let filled = await isSlotFilled("dress");
  expect(filled).toBe(true);
  await page.screenshot({ path: "eval/bugfix-advanced/flowD-dress-added.png" });

  await removeFromSlot("dress");
  filled = await isSlotFilled("dress");
  expect(filled).toBe(false);
  await page.screenshot({ path: "eval/bugfix-advanced/flowD-dress-removed.png" });

  await addToSlot("dress", 1); // Pick a different dress
  filled = await isSlotFilled("dress");
  expect(filled).toBe(true);
  await page.screenshot({ path: "eval/bugfix-advanced/flowD-dress-readded.png" });

  // Test with shoes: add → remove → add different
  await addToSlot("shoes", 0);
  await page.screenshot({ path: "eval/bugfix-advanced/flowD-shoes-added.png" });

  await removeFromSlot("shoes");
  await page.screenshot({ path: "eval/bugfix-advanced/flowD-shoes-removed.png" });

  await addToSlot("shoes", 1);
  await page.screenshot({ path: "eval/bugfix-advanced/flowD-shoes-readded.png" });

  // Rapid add/remove cycle (3 times)
  for (let i = 0; i < 3; i++) {
    await removeFromSlot("dress");
    await addToSlot("dress", i % 3);
    await page.waitForTimeout(300);
  }

  // Verify final state is correct
  const finalDressFilled = await isSlotFilled("dress");
  const finalShoesFilled = await isSlotFilled("shoes");
  expect(finalDressFilled).toBe(true);
  expect(finalShoesFilled).toBe(true);

  await page.screenshot({ path: "eval/bugfix-advanced/flowD-final.png" });
});
