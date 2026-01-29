import { spawn, ChildProcess } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE endpoint for streaming prefill logs in real-time.
 *
 * Event types:
 * - log: A log message from the automation script
 * - progress: Progress update (0-100)
 * - complete: Final status (success or error)
 */
export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();
  let child: ChildProcess | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: string) => {
        const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(event));
      };

      try {
        sendEvent("log", "Starting prefill automation...");

        const scriptPath = path.join(process.cwd(), "automation", "prefill.ts");

        child = spawn("npx", ["tsx", scriptPath], {
          cwd: process.cwd(),
          stdio: ["ignore", "pipe", "pipe"],
        });

        let logCount = 0;
        const totalExpectedLogs = 20; // Approximate for progress calculation

        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (trimmed) {
            sendEvent("log", trimmed);
            logCount++;
            const progress = Math.min(Math.round((logCount / totalExpectedLogs) * 100), 95);
            sendEvent("progress", String(progress));
          }
        };

        let stdoutBuffer = "";
        child.stdout.on("data", (data: Buffer) => {
          stdoutBuffer += data.toString();
          const lines = stdoutBuffer.split("\n");
          stdoutBuffer = lines.pop() || "";
          lines.forEach(processLine);
        });

        let stderrBuffer = "";
        child.stderr.on("data", (data: Buffer) => {
          stderrBuffer += data.toString();
          const lines = stderrBuffer.split("\n");
          stderrBuffer = lines.pop() || "";
          lines.forEach(processLine);
        });

        child.on("close", (code: number | null) => {
          // Process any remaining buffered content
          if (stdoutBuffer.trim()) processLine(stdoutBuffer);
          if (stderrBuffer.trim()) processLine(stderrBuffer);

          if (code === 0) {
            sendEvent("progress", "100");
            sendEvent("complete", "success");
          } else {
            sendEvent("complete", `error: Process exited with code ${code}`);
          }
          controller.close();
        });

        child.on("error", (err: Error) => {
          sendEvent("complete", `error: ${err.message}`);
          controller.close();
        });

      } catch (error) {
        if (child) {
          child.kill();
        }
        sendEvent("complete", `error: ${error instanceof Error ? error.message : "Unknown error"}`);
        controller.close();
      }
    },
    cancel() {
      // Client disconnected, clean up the child process
      if (child) {
        child.kill();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
