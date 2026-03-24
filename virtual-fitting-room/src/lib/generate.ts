import { fal } from "@fal-ai/client";
import fs from "fs";
import path from "path";
import { getSettings, getRenderings, upsertRendering, setImageBuffer, type Rendering } from "./db";

export const POSES: Record<string, string> = {
  editorial: "Standing in a confident editorial pose, one hand on hip, direct gaze at camera",
  walking: "Mid-stride walking pose, natural movement, candid street style",
  seated: "Elegantly seated with legs crossed, relaxed but poised",
  candid: "Caught mid-laugh, looking slightly off-camera, natural and relaxed",
  leaning: "Leaning casually against a wall, relaxed confident posture",
  "evening-out": "Glamorous night-out pose, slight turn showing the full outfit silhouette",
};

const POSE_VARIATIONS: Record<string, string[]> = {
  editorial: [
    "Standing confidently with one hand on hip, direct eye contact with camera",
    "Three-quarter turn, looking over shoulder with a slight smile",
    "Leaning forward deeply over a counter or bar, elbows resting on the surface, back arched, looking at camera with a confident flirty expression. Full body visible from the side showing the complete outfit including shoes and accessories. Legs straight, weight on feet. Glamorous studio setting with marble counter.",
    "Arms relaxed at sides, weight on one leg, serene expression",
  ],
  walking: [
    "Mid-stride on a sidewalk, one foot forward, confident gaze ahead",
    "Pausing mid-step to glance back over her shoulder, hair in motion",
    "Leaning forward deeply over a counter or bar, elbows resting on the surface, back arched, looking at camera with a confident flirty expression. Full body visible from the side showing the complete outfit including shoes and accessories. Legs straight, weight on feet. Glamorous street-side bar setting.",
    "Casual stroll with hands in motion, looking to the side, carefree energy",
  ],
  seated: [
    "Seated with legs crossed elegantly, hands resting on knee, poised expression",
    "Perched on the edge of a chair leaning slightly forward, engaged and warm",
    "Leaning forward deeply over a counter or bar, elbows resting on the surface, back arched, looking at camera with a confident flirty expression. Full body visible from the side showing the complete outfit including shoes and accessories. Legs straight, weight on feet. Glamorous lounge setting with a velvet bar.",
    "Reclined back with one arm draped over the chair, relaxed and confident",
  ],
  candid: [
    "Caught mid-laugh, hands near her face, natural joy, looking slightly off-camera",
    "Glancing down with a soft smile, tucking hair behind her ear",
    "Leaning forward deeply over a counter or bar, elbows resting on the surface, back arched, looking at camera with a confident flirty expression. Full body visible from the side showing the complete outfit including shoes and accessories. Legs straight, weight on feet. Glamorous cocktail bar setting.",
    "Looking up with wide eyes and a surprised smile, spontaneous and bright",
  ],
  leaning: [
    "Leaning against a wall with one shoulder, arms crossed, cool and confident",
    "Leaning back with hands in pockets, chin slightly tilted up, effortless attitude",
    "Leaning forward deeply over a counter or bar, elbows resting on the surface, back arched, looking at camera with a confident flirty expression. Full body visible from the side showing the complete outfit including shoes and accessories. Legs straight, weight on feet. Glamorous rooftop bar setting.",
    "Leaning on one elbow against a surface, relaxed half-smile, looking at camera",
  ],
  "evening-out": [
    "Glamorous pose with slight turn showing the full outfit silhouette, one hand on hip",
    "Walking toward camera under evening lights, sultry confident gaze",
    "Leaning forward deeply over a counter or bar, elbows resting on the surface, back arched, looking at camera with a confident flirty expression. Full body visible from the side showing the complete outfit including shoes and accessories. Legs straight, weight on feet. Glamorous upscale nightclub setting with moody lighting.",
    "Standing tall with clutch in hand, looking off into the distance, elegant and poised",
  ],
};

export function getPoseVariations(vibe: string): string[] {
  return POSE_VARIATIONS[vibe] || POSE_VARIATIONS.editorial;
}

const GENERATION_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Generation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSensitiveContentError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("e005") ||
    msg.includes("sensitive") ||
    msg.includes("flagged") ||
    msg.includes("nsfw") ||
    msg.includes("safety") ||
    msg.includes("moderation")
  );
}

export interface OutfitItem {
  id: string;
  title: string;
  category: string;
  images: string[];
}

function getCategoryForFashn(category: string): "tops" | "bottoms" | "one-pieces" | "auto" {
  switch (category) {
    case "dress": return "one-pieces";
    case "tights": return "bottoms";
    default: return "auto";
  }
}

