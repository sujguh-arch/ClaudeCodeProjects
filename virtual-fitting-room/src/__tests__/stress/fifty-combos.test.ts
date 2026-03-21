import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { setupTestDataDir, cleanupTestDataDir } from "../helpers/test-data";
import { makeProduct, makeOutfit, CATEGORIES } from "../helpers/factories";

let db: typeof import("@/lib/db");

// Product IDs organized by category
const productIds: Record<string, string[]> = {};

beforeAll(async () => {
  vi.resetModules();
  setupTestDataDir();
  db = await import("@/lib/db");

  // Create 10 products per category = 50 products
  for (const cat of CATEGORIES) {
    productIds[cat] = [];
    for (let i = 0; i < 10; i++) {
      const product = makeProduct(cat, i);
      db.addProduct(product);
      productIds[cat].push(product.id);
    }
  }
});

afterAll(() => {
  cleanupTestDataDir();
});

describe("50-combo stress test", () => {
  it("created 50 products (10 per category)", () => {
    const products = db.getProducts();
    expect(products).toHaveLength(50);
    for (const cat of CATEGORIES) {
      const catProducts = products.filter((p) => p.category === cat);
      expect(catProducts).toHaveLength(10);
    }
  });

  it("creates 10 outfits with unique names", () => {
    for (let i = 0; i < 10; i++) {
      const outfit = makeOutfit(`Outfit ${i + 1}`, {
        dress: productIds.dress[i],
        shoes: productIds.shoes[i],
        tights: productIds.tights[i],
        bag: productIds.bag[i],
        accessories: [productIds.accessories[i]],
      });
      db.addOutfit(outfit);
    }
    expect(db.getOutfits()).toHaveLength(10);
  });

  it("each outfit has 5 resolved products", () => {
    const outfits = db.getOutfits();
    for (const outfit of outfits) {
      const resolvedIds = [
        outfit.items.dress,
        outfit.items.shoes,
        outfit.items.tights,
        outfit.items.bag,
        ...(outfit.items.accessories || []),
      ].filter(Boolean);
      expect(resolvedIds).toHaveLength(5);
      for (const pid of resolvedIds) {
        expect(db.getProduct(pid!)).toBeDefined();
      }
    }
  });

  it("each outfit has correct categories", () => {
    const outfits = db.getOutfits();
    for (const outfit of outfits) {
      if (outfit.items.dress) expect(db.getProduct(outfit.items.dress)!.category).toBe("dress");
      if (outfit.items.shoes) expect(db.getProduct(outfit.items.shoes)!.category).toBe("shoes");
      if (outfit.items.tights) expect(db.getProduct(outfit.items.tights)!.category).toBe("tights");
      if (outfit.items.bag) expect(db.getProduct(outfit.items.bag)!.category).toBe("bag");
      for (const accId of outfit.items.accessories || []) {
        expect(db.getProduct(accId)!.category).toBe("accessories");
      }
    }
  });

  it("total price per outfit is sum of 5 item prices", () => {
    const outfits = db.getOutfits();
    for (const outfit of outfits) {
      const ids = [
        outfit.items.dress,
        outfit.items.shoes,
        outfit.items.tights,
        outfit.items.bag,
        ...(outfit.items.accessories || []),
      ].filter(Boolean) as string[];

      const total = ids.reduce((sum, pid) => sum + (db.getProduct(pid)?.price || 0), 0);
      expect(total).toBeGreaterThan(0);
      // Each product has price 50 + i*10, so minimum total is 5*50 = 250
      expect(total).toBeGreaterThanOrEqual(250);
    }
  });

  it("outfit names are all unique", () => {
    const names = db.getOutfits().map((o) => o.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("products appear in correct category filter", () => {
    const products = db.getProducts();
    for (const cat of CATEGORIES) {
      const filtered = products.filter((p) => p.category === cat);
      expect(filtered).toHaveLength(10);
      filtered.forEach((p) => expect(p.category).toBe(cat));
    }
  });

  it("deleting 1 outfit leaves 9", () => {
    const outfits = db.getOutfits();
    db.deleteOutfit(outfits[0].id);
    expect(db.getOutfits()).toHaveLength(9);
  });

  it("deleting 1 product leaves 49 but outfit keeps dangling ref", () => {
    const outfits = db.getOutfits();
    const outfit = outfits[0];
    const dressId = outfit.items.dress!;
    db.deleteProduct(dressId);
    expect(db.getProducts()).toHaveLength(49);
    // Outfit still references deleted product
    expect(db.getOutfit(outfit.id)!.items.dress).toBe(dressId);
    // But product is gone
    expect(db.getProduct(dressId)).toBeUndefined();
  });

  it("all operations complete in reasonable time", () => {
    const start = Date.now();
    // Read all outfits and resolve all products
    const outfits = db.getOutfits();
    for (const outfit of outfits) {
      const ids = [
        outfit.items.dress,
        outfit.items.shoes,
        outfit.items.tights,
        outfit.items.bag,
        ...(outfit.items.accessories || []),
      ].filter(Boolean) as string[];
      ids.forEach((pid) => db.getProduct(pid));
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
