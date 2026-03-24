import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getImageBuffer, getImageBufferAsync } from "@/lib/db";

const IS_VERCEL = !!process.env.VERCEL;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  // Only allow simple filenames — no directory traversal
  const filename = segments.join("/");
  if (filename.includes("..") || filename.startsWith("/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType =
    ext === ".png" ? "image/png" :
    ext === ".webp" ? "image/webp" :
    "image/jpeg";

  // On Vercel, serve from in-memory store or KV
  if (IS_VERCEL) {
    // Try sync memory first, then async KV
    let buffer = getImageBuffer(filename);
    if (!buffer) {
      buffer = (await getImageBufferAsync(filename)) ?? undefined;
    }
    if (!buffer) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Local: serve from filesystem
  const filePath = path.join(process.cwd(), "public", "generated", filename);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
