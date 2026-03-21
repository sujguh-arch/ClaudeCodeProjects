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

  // Generate renderings for all images IN PARALLEL (3 at a time for speed)
  const results: { originalImage: string; generatedImage: string; status: string }[] = [];
  const errors: { originalImage: string; error: string; status: string }[] = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < product.images.length; i += BATCH_SIZE) {
    const batch = product.images.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (image) => {
        const renderingId = randomUUID();
        const generated = await generateRendering(
          productId,
          image,
          product.category,
          renderingId
        );
        return { originalImage: image, generatedImage: generated, status: "done" as const };
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        errors.push({
          originalImage: "",
          error: result.reason?.message || "Unknown error",
          status: "error",
        });
      }
    }
  }

  return NextResponse.json({
    productId,
    generated: results.length,
    errors: errors.length,
    results,
    errors_detail: errors,
  });
}
