import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getImageBuffer } from "@/lib/db";

const IS_VERCEL = !!process.env.VERCEL;

export async function GET() {
  // On Vercel, check in-memory store first
  if (IS_VERCEL) {
    // Try to find any reference image in memory
    const memBuffer = getImageBuffer("reference.jpg");
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