function configureFal() {
  const falKey = process.env.FAL_KEY;
  if (falKey) {
    fal.config({ credentials: falKey });
  }
}

interface FashnOutput {
  images: Array<{ url: string; content_type?: string; file_name?: string; file_size?: number }>;
}

async function runFashnTryon(
  modelImageUrl: string,
  garmentImageUrl: string,
  category: string,
  seed?: number
): Promise<string> {
  configureFal();

  const input: Record<string, unknown> = {
    model_image: modelImageUrl,
    garment_image: garmentImageUrl,
    category: getCategoryForFashn(category),
    mode: "quality",
    garment_photo_type: "auto",
    moderation_level: "none",
    output_format: "png",
  };

  if (seed !== undefined) {
    input.seed = seed;
  }

  const result = await fal.subscribe("fal-ai/fashn/tryon", {
    input,
  }) as { data: FashnOutput };

  const images = result.data?.images;
  if (!images || images.length === 0) {
    throw new Error("FASHN returned no images");
  }

  return images[0].url;
}

export async function generateRendering(
  productId: string,
  images: string[],
  category: string,
  renderingId: string,
  outfitItems?: OutfitItem[],
  pose?: string,
  poseVariationOverride?: string
): Promise<string> {
  const settings = getSettings();

  const rendering: Rendering = {
    id: renderingId,
    productId,
    originalImage: images[0],
    generatedImage: "",
    status: "generating",
    createdAt: new Date().toISOString(),
  };
  upsertRendering(rendering);

  try {
    // Get reference photo URL
    let refPhotoUrl = settings.referencePhoto || "";
    if (refPhotoUrl.startsWith("/")) {
      // For local files, we need a publicly accessible URL
      // Convert to a data URI or use a file upload approach
      const filePath = path.join(process.cwd(), "public", refPhotoUrl);
      const file = fs.readFileSync(filePath);
      const base64 = file.toString("base64");
      const mimeType = refPhotoUrl.endsWith(".png") ? "image/png" : "image/jpeg";
      refPhotoUrl = `data:${mimeType};base64,${base64}`;
    }

    // Use a unique seed per variation to get different results
    const seed = Math.floor(Math.random() * 2147483647);

    // FASHN is a virtual try-on model — it takes a person image + garment image
    // For outfits, use the primary garment (dress) image
    const garmentImage = (() => {
      if (outfitItems && outfitItems.length > 0) {
        const dress = outfitItems.find((i) => i.category === "dress");
        return (dress || outfitItems[0]).images[0];
      }
      return images[0];
    })();

    const garmentCategory = (() => {
      if (outfitItems && outfitItems.length > 0) {
        const dress = outfitItems.find((i) => i.category === "dress");
        return (dress || outfitItems[0]).category;
      }
      return category;
    })();

    // Try each product image on sensitive content errors
    const imagesToTry = outfitItems && outfitItems.length > 0
      ? (() => {
          const dress = outfitItems.find((i) => i.category === "dress");
          return (dress || outfitItems[0]).images;
        })()
      : images;

    for (let imgIdx = 0; imgIdx < imagesToTry.length; imgIdx++) {
      const currentGarmentImage = imagesToTry[imgIdx];

      let lastError: Error | undefined;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const url = await withTimeout(
            runFashnTryon(refPhotoUrl, currentGarmentImage, garmentCategory, seed + imgIdx),
            GENERATION_TIMEOUT_MS
          );

          rendering.originalImage = currentGarmentImage;
          rendering.generatedImage = url;
          rendering.status = "done";
          upsertRendering(rendering);

          return rendering.generatedImage;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          if (isSensitiveContentError(lastError)) break;

          const isRateLimit =
            lastError.message.includes("429") ||
            lastError.message.includes("rate limit") ||
            lastError.message.includes("too many requests");
          if (isRateLimit && attempt < MAX_RETRIES) {
            await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
            continue;
          }
          throw lastError;
        }
      }

      if (lastError && isSensitiveContentError(lastError) && imgIdx < imagesToTry.length - 1) {
        continue;
      }

      if (lastError && isSensitiveContentError(lastError)) {
        throw new Error("All product images were flagged as sensitive content by the AI model");
      }

      if (lastError) throw lastError;
    }

    throw new Error("Generation failed");
  } catch (err) {
    rendering.status = "error";
    rendering.error = err instanceof Error ? err.message : String(err);
    upsertRendering(rendering);
    throw err;
  }
}
