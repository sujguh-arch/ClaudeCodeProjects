import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupTestDataDir, cleanupTestDataDir } from "../helpers/test-data";

let db: typeof import("@/lib/db");

beforeEach(async () => {
  vi.resetModules();
  setupTestDataDir();
  db = await import("@/lib/db");
});

afterEach(() => {
  cleanupTestDataDir();
});

describe("db - products", () => {
  it("getProducts returns empty array when no file exists", () => {
    expect(db.getProducts()).toEqual([]);
  });

  it("addProduct persists and getProduct retrieves by ID", () => {
    db.addProduct({
      id: "test-1",
      url: "https://test.com/product",
      title: "Test Dress",
      price: 99,
      store: "TestStore",
      category: "dress",
      lengthInches: null,
      images: ["https://img.test.com/1.jpg"],
      createdAt: new Date().toISOString(),
    });
    const retrieved = db.getProduct("test-1");
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe("Test Dress");
    expect(retrieved!.price).toBe(99);
  });

  it("deleteProduct removes the product", () => {
    db.addProduct({
      id: "del-1",
      url: "https://test.com/del",
      title: "To Delete",
      price: 50,
      store: "TestStore",
      category: "dress",
      lengthInches: null,
      images: ["https://img.test.com/del.jpg"],
      createdAt: new Date().toISOString(),
    });
    expect(db.getProducts()).toHaveLength(1);
    db.deleteProduct("del-1");
    expect(db.getProducts()).toHaveLength(0);
  });
});

describe("db - outfits", () => {
  it("getOutfits returns empty array when no file exists", () => {
    expect(db.getOutfits()).toEqual([]);
  });

  it("addOutfit persists with correct shape", () => {
    db.addOutfit({
      id: "outfit-1",
      name: "Test Outfit",
      items: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const retrieved = db.getOutfit("outfit-1");
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe("Test Outfit");
    expect(retrieved!.items).toEqual({});
  });

  it("updateOutfit merges partial updates and sets updatedAt", async () => {
    const past = "2020-01-01T00:00:00.000Z";
    db.addOutfit({
      id: "outfit-2",
      name: "Original",
      items: {},
      createdAt: past,
      updatedAt: past,
    });
    const updated = db.updateOutfit("outfit-2", { name: "Updated" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("Updated");
    expect(updated!.updatedAt).not.toBe(past);
  });

  it("updateOutfit returns null for non-existent ID", () => {
    const result = db.updateOutfit("nonexistent", { name: "Nope" });
    expect(result).toBeNull();
  });

  it("deleteOutfit removes the outfit", () => {
    db.addOutfit({
      id: "outfit-del",
      name: "Delete Me",
      items: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(db.getOutfits()).toHaveLength(1);
    db.deleteOutfit("outfit-del");
    expect(db.getOutfits()).toHaveLength(0);
  });
});

describe("db - renderings", () => {
  it("upsertRendering deduplicates by productId + originalImage", () => {
    const rendering = {
      id: "r-1",
      productId: "p-1",
      originalImage: "https://img.test.com/orig.jpg",
      generatedImage: "/generated/r-1.jpg",
      status: "done" as const,
      createdAt: new Date().toISOString(),
    };
    db.upsertRendering(rendering);
    db.upsertRendering({ ...rendering, id: "r-2", generatedImage: "/generated/r-2.jpg" });
    expect(db.getRenderings()).toHaveLength(1);
    expect(db.getRenderings()[0].generatedImage).toBe("/generated/r-2.jpg");
  });
});

describe("db - settings", () => {
  it("getSettings returns defaults when no file exists", () => {
    const settings = db.getSettings();
    expect(settings.referencePhoto).toBeNull();
    expect(settings.model).toBe("google/nano-banana-pro");
  });
});
