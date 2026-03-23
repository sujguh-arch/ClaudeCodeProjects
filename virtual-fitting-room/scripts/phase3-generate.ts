/**
 * Phase 3: Run exactly 3 real Replicate generations and save results.
 *
 * Usage: npx tsx scripts/phase3-generate.ts
 */
import Replicate from "replicate";
import fs from "fs";
import path from "path";

const EVAL_DIR = path.resolve(__dirname, "../eval/phase3");
fs.mkdirSync(EVAL_DIR, { recursive: true });

const REF_PHOTO = path.join(__dirname, "../public/uploads/reference.jpg");
const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN) {
  console.error("REPLICATE_API_TOKEN not set");
  process.exit(1);
}

const replicate = new Replicate({ auth: TOKEN });

const GENERATIONS = [
  {
    name: "generation-dress",
    productImage: "https://cdn.shopify.com/s/files/1/0506/5886/9443/files/Brittany-Chiffon-Maxi-Dress-Yellow-4jpg.jpg?v=1738643207",
    prompt: "Generate a fashion photo of the woman from the first image in the exact same pose and outfit as the second image. Keep her exact face, skin tone, hair color and style. Match the exact same camera angle, background, and lighting as the second image. The clothing must look identical to the second image.",
  },
  {
    name: "generation-tights",
    productImage: "https://www.wolford.com/dw/image/v2/BKQM_PRD/on/demandware.static/-/Sites-master-catalog/default/dw95b1f122/2023/18267_7005_100_001_B_X_B2BL.jpg?sw=500&sh=667&q=100&strip=false",
    prompt: "Generate a full-body fashion photo of the woman from the first image wearing the exact tights/hosiery from the second image. Keep her face, skin tone, and hair. Match the pose and background.",
  },
  {
    name: "generation-outfit",
    productImage: "https://cdn.shopify.com/s/files/1/0506/5886/9443/files/Brittany-Chiffon-Maxi-Dress-Yellow-4jpg.jpg?v=1738643207",
    prompt: "Generate a full-body fashion photo of the woman from the first image wearing the exact outfit from the second image with black ankle strap heels. Keep her exact face, skin tone, hair color and style. Professional fashion photography. Match camera angle and lighting.",
  },
];

async function uploadReference(): Promise<string> {
  console.log("Uploading reference photo...");
  const file = fs.readFileSync(REF_PHOTO);
  const blob = new Blob([file], { type: "image/jpeg" });
  const uploaded = await replicate.files.create(blob, { filename: "reference.jpg" });
  console.log("Reference uploaded:", uploaded.urls.get);
  return uploaded.urls.get;
}

async function generate(refUrl: string, productImage: string, prompt: string): Promise<Buffer> {
  console.log("Running generation...");
  const output = await replicate.run("google/nano-banana-pro" as `${string}/${string}`, {
    input: {
      prompt,
      image_input: [refUrl, productImage],
      resolution: "1K",
      aspect_ratio: "3:4",
    },
  });

  const url = Array.isArray(output) ? String(output[0]) : String(output);
  console.log("  Output URL:", url.substring(0, 80) + "...");

  const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function main() {
  const logFile = path.join(__dirname, "../eval/logs/phase3-claude.log");
  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    fs.appendFileSync(logFile, line + "\n");
  };

  log("Phase 3: Starting 3 real generations");

  let refUrl: string;
  try {
    refUrl = await uploadReference();
    log("Reference photo uploaded successfully");
  } catch (err) {
    log(`ERROR uploading reference: ${err}`);
    process.exit(1);
  }

  let successCount = 0;
  for (const gen of GENERATIONS) {
    log(`Generating: ${gen.name}`);
    const outPath = path.join(EVAL_DIR, `${gen.name}.png`);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const buffer = await generate(refUrl, gen.productImage, gen.prompt);
        fs.writeFileSync(outPath, buffer);
        log(`SUCCESS: ${gen.name} saved (${buffer.length} bytes)`);
        successCount++;
        break;
      } catch (err) {
        log(`ATTEMPT ${attempt + 1} FAILED for ${gen.name}: ${err}`);
        if (attempt === 1) {
          log(`GIVING UP on ${gen.name}`);
        }
      }
    }
  }

  log(`Phase 3 complete: ${successCount}/3 generations succeeded`);

  if (successCount === 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
