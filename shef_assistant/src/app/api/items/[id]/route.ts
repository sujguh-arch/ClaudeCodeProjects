import { NextRequest, NextResponse } from "next/server";
import { getItemById, updateItem, deleteItem } from "@/lib/config-service";
import { isValidShefUrl } from "@/lib/types";
import type { ApiResponse, ShefItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/items/[id] - Get a single item
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ShefItem>>> {
  try {
    const { id } = await params;
    const item = getItemById(id);

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: "Item not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get item",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/items/[id] - Update an item
 * Body: { name?: string, url?: string, quantity?: number }
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ShefItem>>> {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, quantity } = body;

    // Validate URL if provided
    if (url !== undefined) {
      if (typeof url !== "string" || !url.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "URL cannot be empty",
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
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: "Name cannot be empty",
        },
        { status: 400 }
      );
    }

    // Validate quantity if provided
    if (quantity !== undefined && (typeof quantity !== "number" || quantity < 1)) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be at least 1",
        },
        { status: 400 }
      );
    }

    const updates: Partial<Omit<ShefItem, "id">> = {};
    if (name !== undefined) updates.name = name.trim();
    if (url !== undefined) updates.url = url.trim();
    if (quantity !== undefined) updates.quantity = quantity;

    const updatedItem = updateItem(id, updates);

    if (!updatedItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Item not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: "Item updated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update item",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/items/[id] - Delete an item
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await params;
    const deleted = deleteItem(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: "Item not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete item",
      },
      { status: 500 }
    );
  }
}
