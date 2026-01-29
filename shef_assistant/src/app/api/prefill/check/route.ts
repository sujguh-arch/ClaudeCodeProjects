import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import type { ShefItem, AvailabilityCheckResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckResult {
  success: boolean;
  available: Array<{ name: string; url: string }>;
  unavailable: Array<{ name: string; url: string; reason: string }>;
  error?: string;
}

/**
 * POST /api/prefill/check - Check availability of items before prefill
 *
 * Returns which items are available and which are unavailable with reasons.
 */
export async function POST(): Promise<NextResponse<AvailabilityCheckResponse | { error: string }>> {
  try {
    const scriptPath = path.join(process.cwd(), "automation", "check-availability-json.ts");

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";

      const child = spawn("npx", ["tsx", scriptPath], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, DEBUG_AVAIL: "0" },
      });

      child.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code !== 0) {
          resolve(
            NextResponse.json(
              { error: `Availability check failed: ${stderr || "Unknown error"}` },
              { status: 500 }
            )
          );
          return;
        }

        try {
          // Find the JSON in stdout (might have log lines before it)
          const lines = stdout.trim().split("\n");
          const jsonLine = lines[lines.length - 1]; // JSON should be last line
          const result: CheckResult = JSON.parse(jsonLine);

          if (!result.success) {
            resolve(
              NextResponse.json(
                { error: result.error || "Availability check failed" },
                { status: 500 }
              )
            );
            return;
          }

          // Map to response format
          const response: AvailabilityCheckResponse = {
            available: result.available.map((item) => ({
              id: "", // We don't have ID from the checker, will match by URL in UI
              name: item.name,
              url: item.url,
              quantity: 0, // Will be filled by UI from original items
            })),
            unavailable: result.unavailable.map((item) => ({
              item: {
                id: "",
                name: item.name,
                url: item.url,
                quantity: 0,
              },
              reason: item.reason,
            })),
          };

          resolve(NextResponse.json(response));
        } catch (parseError) {
          resolve(
            NextResponse.json(
              { error: `Failed to parse availability results: ${stdout}` },
              { status: 500 }
            )
          );
        }
      });

      child.on("error", (err) => {
        resolve(
          NextResponse.json(
            { error: `Failed to run availability check: ${err.message}` },
            { status: 500 }
          )
        );
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        child.kill();
        resolve(
          NextResponse.json(
            { error: "Availability check timed out" },
            { status: 504 }
          )
        );
      }, 120000);
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
