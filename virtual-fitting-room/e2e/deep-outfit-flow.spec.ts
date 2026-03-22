import { test, expect, Page } from "@playwright/test";

let testProducts: { id: string; category: string }[] = [];

/** Navigate to a page with auth bypass already set */
async function gotoWithAuth(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
  await page.reload();
  await page.waitForTimeout(500);
}

test.beforeAll(async ({ request }) => {
  const categories = ["dress", "shoes", "tights", "bag", "accessories"];
  for (const cat of categories) {
    const resp = await request.post("/api/products", {
      data: {
        title: `Outfit Flow Test ${cat}`,
        images: [`https://cdn.shopify.com/s/files/1/0506/5886/9443/files/outfit-${cat}.jpg`],
        price: 50,
        store: "TestStore",
        category: cat,
        url: `https://test-store.com/outfit-flow-${cat}-${Date.now()}`,
      },
    });
    const product = await resp.json();
    testProducts.push({ id: product.id, category: cat });
  }
});

test.beforeEach(async ({ page }) => {
  await gotoWithAuth(page, "/");
});

test.describe("deep outfit flow", () => {
  test("create new outfit and verify it appears in outfits tab", async ({
    page,
    request,
  }) => {
    const resp = await request.post("/api/outfits", {
      data: { name: "Deep Test Outfit" },
    });
    const outfit = await resp.json();
    expect(resp.ok()).toBeTruthy();
    expect(outfit.name).toBe("Deep Test Outfit");

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.getByText("Deep Test Outfit")).toBeVisible();

    await page.screenshot({ path: "test-results/deep-outfit-created.png" });
    await request.delete("/api/outfits", { data: { id: outfit.id } });
  });

  test("create outfit via UI New Outfit card", async ({ page, request }) => {
    const newOutfitBtn = page.getByText("New Outfit");
    await expect(newOutfitBtn).toBeVisible();
    await newOutfitBtn.click();

    await page.waitForTimeout(1000);
    const url = page.url();
    expect.soft(url).toMatch(/\/outfit\//);

    await page.screenshot({ path: "test-results/deep-outfit-via-ui.png" });

    const match = url.match(/\/outfit\/(.+)/);
    if (match) {
      await request.delete("/api/outfits", { data: { id: match[1] } });
    }
  });

  test("add dress to outfit slot and verify it shows in builder", async ({
    page,
    request,
  }) => {
    const resp = await request.post("/api/outfits", {
      data: { name: "Slot Test Outfit" },
    });
    const outfit = await resp.json();

    const dressProduct = testProducts.find((p) => p.category === "dress");
    await request.put("/api/outfits", {
      data: { id: outfit.id, items: { dress: dressProduct!.id } },
    });

    await gotoWithAuth(page, `/outfit/${outfit.id}`);
    await expect(page.getByText("Outfit Flow Test dress").first()).toBeVisible();

    await page.screenshot({ path: "test-results/deep-dress-in-slot.png" });
    await request.delete("/api/outfits", { data: { id: outfit.id } });
  });

  test("add items from every category and verify all slots populated", async ({
    page,
    request,
  }) => {
    const resp = await request.post("/api/outfits", {
      data: { name: "Full Outfit Test" },
    });
    const outfit = await resp.json();

    const items: Record<string, string | string[]> = {};
    for (const p of testProducts) {
      if (p.category === "accessories") {
        items.accessories = [p.id];
      } else {
        items[p.category] = p.id;
      }
    }

    await request.put("/api/outfits", {
      data: { id: outfit.id, items },
    });

    await gotoWithAuth(page, `/outfit/${outfit.id}`);

    for (const p of testProducts) {
      await expect
        .soft(page.getByText(`Outfit Flow Test ${p.category}`).first())
        .toBeVisible();
    }

    await page.screenshot({ path: "test-results/deep-full-outfit.png" });
    await request.delete("/api/outfits", { data: { id: outfit.id } });
  });

  test("rename outfit and verify name updates", async ({ page, request }) => {
    const resp = await request.post("/api/outfits", {
      data: { name: "Rename Me Outfit" },
    });
    const outfit = await resp.json();

    await gotoWithAuth(page, `/outfit/${outfit.id}`);

    await page.getByText("Rename Me Outfit").click();
    await page.waitForTimeout(200);

    const input = page.locator("input").first();
    if (await input.isVisible()) {
      await input.fill("Renamed Outfit");
      await input.press("Enter");
      await page.waitForTimeout(500);

      const updatedResp = await request.get("/api/outfits");
      const allOutfits = await updatedResp.json();
      const updated = allOutfits.find(
        (o: { id: string }) => o.id === outfit.id
      );
      expect.soft(updated?.name).toBe("Renamed Outfit");
    }

    await page.screenshot({ path: "test-results/deep-outfit-renamed.png" });
    await request.delete("/api/outfits", { data: { id: outfit.id } });
  });

  test("delete outfit and verify removal", async ({ request }) => {
    const resp = await request.post("/api/outfits", {
      data: { name: "Delete Me Outfit" },
    });
    const outfit = await resp.json();

    const beforeResp = await request.get("/api/outfits");
    const before = await beforeResp.json();
    expect(before.some((o: { id: string }) => o.id === outfit.id)).toBeTruthy();

    await request.delete("/api/outfits", { data: { id: outfit.id } });

    const afterResp = await request.get("/api/outfits");
    const after = await afterResp.json();
    expect(after.some((o: { id: string }) => o.id === outfit.id)).toBeFalsy();
  });

  test("remove item from outfit slot and verify it clears", async ({
    page,
    request,
  }) => {
    const dressProduct = testProducts.find((p) => p.category === "dress");
    const resp = await request.post("/api/outfits", {
      data: {
        name: "Remove Item Test",
        items: { dress: dressProduct!.id },
      },
    });
    const outfit = await resp.json();

    await gotoWithAuth(page, `/outfit/${outfit.id}`);
    await expect(page.getByText("Outfit Flow Test dress")).toBeVisible();

    // Clear the dress slot via API
    await request.put("/api/outfits", {
      data: { id: outfit.id, items: {} },
    });

    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.getByText("Add Dress")).toBeVisible();

    await page.screenshot({ path: "test-results/deep-item-removed.png" });
    await request.delete("/api/outfits", { data: { id: outfit.id } });
  });

  test("add shoes to outfit and verify correct slot", async ({
    page,
    request,
  }) => {
    const shoesProduct = testProducts.find((p) => p.category === "shoes");
    const resp = await request.post("/api/outfits", {
      data: {
        name: "Shoes Slot Test",
        items: { shoes: shoesProduct!.id },
      },
    });
    const outfit = await resp.json();

    await gotoWithAuth(page, `/outfit/${outfit.id}`);
    await expect(page.getByText("Outfit Flow Test shoes")).toBeVisible();
    await expect(page.getByText("Add Dress")).toBeVisible();

    await page.screenshot({ path: "test-results/deep-shoes-slot.png" });
    await request.delete("/api/outfits", { data: { id: outfit.id } });
  });
});

test.afterAll(async ({ request }) => {
  for (const p of testProducts) {
    await request.delete("/api/products", { data: { id: p.id } });
  }
});
