import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const runtime = "nodejs";

interface Config {
  shefHomeUrl: string;
  cartUrl: string;
  items: { name: string; url: string; quantity: number }[];
}

export async function GET() {
  const configPath = path.join(process.cwd(), "data", "config.json");

  try {
    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { error: "Config not found", shefHomeUrl: "https://shef.com" },
        { status: 404 }
      );
    }

    const config: Config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    return NextResponse.json({
      shefHomeUrl: config.shefHomeUrl,
      cartUrl: config.cartUrl,
      itemCount: config.items.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        shefHomeUrl: "https://shef.com",
      },
      { status: 500 }
    );
  }
}
