import { NextRequest, NextResponse } from "next/server";
import { getAllItems, createItem } from "@/lib/config-service";
import { isValidShefUrl } from "@/lib/types";
import type { ApiResponse, ShefItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/items - List all items
 */
export async function GET(): Promise<NextResponse<ApiResponse<ShefItem[]>>> {
  try {
    const items = getAllItems();
    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read items",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/items - Create a new item
 * Body: { name: string, url: string, quantity: number }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ShefItem>>> {
  try {
    const body = await request.json();
    const { name, url, quantity } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Name is required",
        },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "URL is required",
        },
        { status: 400 }
      );
    }

    if (!isValidShefUrl(url)) {
      return NextResponse.json(
        {
          success: false,
          error: "URL must start with https://shef.com/",
        },
        { status: 400 }
      );
    }

    const qty = typeof quantity === "number" ? quantity : 1;
    if (qty < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be at least 1",
        },
        { status: 400 }
      );
    }

    const newItem = createItem(name, url, qty);

    return NextResponse.json(
      {
        success: true,
        data: newItem,
        message: "Item created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create item",
      },
      { status: 500 }
    );
  }
}
