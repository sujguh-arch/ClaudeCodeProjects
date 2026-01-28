import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LaunchResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/login/launch - Launch browser for manual login
 *
 * Opens a visible browser window for the user to log in manually.
 * The browser uses a persistent profile so the session is saved.
 */
export async function POST(): Promise<NextResponse<LaunchResponse>> {
  try {
    const scriptPath = path.join(process.cwd(), "automation", "login.ts");

    // Spawn the login script as a detached process
    // This allows the browser to stay open while the API returns
    const child = spawn("npx", ["tsx", scriptPath], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
    });

    // Unref the child so the parent process can exit independently
    child.unref();

    return NextResponse.json({
      success: true,
      message: "Login browser launched. Please log in and press Enter in the terminal to save your session.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to launch login browser",
      },
      { status: 500 }
    );
  }
}
