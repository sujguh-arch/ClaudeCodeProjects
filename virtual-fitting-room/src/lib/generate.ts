import Replicate from "replicate";
import fs from "fs";
import path from "path";
import { getSettings, getRenderings, upsertRendering, type Rendering } from "./db";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

if (!fs.existsSync(GENERATED_DIR))
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

const GENERATION_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 2_000;

const PROMPTS: Record<string, string> = {
  dress:
    "Generate a fashion photo of the woman from the first image in the exact same pose and outfit as the second image. Keep her exact face, skin tone, hair color and style. Match the exact same camera angle, background, and lighting as the second image. The clothing must look identical to the second image.",
  shoes:
    "Generate a photo showing the woman from the first image wearing the exact shoes from the second image. Keep her skin tone. Match the camera angle and background of the second image. Show the shoes clearly.",
  tights:
    "Generate a full-body fashion photo of the woman from the first image wearing the exact tights/hosiery from the second image. Keep her face, skin tone, and hair. Match the pose and background.",
  bag: "Generate a fashion photo of the woman from the first image holding the exact bag from the second image. Keep her exact face, skin tone, hair color and style. Show the bag prominently. Match the camera angle and lighting of the second image. Professional fashion photography.",
  accessories:
    "Generate a fashion portrait of the woman from the first image wearing the exact jewelry/accessories from the second image. Keep her exact face, skin tone, and hair. The accessories must look identical to the second image. Professional fashion photography with soft lighting.",
  other:
    "Generate a fashion photo of the woman from the first image wearing/using the item from the second image. Keep her exact face, skin tone, and hair.",
};

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
    msg.includes("safety")
  );
}

export interface OutfitItem {
  id: string;
  title: string;
  category: string;
  images: string[];
}

function buildOutfitPromptAndImages(
  refPhotoUrl: string,
  outfitItems: OutfitItem[]
): { prompt: string; image_input: string[] } {
  const image_input: string[] = [refPhotoUrl];
  const lines: string[] = [];

  // Primary garment (dress) first, then others
  const dress = outfitItems.find((i) => i.category === "dress");
  const rest = outfitItems.filter((i) => i.category !== "dress");
  const ordered = dress ? [dress, ...rest] : outfitItems;

  let imgNum = 2;
  for (const item of ordered) {
    if (image_input.length >= 6) break;
    const img = item.images[0];
    if (!img) continue;
    image_input.push(img);
    const role = item.category === "dress" ? "this is the main dress/garment" : `these exact ${item.category}`;
    lines.push(`- ${item.title} (shown in image ${imgNum}) — ${role}`);
    imgNum++;
  }

  const prompt = `Generate a full-body fashion photo of the woman from the first image wearing a complete outfit. She must be wearing ALL of these items together:\n${lines.join("\n")}\nKeep her exact face, skin tone, hair color and style from image 1. Full body shot showing all items clearly. Professional fashion photography with elegant lighting. Every item must be visible in the final image.`;

  return { prompt, image_input };
}

export async function generateRendering(
  productId: string,
  images: string[],
  category: string,
  renderingId: string,
  outfitItems?: OutfitItem[]
): Promise<string> {
  // Dedup: check if a completed rendering already exists for this product
  const existing = getRenderings().find(
    (r) =>
      r.productId === productId &&
      r.originalImage === images[0] &&
      r.status === "done" &&
      r.generatedImage
  );
  if (existing) {
    return existing.generatedImage;
  }

  const settings = getSettings();
  const replicate = new Replicate({ auth: settings.replicateToken });

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
    // Upload reference photo if it's a local file
    let refPhotoUrl = settings.referencePhoto || "";
    if (refPhotoUrl.startsWith("/")) {
      const filePath = path.join(process.cwd(), "public", refPhotoUrl);
      const file = fs.readFileSync(filePath);
      const blob = new Blob([file], { type: "image/jpeg" });
      const uploaded = await withTimeout(
        replicate.files.create(blob, { filename: "reference.jpg" }),
        GENERATION_TIMEOUT_MS
      );
      refPhotoUrl = uploaded.urls.get;
    }

    // If outfitItems provided, use multi-image outfit prompt
    if (outfitItems && outfitItems.length > 0) {
      const { prompt: outfitPrompt, image_input } = buildOutfitPromptAndImages(refPhotoUrl, outfitItems);

      let lastError: Error | undefined;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const output = await withTimeout(
            replicate.run(settings.model as `${string}/${string}`, {
              input: {
                prompt: outfitPrompt,
                image_input,
                resolution: "1K",
                aspect_ratio: "3:4",
                safety_tolerance: 5,
              },
            }),
            GENERATION_TIMEOUT_MS
          );

          const url = Array.isArray(output) ? String(output[0]) : String(output);
          const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
          if (!resp.ok) throw new Error("Download failed: " + resp.status);
          const buffer = Buffer.from(await resp.arrayBuffer());

          const filename = `${renderingId}.jpg`;
          const outPath = path.join(GENERATED_DIR, filename);
          fs.writeFileSync(outPath, buffer);

          rendering.originalImage = images[0];
          rendering.generatedImage = `/api/images/${filename}`;
          rendering.status = "done";
          upsertRendering(rendering);

          return rendering.generatedImage;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (isSensitiveContentError(lastError)) break;
          const is429 =
            lastError.message.includes("429") ||
            lastError.message.includes("rate limit") ||
            lastError.message.includes("too many requests");
          if (is429 && attempt < MAX_RETRIES) {
            await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
            continue;
          }
          throw lastError;
        }
      }
      if (lastError) throw lastError;
      throw new Error("Generation failed");
    }

    const prompt = PROMPTS[category] || PROMPTS.other;

    // Try each product image — if one is flagged as sensitive, try the next angle
    for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
      const productImage = images[imgIdx];

      // Retry loop for Replicate API (handles 429 rate limits)
      let lastError: Error | undefined;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const output = await withTimeout(
            replicate.run(settings.model as `${string}/${string}`, {
              input: {
                prompt,
                image_input: [refPhotoUrl, productImage],
                resolution: "1K",
                aspect_ratio: "3:4",
                safety_tolerance: 5,
              },
            }),
            GENERATION_TIMEOUT_MS
          );

          const url = Array.isArray(output) ? String(output[0]) : String(output);
          const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
          if (!resp.ok) throw new Error("Download failed: " + resp.status);
          const buffer = Buffer.from(await resp.arrayBuffer());

          const filename = `${renderingId}.jpg`;
          const outPath = path.join(GENERATED_DIR, filename);
          fs.writeFileSync(outPath, buffer);

          rendering.originalImage = productImage;
          rendering.generatedImage = `/api/images/${filename}`;
          rendering.status = "done";
          upsertRendering(rendering);

          return rendering.generatedImage;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          // If sensitive content error, try next image angle instead of retrying
          if (isSensitiveContentError(lastError)) {
            break; // break retry loop, continue to next image
          }

          // Only retry on 429 (rate limit) errors
          const is429 =
            lastError.message.includes("429") ||
            lastError.message.includes("rate limit") ||
            lastError.message.includes("too many requests");
          if (is429 && attempt < MAX_RETRIES) {
            await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
            continue;
          }
          throw lastError;
        }
      }

      // If we broke out of retry loop due to sensitive content and have more images, continue
      if (lastError && isSensitiveContentError(lastError) && imgIdx < images.length - 1) {
        continue;
      }

      // If this was the last image and it was flagged, throw a clear error
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
