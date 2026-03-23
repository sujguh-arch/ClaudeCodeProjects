import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings, setImageBuffer } from "@/lib/db";
import fs from "fs";
import path from "path";

const IS_VERCEL = !!process.env.VERCEL;

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({
    ...settings,
    replicateToken: settings.replicateToken ? "***configured***" : "",
  });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const photo = formData.get("referencePhoto") as File | null;
    const token = formData.get("replicateToken") as string | null;

    const settings = getSettings();

    if (photo && photo.size > 0) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      const filename = `reference_${Date.now()}.jpg`;

      if (IS_VERCEL) {
        // Store in memory on Vercel — serve via /api/images/
        setImageBuffer(filename, buffer);
        settings.referencePhoto = `/api/images/${filename}`;
      } else {
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadsDir))
          fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        settings.referencePhoto = `/uploads/${filename}`;
      }
    }

    if (token && token !== "***configured***") {
      settings.replicateToken = token;
    }

    saveSettings(settings);
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();
  const settings = getSettings();
  if (body.replicateToken) settings.replicateToken = body.replicateToken;
  if (body.referencePhoto) settings.referencePhoto = body.referencePhoto;
  if (body.model) settings.model = body.model;
  saveSettings(settings);
  return NextResponse.json({ ok: true });
}
