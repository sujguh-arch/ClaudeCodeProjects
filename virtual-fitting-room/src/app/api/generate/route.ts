import { NextRequest, NextResponse } from "next/server";
import {
  getProduct,
  getRenderings,
  getRenderingsForProduct,
} from "@/lib/db";
import { generateRendering } from "@/lib/generate";
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
  const { productId } = await req.json();
  const product = getProduct(productId);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Generate ONLY the first image synchronously (fast ~25-30s response)
  // Then kick off remaining images in background
  const firstImage = product.images[0];
  if (!firstImage) {
    return NextResponse.json({ error: "Product has no images" }, { status: 400 });
  }

  const renderingId = randomUUID();
  try {
    const generated = await generateRendering(
      productId,
      firstImage,
      product.category,
      renderingId
    );

    // Fire-and-forget: generate remaining images in background
    const remainingImages = product.images.slice(1);
    if (remainingImages.length > 0) {
      generateRemainingInBackground(productId, remainingImages, product.category);
    }

    return NextResponse.json({
      productId,
      generated: 1,
      errors: 0,
      results: [{ originalImage: firstImage, generatedImage: generated, status: "done" }],
      remaining: remainingImages.length,
    });
  } catch (err) {
    return NextResponse.json({
      productId,
      generated: 0,
      errors: 1,
      results: [],
      errors_detail: [{ originalImage: firstImage, error: err instanceof Error ? err.message : String(err), status: "error" }],
    });
  }
}

// Background generation for remaining images — no await, runs after response
function generateRemainingInBackground(
  productId: string,
  images: string[],
  category: string
) {
  const BATCH_SIZE = 3;
  (async () => {
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      const batch = images.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map((image) => generateRendering(productId, image, category, randomUUID()))
      );
    }
  })().catch(() => {
    // Silently handle — errors are recorded in rendering status
  });
}
