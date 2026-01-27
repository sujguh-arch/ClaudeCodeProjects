import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const logs: string[] = [];

  try {
    logs.push("Starting prefill script...");

    // Run the prefill script using tsx
    const scriptPath = path.join(process.cwd(), "automation", "prefill.ts");

    const result = await new Promise<{ success: boolean; output: string }>(
      (resolve) => {
        const child = spawn("npx", ["tsx", scriptPath], {
          cwd: process.cwd(),
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        child.on("close", (code) => {
          if (code === 0) {
            resolve({ success: true, output: stdout });
          } else {
            resolve({ success: false, output: stderr || stdout });
          }
        });

        child.on("error", (err) => {
          resolve({ success: false, output: err.message });
        });
      }
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Prefill completed successfully",
        logs: result.output.split("\n").filter((l) => l.trim()),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Prefill failed",
          logs: result.output.split("\n").filter((l) => l.trim()),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        logs,
      },
      { status: 500 }
    );
  }
}
