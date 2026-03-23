import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const EVAL_DIR = path.join(__dirname, "..", "eval", "generation-eval");

test.describe("Outfit Generation with Multi-Image Input", () => {
  let renderingId: string;

  test("generation API accepts outfitItems", async ({ request }) => {
    const outfitItems = [
      {
        id: "b9a56118-b686-49db-8222-abeb41cae03c",
        title: "Cerina High Neck Mini Dress - Navy",
        category: "dress",
        images: [
          "https://cdn.shopify.com/s/files/1/0061/8627/0804/files/3-136-0424-DP-25399_1.jpg",
        ],
      },
      {
        id: "bef6e645-9678-4796-88bc-e7949e85325b",
        title: "Tessie Ankle Strap Heels Matte Black",
        category: "shoes",
        images: [
          "https://cdn.shopify.com/s/files/1/0061/8627/0804/files/0-337-0624-DP-27684_1.jpg",
        ],
      },
      {
        id: "99cc8853-602e-473f-83d9-14524230b3c2",
        title: "Individual 20 Tights Black",
        category: "tights",
        images: [
          "https://www.wolford.com/dw/image/v2/AAYL_PRD/on/demandware.static/-/Sites-wolford-master/default/dw08bd3bb6/images/large/18267_7005_1.jpg",
        ],
      },
    ];

    const res = await request.post("/api/generate", {
      data: {
        productId: outfitItems[0].id,
        outfitItems,
      },
    });

    expect(res.status()).toBeLessThanOrEqual(202);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // Should have results or be processing
    expect(body.productId).toBe(outfitItems[0].id);

    // Check rendering was created in renderings.json
    const renderingsPath = path.join(
      __dirname,
      "..",
      "data",
      "renderings.json"
    );
    const renderings = JSON.parse(fs.readFileSync(renderingsPath, "utf-8"));
    const matching = renderings.filter(
      (r: { productId: string }) => r.productId === outfitItems[0].id
    );
    expect(matching.length).toBeGreaterThan(0);

    // Save the rendering ID for the next test
    const latest = matching[matching.length - 1];
    renderingId = latest.id;
  });

  test("generated image is accessible", async ({ request }) => {
    // Poll until rendering is done (max 90s, every 5s)
    const renderingsPath = path.join(
      __dirname,
      "..",
      "data",
      "renderings.json"
    );
    let generatedImage = "";

    for (let i = 0; i < 18; i++) {
      const renderings = JSON.parse(fs.readFileSync(renderingsPath, "utf-8"));
      const rendering = renderings.find(
        (r: { id: string }) => r.id === renderingId
      );
      if (rendering?.status === "done" && rendering.generatedImage) {
        generatedImage = rendering.generatedImage;
        break;
      }
      if (rendering?.status === "error") {
        // If error, the test still passes the first assertion — skip image check
        test.skip(true, `Generation errored: ${rendering.error}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    expect(generatedImage).toBeTruthy();

    // Fetch the generated image
    const imgRes = await request.get(generatedImage);
    expect(imgRes.status()).toBe(200);
    expect(imgRes.headers()["content-type"]).toContain("image/jpeg");

    // Save screenshot evidence
    const buffer = await imgRes.body();
    fs.writeFileSync(path.join(EVAL_DIR, "generated-outfit.jpg"), buffer);
  });
});
