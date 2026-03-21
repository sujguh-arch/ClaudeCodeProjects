import { NextRequest, NextResponse } from "next/server";
import {
  getOutfits,
  getOutfit,
  addOutfit,
  updateOutfit,
  deleteOutfit,
  getProduct,
  type Outfit,
} from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const outfits = getOutfits();
  // Resolve product data for each outfit
  const enriched = outfits.map((outfit) => {
    const products: Record<string, ReturnType<typeof getProduct>> = {};
    for (const [cat, val] of Object.entries(outfit.items)) {
      if (!val) continue;
      if (Array.isArray(val)) {
        // accessories array
        for (const pid of val) {
          const p = getProduct(pid);
          if (p) products[pid] = p;
        }
      } else {
        const p = getProduct(val);
        if (p) products[val] = p;
      }
    }
    return { ...outfit, products };
  });
  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const outfit: Outfit = {
    id: randomUUID(),
    name: body.name || "New Outfit",
    items: body.items || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  addOutfit(outfit);
  return NextResponse.json(outfit);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Provide outfit id" }, { status: 400 });
  }
  const updated = updateOutfit(body.id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.items !== undefined && { items: body.items }),
  });
  if (!updated) {
    return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Provide outfit id" }, { status: 400 });
  }
  deleteOutfit(body.id);
  return NextResponse.json({ ok: true });
}
