import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { join } from "path";
import type { ApiResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchResult {
  name: string;
  url: string;
  price?: string;
  chef?: string;
}

interface SearchData {
  query: string;
  results: SearchResult[];
}

/**
 * GET /api/search?q=<query> - Search for dishes on Shef
 *
 * Spawns the automation/lib/search.ts script to perform real search via Playwright.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SearchData>>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: "Search query is required",
      },
      { status: 400 }
    );
  }

  try {
    const results = await runSearch(query.trim());

    return NextResponse.json({
      success: true,
      data: {
        query: query.trim(),
        results,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Search failed";

    // Check for common issues
    if (errorMessage.includes("Not logged in")) {
      return NextResponse.json({
        success: false,
        error: "Not logged in to Shef. Run 'npm run shef:login' in your terminal first.",
      }, { status: 401 });
    }

    // Check for browser profile lock conflicts
    if (
      errorMessage.includes("SingletonLock") ||
      errorMessage.includes("ProcessSingleton") ||
      errorMessage.includes("Another browser is using")
    ) {
      return NextResponse.json({
        success: false,
        error: "Browser session conflict. Close any open Shef browser windows or run 'npm run shef:cleanup' in your terminal.",
      }, { status: 409 }); // 409 Conflict
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Run the search automation script and parse results
 */
async function runSearch(query: string): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), "automation", "lib", "search.ts");

    const child = spawn("npx", ["tsx", scriptPath, query], {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    // Set a timeout for the search (60 seconds)
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Search timed out after 60 seconds"));
    }, 60000);

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        // Check for specific errors
        if (stderr.includes("Not logged in") || stdout.includes("Not logged in")) {
          reject(new Error("Not logged in to Shef"));
          return;
        }
        reject(new Error(stderr || `Search process exited with code ${code}`));
        return;
      }

      // Parse the results from stdout
      try {
        const results = parseSearchOutput(stdout);
        resolve(results);
      } catch (parseError) {
        reject(new Error(`Failed to parse search results: ${parseError}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start search: ${err.message}`));
    });
  });
}

/**
 * Parse the CLI output from the search script
 *
 * Expected format:
 * Search Results:
 * ==================================================
 *
 * 1. Dish Name
 *    Price: $12.99
 *    URL: https://shef.com/...
 */
function parseSearchOutput(output: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Find the results section
  const resultsStart = output.indexOf("Search Results:");
  if (resultsStart === -1) {
    // No results section found, check for "No results found"
    if (output.includes("No results found")) {
      return [];
    }
    return [];
  }

  const resultsSection = output.slice(resultsStart);

  // Parse each numbered result
  // Match pattern: number. Name\n   Price: $X.XX\n   URL: https://...
  const resultPattern = /^\d+\.\s*(.+?)\n\s*Price:\s*(\$[\d.]+|N\/A)\n\s*URL:\s*(https?:\/\/[^\s\n]+)/gm;

  let match;
  while ((match = resultPattern.exec(resultsSection)) !== null) {
    const name = match[1].trim();
    const price = match[2] !== "N/A" ? match[2] : undefined;
    const url = match[3].trim();

    if (name && url) {
      results.push({ name, url, price });
    }
  }

  return results;
}
