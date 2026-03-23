import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupTestDataDir, cleanupTestDataDir } from "../helpers/test-data";

let GET: typeof import("@/app/api/products/route").GET;
let POST: typeof import("@/app/api/products/route").POST;
let DELETE: typeof import("@/app/api/products/route").DELETE;
let db: typeof import("@/lib/db");

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/products", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  vi.resetModules();
  setupTestDataDir();

  // Mock the scraper module to avoid real HTTP calls
  vi.doMock("@/lib/scraper", () => ({
    scrapeGenericProduct: vi.fn().mockResolvedValue({
      title: "Scraped Dress",
      price: 89.99,
      store: "TestShop",
      images: ["https://img.test.com/scraped.jpg"],
      handle: "scraped-dress",
      url: "https://testshop.com/products/scraped-dress",
      detectedCategory: "dress",
    }),
  }));

  const route = await import("@/app/api/products/route");
  GET = route.GET;
  POST = route.POST;
  DELETE = route.DELETE;
  db = await import("@/lib/db");
});

afterEach(() => {
  cleanupTestDataDir();
  vi.restoreAllMocks();
});

describe("GET /api/products", () => {
  it("returns empty array when no products", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns all products", async () => {
    db.addProduct({
      id: "p-1",
      url: "https://test.com/dress",
      title: "Test Dress",
      price: 100,
      store: "TestStore",
      category: "dress",
      lengthInches: null,
      images: ["https://img.test.com/dress.jpg"],
      createdAt: new Date().toISOString(),
    });
    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Test Dress");
  });
});

describe("POST /api/products", () => {
  it("adds product with manual data", async () => {
    const res = await POST(
      jsonRequest("POST", {
        title: "Manual Dress",
        images: ["https://img.test.com/manual.jpg"],
        price: 75,
        category: "dress",
      }) as any
    );
    const data = await res.json();
    expect(data.title).toBe("Manual Dress");
    expect(data.id).toBeDefined();
    expect(data.store).toBe("Manual");
  });

  it("deduplicates by URL on manual add", async () => {
    db.addProduct({
      id: "existing-1",
      url: "https://test.com/same-dress",
      title: "Existing Dress",
      price: 100,
      store: "TestStore",
      category: "dress",
      lengthInches: null,
      images: ["https://img.test.com/existing.jpg"],
      createdAt: new Date().toISOString(),
    });

    const res = await POST(
      jsonRequest("POST", {
        url: "https://test.com/same-dress",
        title: "Duplicate Dress",
        images: ["https://img.test.com/dup.jpg"],
      }) as any
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.duplicate).toBe(true);
  });

  it("scrapes product from URL", async () => {
    const res = await POST(
      jsonRequest("POST", { url: "https://testshop.com/products/scraped-dress" }) as any
    );
    const data = await res.json();
    expect(data.title).toBe("Scraped Dress");
    expect(data.price).toBe(89.99);
    expect(data.images).toHaveLength(1);
  });

  it("deduplicates scraped URL against existing products", async () => {
    db.addProduct({
      id: "existing-2",
      url: "https://testshop.com/products/scraped-dress",
      title: "Already Scraped",
      price: 89.99,
      store: "TestShop",
      category: "dress",
      lengthInches: null,
      images: ["https://img.test.com/scraped.jpg"],
      createdAt: new Date().toISOString(),
    });

    const res = await POST(
      jsonRequest("POST", { url: "https://testshop.com/products/scraped-dress" }) as any
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.duplicate).toBe(true);
  });

  it("returns 400 when scraper finds no images", async () => {
    const { scrapeGenericProduct } = await import("@/lib/scraper");
    (scrapeGenericProduct as any).mockResolvedValueOnce({
      title: "No Images Dress",
      price: 50,
      store: "BadShop",
      images: [],
      handle: "bad",
      url: "https://bad.com/no-images",
    });

    const res = await POST(
      jsonRequest("POST", { url: "https://bad.com/no-images" }) as any
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No product images");
  });

  it("returns 400 when scraper returns error page title", async () => {
    const { scrapeGenericProduct } = await import("@/lib/scraper");
    (scrapeGenericProduct as any).mockResolvedValueOnce({
      title: "Page Not Found",
      price: null,
      store: "Unknown",
      images: ["https://img.test.com/placeholder.jpg"],
      handle: "not-found",
      url: "https://shop.com/not-found",
    });

    const res = await POST(
      jsonRequest("POST", { url: "https://shop.com/not-found" }) as any
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("not found");
  });

  it("returns 400 when no url or title+images provided", async () => {
    const res = await POST(jsonRequest("POST", { price: 50 }) as any);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/products", () => {
  it("deletes product by id", async () => {
    db.addProduct({
      id: "to-delete",
      url: "https://test.com/delete-me",
      title: "Delete Me",
      price: 50,
      store: "TestStore",
      category: "dress",
      lengthInches: null,
      images: ["https://img.test.com/delete.jpg"],
      createdAt: new Date().toISOString(),
    });

    const res = await DELETE(jsonRequest("DELETE", { id: "to-delete" }) as any);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(db.getProducts()).toHaveLength(0);
  });
});
