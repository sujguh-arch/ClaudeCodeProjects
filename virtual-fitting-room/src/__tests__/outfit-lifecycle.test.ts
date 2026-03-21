import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupTestDataDir, cleanupTestDataDir } from "./helpers/test-data";

let db: typeof import("@/lib/db");

beforeEach(async () => {
  vi.resetModules();
  setupTestDataDir();
  db = await import("@/lib/db");
});

afterEach(() => {
  cleanupTestDataDir();
});

function addTestProduct(category: string, price: number) {
  const id = `${category}-${Date.now()}-${Math.random()}`;
  db.addProduct({
    id,
    url: `https://test.com/${category}`,
    title: `Test ${category}`,
    price,
    store: "TestStore",
    category: category as any,
    lengthInches: null,
    images: [`https://img.test.com/${category}.jpg`],
    createdAt: new Date().toISOString(),
  });
  return id;
}

describe("outfit lifecycle", () => {
  it("creates outfit with name and empty items", () => {
    db.addOutfit({
      id: "o-1",
      name: "Date Night",
      items: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const outfit = db.getOutfit("o-1");
    expect(outfit!.name).toBe("Date Night");
    expect(Object.keys(outfit!.items)).toHaveLength(0);
  });

  it("adds dress to outfit via updateOutfit", () => {
    db.addOutfit({ id: "o-2", name: "Test", items: {}, createdAt: "", updatedAt: "" });
    const dressId = addTestProduct("dress", 100);
    db.updateOutfit("o-2", { items: { dress: dressId } });
    expect(db.getOutfit("o-2")!.items.dress).toBe(dressId);
  });

  it("adds all 5 category items to outfit", () => {
    db.addOutfit({ id: "o-3", name: "Full", items: {}, createdAt: "", updatedAt: "" });
    const dressId = addTestProduct("dress", 100);
    const shoesId = addTestProduct("shoes", 80);
    const tightsId = addTestProduct("tights", 35);
    const bagId = addTestProduct("bag", 200);
    const accId = addTestProduct("accessories", 45);

    db.updateOutfit("o-3", {
      items: {
        dress: dressId,
        shoes: shoesId,
        tights: tightsId,
        bag: bagId,
        accessories: [accId],
      },
    });

    const outfit = db.getOutfit("o-3")!;
    expect(outfit.items.dress).toBe(dressId);
    expect(outfit.items.shoes).toBe(shoesId);
    expect(outfit.items.tights).toBe(tightsId);
    expect(outfit.items.bag).toBe(bagId);
    expect(outfit.items.accessories).toEqual([accId]);
  });

  it("computes total price across all items", () => {
    db.addOutfit({ id: "o-4", name: "Priced", items: {}, createdAt: "", updatedAt: "" });
    const dressId = addTestProduct("dress", 100);
    const shoesId = addTestProduct("shoes", 80);
    const bagId = addTestProduct("bag", 200);

    db.updateOutfit("o-4", {
      items: { dress: dressId, shoes: shoesId, bag: bagId },
    });

    const outfit = db.getOutfit("o-4")!;
    const productIds = [outfit.items.dress, outfit.items.shoes, outfit.items.bag].filter(Boolean) as string[];
    const total = productIds.reduce((sum, pid) => {
      const p = db.getProduct(pid);
      return sum + (p?.price || 0);
    }, 0);
    expect(total).toBe(380);
  });

  it("removes item from outfit slot", () => {
    db.addOutfit({ id: "o-5", name: "Remove", items: {}, createdAt: "", updatedAt: "" });
    const dressId = addTestProduct("dress", 100);
    db.updateOutfit("o-5", { items: { dress: dressId } });
    expect(db.getOutfit("o-5")!.items.dress).toBe(dressId);

    db.updateOutfit("o-5", { items: {} });
    expect(db.getOutfit("o-5")!.items.dress).toBeUndefined();
  });

  it("multiple accessories can be added", () => {
    db.addOutfit({ id: "o-6", name: "Acc", items: {}, createdAt: "", updatedAt: "" });
    const acc1 = addTestProduct("accessories", 25);
    const acc2 = addTestProduct("accessories", 30);
    db.updateOutfit("o-6", { items: { accessories: [acc1, acc2] } });
    expect(db.getOutfit("o-6")!.items.accessories).toHaveLength(2);
  });

  it("outfit enrichment resolves product data", () => {
    const dressId = addTestProduct("dress", 100);
    db.addOutfit({
      id: "o-7",
      name: "Enriched",
      items: { dress: dressId },
      createdAt: "",
      updatedAt: "",
    });
    const outfit = db.getOutfit("o-7")!;
    const product = db.getProduct(outfit.items.dress!);
    expect(product).toBeDefined();
    expect(product!.category).toBe("dress");
    expect(product!.price).toBe(100);
  });

  it("deleting a product leaves dangling reference in outfit", () => {
    const dressId = addTestProduct("dress", 100);
    db.addOutfit({
      id: "o-8",
      name: "Dangling",
      items: { dress: dressId },
      createdAt: "",
      updatedAt: "",
    });
    db.deleteProduct(dressId);
    // Outfit still references the deleted product ID
    expect(db.getOutfit("o-8")!.items.dress).toBe(dressId);
    // But the product is gone
    expect(db.getProduct(dressId)).toBeUndefined();
  });

  it("deletes outfit successfully", () => {
    db.addOutfit({ id: "o-9", name: "ToDelete", items: {}, createdAt: "", updatedAt: "" });
    expect(db.getOutfits()).toHaveLength(1);
    db.deleteOutfit("o-9");
    expect(db.getOutfits()).toHaveLength(0);
  });
});
