import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getImageBuffer, getImageBufferAsync } from "@/lib/db";

const IS_VERCEL = !!process.env.VERCEL;

export async function GET() {
  // On Vercel, check in-memory store then KV
  if (IS_VERCEL) {
    let memBuffer = getImageBuffer("reference.jpg");
    if (!memBuffer) {
      memBuffer = (await getImageBufferAsync("reference.jpg")) ?? undefined;
    }
    if (memBuffer) {
      return new NextResponse(new Uint8Array(memBuffer), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    }
  }

  const filePath = path.join(process.cwd(), "public", "uploads", "reference.jpg");
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
