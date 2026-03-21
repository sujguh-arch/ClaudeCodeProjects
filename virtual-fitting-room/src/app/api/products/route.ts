import { NextRequest, NextResponse } from "next/server";
import {
  getProducts,
  addProduct,
  deleteProduct,
  type Product,
} from "@/lib/db";
import { scrapeGenericProduct } from "@/lib/scraper";
import { randomUUID } from "crypto";

export async function GET() {
  return NextResponse.json(getProducts());
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Manual add with explicit data
  if (body.title && body.images && body.images.length > 0) {
    // Dedup check
    const existing = getProducts();
    if (body.url && existing.some((p) => p.url === body.url)) {
      return NextResponse.json(existing.find((p) => p.url === body.url));
    }

    const product: Product = {
      id: randomUUID(),
      url: body.url || "",
      title: body.title,
      price: body.price || null,
      store: body.store || "Manual",
      category: body.category || "dress",
      lengthInches: body.lengthInches || null,
      images: body.images,
      createdAt: new Date().toISOString(),
    };
    addProduct(product);
    return NextResponse.json(product);
  }

  if (body.url) {
    // Dedup check
    const existing = getProducts();
    const dupe = existing.find((p) => p.url === body.url);
    if (dupe) return NextResponse.json(dupe);

    const scraped = await scrapeGenericProduct(body.url);
    if (!scraped) {
      return NextResponse.json({ error: "Couldn't find that product" }, { status: 400 });
    }

    // Validate scraped data — reject garbage
    if (!scraped.images || scraped.images.length === 0) {
      return NextResponse.json({ error: "No product images found" }, { status: 400 });
    }
    if (scraped.title.toLowerCase().includes("not found") || scraped.title.toLowerCase().includes("error")) {
      return NextResponse.json({ error: "Product page not found" }, { status: 400 });
    }

    const product: Product = {
      id: randomUUID(),
      url: scraped.url,
      title: scraped.title,
      price: scraped.price,
      store: scraped.store,
      category: body.category || scraped.detectedCategory || "dress",
      lengthInches: null,
      images: scraped.images,
      createdAt: new Date().toISOString(),
    };

    addProduct(product);
    return NextResponse.json(product);
  }

  return NextResponse.json({ error: "Provide url or title+images" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    deleteProduct(body.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Provide id in body" }, { status: 400 });
  }
}
