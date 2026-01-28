import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginStatusResponse {
  loggedIn: boolean;
  hasProfile: boolean;
  error?: string;
}

/**
 * GET /api/login/status - Check if user is logged in to Shef
 */
export async function GET(): Promise<NextResponse<LoginStatusResponse>> {
  const profileDir = path.join(process.cwd(), ".pw-profile");

  // First check if profile directory exists
  if (!fs.existsSync(profileDir)) {
    return NextResponse.json({
      loggedIn: false,
      hasProfile: false,
    });
  }

  try {
    const scriptPath = path.join(process.cwd(), "automation", "check-login.ts");

    const result = await new Promise<string>((resolve) => {
      const child = spawn("npx", ["tsx", scriptPath], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
      });

      let stdout = "";

      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      child.on("close", () => {
        resolve(stdout.trim());
      });

      child.on("error", (err) => {
        resolve(`ERROR:${err.message}`);
      });

      // Timeout after 25 seconds
      setTimeout(() => {
        child.kill();
        resolve("ERROR:Timeout");
      }, 25000);
    });

    if (result === "LOGGED_IN") {
      return NextResponse.json({
        loggedIn: true,
        hasProfile: true,
      });
    } else if (result === "NOT_LOGGED_IN" || result === "NO_PROFILE") {
      return NextResponse.json({
        loggedIn: false,
        hasProfile: result !== "NO_PROFILE",
      });
    } else if (result.startsWith("ERROR:")) {
      return NextResponse.json({
        loggedIn: false,
        hasProfile: true,
        error: result.replace("ERROR:", ""),
      });
    }

    return NextResponse.json({
      loggedIn: false,
      hasProfile: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        loggedIn: false,
        hasProfile: true,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
