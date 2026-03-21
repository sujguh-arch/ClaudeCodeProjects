import Replicate from "replicate";
import fs from "fs";
import path from "path";
import { getSettings, upsertRendering, type Rendering } from "./db";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");

if (!fs.existsSync(GENERATED_DIR))
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

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

export async function generateRendering(
  productId: string,
  originalImage: string,
  category: string,
  renderingId: string
): Promise<string> {
  const settings = getSettings();
  const replicate = new Replicate({ auth: settings.replicateToken });

  const rendering: Rendering = {
    id: renderingId,
    productId,
    originalImage,
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
      const uploaded = await replicate.files.create(blob, {
        filename: "reference.jpg",
      });
      refPhotoUrl = uploaded.urls.get;
    }

    const prompt = PROMPTS[category] || PROMPTS.other;

    const output = await replicate.run(settings.model as `${string}/${string}`, {
      input: {
        prompt,
        image_input: [refPhotoUrl, originalImage],
        resolution: "1K",
        aspect_ratio: "3:4",
      },
    });

    const url = Array.isArray(output) ? String(output[0]) : String(output);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Download failed: " + resp.status);
    const buffer = Buffer.from(await resp.arrayBuffer());

    const filename = `${renderingId}.jpg`;
    const outPath = path.join(GENERATED_DIR, filename);
    fs.writeFileSync(outPath, buffer);

    rendering.generatedImage = `/generated/${filename}`;
    rendering.status = "done";
    upsertRendering(rendering);

    return rendering.generatedImage;
  } catch (err) {
    rendering.status = "error";
    rendering.error = err instanceof Error ? err.message : String(err);
    upsertRendering(rendering);
    throw err;
  }
}
