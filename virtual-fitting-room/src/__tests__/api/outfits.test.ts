import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupTestDataDir, cleanupTestDataDir } from "../helpers/test-data";

let GET: typeof import("@/app/api/outfits/route").GET;
let POST: typeof import("@/app/api/outfits/route").POST;
let PUT: typeof import("@/app/api/outfits/route").PUT;
let DELETE: typeof import("@/app/api/outfits/route").DELETE;
let db: typeof import("@/lib/db");

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/outfits", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  vi.resetModules();
  setupTestDataDir();
  const route = await import("@/app/api/outfits/route");
  GET = route.GET;
  POST = route.POST;
  PUT = route.PUT;
  DELETE = route.DELETE;
  db = await import("@/lib/db");
});

afterEach(() => {
  cleanupTestDataDir();
});

describe("GET /api/outfits", () => {
  it("returns empty array when no outfits", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns outfits with enriched product data", async () => {
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
    db.addOutfit({
      id: "o-1",
      name: "Date Night",
      items: { dress: "p-1" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Date Night");
    expect(data[0].products["p-1"]).toBeDefined();
    expect(data[0].products["p-1"].title).toBe("Test Dress");
  });
});

describe("POST /api/outfits", () => {
  it("creates outfit with given name", async () => {
    const res = await POST(jsonRequest("POST", { name: "Beach Day" }) as any);
    const data = await res.json();
    expect(data.name).toBe("Beach Day");
    expect(data.id).toBeDefined();
    expect(data.items).toEqual({});
  });

  it("defaults name to 'New Outfit' when not provided", async () => {
    const res = await POST(jsonRequest("POST", {}) as any);
    const data = await res.json();
    expect(data.name).toBe("New Outfit");
  });
});

describe("PUT /api/outfits", () => {
  it("updates outfit name", async () => {
    db.addOutfit({
      id: "o-1",
      name: "Old Name",
      items: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const res = await PUT(jsonRequest("PUT", { id: "o-1", name: "New Name" }) as any);
    const data = await res.json();
    expect(data.name).toBe("New Name");
  });

  it("updates outfit items with partial merge", async () => {
    db.addOutfit({
      id: "o-2",
      name: "Test",
      items: { dress: "d-1" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const res = await PUT(jsonRequest("PUT", { id: "o-2", items: { shoes: "s-1" } }) as any);
    const data = await res.json();
    expect(data.items).toEqual({ shoes: "s-1" });
  });

  it("auto-updates updatedAt timestamp", async () => {
    const oldDate = "2020-01-01T00:00:00.000Z";
    db.addOutfit({
      id: "o-3",
      name: "Test",
      items: {},
      createdAt: oldDate,
      updatedAt: oldDate,
    });
    const res = await PUT(jsonRequest("PUT", { id: "o-3", name: "Updated" }) as any);
    const data = await res.json();
    expect(data.updatedAt).not.toBe(oldDate);
  });

  it("returns 404 for missing outfit", async () => {
    const res = await PUT(jsonRequest("PUT", { id: "nonexistent", name: "X" }) as any);
    expect(res.status).toBe(404);
  });

  it("returns 400 when no id provided", async () => {
    const res = await PUT(jsonRequest("PUT", { name: "X" }) as any);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/outfits", () => {
  it("deletes outfit by id", async () => {
    db.addOutfit({
      id: "o-del",
      name: "ToDelete",
      items: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const res = await DELETE(jsonRequest("DELETE", { id: "o-del" }) as any);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(db.getOutfits()).toHaveLength(0);
  });

  it("returns 400 when no id provided", async () => {
    const res = await DELETE(jsonRequest("DELETE", {}) as any);
    expect(res.status).toBe(400);
  });
});
