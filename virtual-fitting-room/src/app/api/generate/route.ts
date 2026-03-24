import { NextRequest, NextResponse } from "next/server";
import {
  getProduct,
  getRenderings,
  getRenderingsForProduct,
} from "@/lib/db";
import { generateRendering, getPoseVariations } from "@/lib/generate";
import { randomUUID } from "crypto";

export const maxDuration = 300; // 5 min timeout for Vercel

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (productId) {
    return NextResponse.json(getRenderingsForProduct(productId));
  }
  return NextResponse.json(getRenderings());
}

export async function POST(req: NextRequest) {
  const { productId, outfitItems, pose } = await req.json();
  const product = getProduct(productId);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const firstImage = product.images[0];
  if (!firstImage) {
    return NextResponse.json({ error: "Product has no images" }, { status: 400 });
  }

  // Get 4 pose variations for the selected vibe
  const poseVariations = getPoseVariations(pose || "editorial");

  // Generate 4 unique rendering IDs
  const renderingIds = poseVariations.map(() => randomUUID());

  // Stagger generation calls with 5s delay to avoid Replicate rate limiting
  const generationPromises = [];
  for (const [i, poseVariation] of poseVariations.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 5000));
    generationPromises.push(
      generateRendering(
        productId,
        product.images,
        product.category,
        renderingIds[i],
        outfitItems,
        pose || "editorial",
        poseVariation
      ).catch((err) => {
        throw err;
      })
    );
  }
  const results = await Promise.allSettled(generationPromises);

  const successResults = results
    .map((r, i) => {
      if (r.status === "fulfilled") {
        return {
          renderingId: renderingIds[i],
          originalImage: firstImage,
          generatedImage: r.value,
          status: "done" as const,
        };
      }
      return {
        renderingId: renderingIds[i],
        originalImage: firstImage,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        status: "error" as const,
      };
    });

  const generated = successResults.filter((r) => r.status === "done").length;
  const errors = successResults.filter((r) => r.status === "error").length;

  return NextResponse.json({
    productId,
    generated,
    errors,
    renderingIds,
    results: successResults.filter((r) => r.status === "done"),
    errors_detail: successResults.filter((r) => r.status === "error"),
    costEstimate: generated * 0.15,
  });
}
