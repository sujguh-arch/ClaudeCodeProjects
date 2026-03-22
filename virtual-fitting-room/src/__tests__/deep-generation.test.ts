import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupTestDataDir, cleanupTestDataDir } from "./helpers/test-data";
import fs from "fs";
import path from "path";

describe("deep generation tests (all mocked)", () => {
  beforeEach(() => {
    vi.resetModules();
    setupTestDataDir();
    // Ensure the generated output dir exists
    const genDir = path.join(process.cwd(), "public", "generated");
    if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTestDataDir();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("verify generation request sends correct format to Replicate", async () => {
    let capturedInput: Record<string, unknown> | null = null;

    vi.doMock("replicate", () => ({
      default: class MockReplicate {
        files = {
          create: vi
            .fn()
            .mockResolvedValue({ urls: { get: "https://replicate.delivery/mock-ref.jpg" } }),
        };
        run = vi.fn().mockImplementation(async (_model: string, opts: { input: Record<string, unknown> }) => {
          capturedInput = opts.input;
          return ["https://replicate.delivery/mock-output.jpg"];
        });
      },
    }));

    // Mock fetch for downloading the generated output
    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    vi.stubGlobal("fetch", globalFetch);

    const { saveSettings } = await import("@/lib/db");
    saveSettings({
      referencePhoto: "https://example.com/ref.jpg",
      replicateToken: "test-token",
      model: "google/nano-banana-pro",
    });

    const { generateRendering } = await import("@/lib/generate");
    await generateRendering("prod-1", "https://img.com/dress.jpg", "dress", "render-1");

    expect(capturedInput).not.toBeNull();
    expect(capturedInput!.prompt).toBeDefined();
    expect(capturedInput!.image_input).toEqual([
      "https://example.com/ref.jpg",
      "https://img.com/dress.jpg",
    ]);
    expect(capturedInput!.resolution).toBe("1K");
    expect(capturedInput!.aspect_ratio).toBe("3:4");
  });

  it("successful generation sets rendering status to 'done'", async () => {
    vi.doMock("replicate", () => ({
      default: class MockReplicate {
        files = {
          create: vi
            .fn()
            .mockResolvedValue({ urls: { get: "https://replicate.delivery/ref.jpg" } }),
        };
        run = vi.fn().mockResolvedValue(["https://replicate.delivery/output.jpg"]);
      },
    }));

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    vi.stubGlobal("fetch", globalFetch);

    const { saveSettings, getRenderingsForProduct } = await import("@/lib/db");
    saveSettings({
      referencePhoto: "https://example.com/ref.jpg",
      replicateToken: "test-token",
      model: "google/nano-banana-pro",
    });

    const { generateRendering } = await import("@/lib/generate");
    const result = await generateRendering(
      "prod-2",
      "https://img.com/dress2.jpg",
      "dress",
      "render-2"
    );

    expect(result).toContain("/generated/render-2.jpg");

    const renderings = getRenderingsForProduct("prod-2");
    const rendering = renderings.find((r) => r.id === "render-2");
    expect(rendering?.status).toBe("done");
  });

  it("Replicate timeout sets rendering status to 'error'", async () => {
    vi.doMock("replicate", () => ({
      default: class MockReplicate {
        files = {
          create: vi
            .fn()
            .mockResolvedValue({ urls: { get: "https://replicate.delivery/ref.jpg" } }),
        };
        run = vi.fn().mockRejectedValue(new Error("Prediction timed out"));
      },
    }));

    const { saveSettings, getRenderingsForProduct } = await import("@/lib/db");
    saveSettings({
      referencePhoto: "https://example.com/ref.jpg",
      replicateToken: "test-token",
      model: "google/nano-banana-pro",
    });

    const { generateRendering } = await import("@/lib/generate");
    await expect(
      generateRendering("prod-3", "https://img.com/dress3.jpg", "dress", "render-3")
    ).rejects.toThrow("Prediction timed out");

    const renderings = getRenderingsForProduct("prod-3");
    const rendering = renderings.find((r) => r.id === "render-3");
    expect(rendering?.status).toBe("error");
    expect(rendering?.error).toContain("timed out");
  });

  it("Replicate 429 rate limit is handled gracefully", async () => {
    vi.doMock("replicate", () => ({
      default: class MockReplicate {
        files = {
          create: vi
            .fn()
            .mockResolvedValue({ urls: { get: "https://replicate.delivery/ref.jpg" } }),
        };
        run = vi.fn().mockRejectedValue(new Error("Rate limit exceeded (429)"));
      },
    }));

    const { saveSettings, getRenderingsForProduct } = await import("@/lib/db");
    saveSettings({
      referencePhoto: "https://example.com/ref.jpg",
      replicateToken: "test-token",
      model: "google/nano-banana-pro",
    });

    const { generateRendering } = await import("@/lib/generate");
    await expect(
      generateRendering("prod-4", "https://img.com/dress4.jpg", "dress", "render-4")
    ).rejects.toThrow("Rate limit");

    const renderings = getRenderingsForProduct("prod-4");
    const rendering = renderings.find((r) => r.id === "render-4");
    expect(rendering?.status).toBe("error");
    expect(rendering?.error).toContain("Rate limit");
  });

  it("dedup: same product+image combo does not create duplicate renderings", async () => {
    const { upsertRendering, getRenderingsForProduct } = await import("@/lib/db");

    // First rendering
    upsertRendering({
      id: "render-dedup-1",
      productId: "prod-dedup",
      originalImage: "https://img.com/same.jpg",
      generatedImage: "/generated/dedup-1.jpg",
      status: "done",
      createdAt: new Date().toISOString(),
    });

    // Second upsert with same productId + originalImage — should replace, not add
    upsertRendering({
      id: "render-dedup-2",
      productId: "prod-dedup",
      originalImage: "https://img.com/same.jpg",
      generatedImage: "/generated/dedup-2.jpg",
      status: "done",
      createdAt: new Date().toISOString(),
    });

    const renderings = getRenderingsForProduct("prod-dedup");
    const matchingOriginal = renderings.filter(
      (r) => r.originalImage === "https://img.com/same.jpg"
    );
    // upsertRendering deduplicates by (productId + originalImage), so only 1
    expect(matchingOriginal).toHaveLength(1);
    // The second upsert should have replaced the first
    expect(matchingOriginal[0].generatedImage).toBe("/generated/dedup-2.jpg");
  });

  it("uses correct category-specific prompt", async () => {
    let usedPrompt = "";

    vi.doMock("replicate", () => ({
      default: class MockReplicate {
        files = {
          create: vi
            .fn()
            .mockResolvedValue({ urls: { get: "https://replicate.delivery/ref.jpg" } }),
        };
        run = vi.fn().mockImplementation(async (_model: string, opts: { input: { prompt: string } }) => {
          usedPrompt = opts.input.prompt;
          return ["https://replicate.delivery/output.jpg"];
        });
      },
    }));

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    vi.stubGlobal("fetch", globalFetch);

    const { saveSettings } = await import("@/lib/db");
    saveSettings({
      referencePhoto: "https://example.com/ref.jpg",
      replicateToken: "test-token",
      model: "google/nano-banana-pro",
    });

    const { generateRendering } = await import("@/lib/generate");
    await generateRendering("prod-shoes", "https://img.com/shoes.jpg", "shoes", "render-shoes");

    expect(usedPrompt).toContain("shoes");
  });

  it("handles download failure after generation", async () => {
    vi.doMock("replicate", () => ({
      default: class MockReplicate {
        files = {
          create: vi
            .fn()
            .mockResolvedValue({ urls: { get: "https://replicate.delivery/ref.jpg" } }),
        };
        run = vi.fn().mockResolvedValue(["https://replicate.delivery/output.jpg"]);
      },
    }));

    // Mock fetch to fail on download
    const globalFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal("fetch", globalFetch);

    const { saveSettings, getRenderingsForProduct } = await import("@/lib/db");
    saveSettings({
      referencePhoto: "https://example.com/ref.jpg",
      replicateToken: "test-token",
      model: "google/nano-banana-pro",
    });

    const { generateRendering } = await import("@/lib/generate");
    await expect(
      generateRendering("prod-dl-fail", "https://img.com/dl.jpg", "dress", "render-dl")
    ).rejects.toThrow("Download failed");

    const renderings = getRenderingsForProduct("prod-dl-fail");
    const rendering = renderings.find((r) => r.id === "render-dl");
    expect(rendering?.status).toBe("error");
  });

  it("uploads local reference photo via Replicate files API", async () => {
    let filesCreateCalled = false;

    vi.doMock("replicate", () => ({
      default: class MockReplicate {
        files = {
          create: vi.fn().mockImplementation(async () => {
            filesCreateCalled = true;
            return { urls: { get: "https://replicate.delivery/uploaded-ref.jpg" } };
          }),
        };
        run = vi.fn().mockResolvedValue(["https://replicate.delivery/output.jpg"]);
      },
    }));

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });
    vi.stubGlobal("fetch", globalFetch);

    // Create a fake local reference photo
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, "local-ref.jpg"), Buffer.from("fake-image"));

    const { saveSettings } = await import("@/lib/db");
    saveSettings({
      referencePhoto: "/uploads/local-ref.jpg", // Local path starting with /
      replicateToken: "test-token",
      model: "google/nano-banana-pro",
    });

    const { generateRendering } = await import("@/lib/generate");
    await generateRendering(
      "prod-local",
      "https://img.com/dress-local.jpg",
      "dress",
      "render-local"
    );

    expect(filesCreateCalled).toBe(true);
  });
});
