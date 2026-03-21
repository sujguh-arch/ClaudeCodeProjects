import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupTestDataDir, cleanupTestDataDir } from "../helpers/test-data";

let GET: typeof import("@/app/api/settings/route").GET;
let POST: typeof import("@/app/api/settings/route").POST;
let db: typeof import("@/lib/db");

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  vi.resetModules();
  setupTestDataDir();
  const route = await import("@/app/api/settings/route");
  GET = route.GET;
  POST = route.POST;
  db = await import("@/lib/db");
});

afterEach(() => {
  cleanupTestDataDir();
});

describe("GET /api/settings", () => {
  it("returns settings with masked token when configured", async () => {
    db.saveSettings({
      referencePhoto: "/uploads/ref.jpg",
      replicateToken: "r8_realtoken123",
      model: "google/nano-banana-pro",
    });
    const res = await GET();
    const data = await res.json();
    expect(data.replicateToken).toBe("***configured***");
    expect(data.referencePhoto).toBe("/uploads/ref.jpg");
    expect(data.model).toBe("google/nano-banana-pro");
  });

  it("returns empty token string when not configured", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.replicateToken).toBe("");
  });
});

describe("POST /api/settings", () => {
  it("updates token via JSON body", async () => {
    const res = await POST(jsonRequest({ replicateToken: "r8_newtoken" }) as any);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const settings = db.getSettings();
    expect(settings.replicateToken).toBe("r8_newtoken");
  });

  it("preserves existing fields on partial update", async () => {
    db.saveSettings({
      referencePhoto: "/uploads/existing.jpg",
      replicateToken: "r8_old",
      model: "google/nano-banana-pro",
    });

    await POST(jsonRequest({ replicateToken: "r8_new" }) as any);

    const settings = db.getSettings();
    expect(settings.replicateToken).toBe("r8_new");
    expect(settings.referencePhoto).toBe("/uploads/existing.jpg");
    expect(settings.model).toBe("google/nano-banana-pro");
  });

  it("updates model field", async () => {
    await POST(jsonRequest({ model: "custom/model-v2" }) as any);
    const settings = db.getSettings();
    expect(settings.model).toBe("custom/model-v2");
  });
});
