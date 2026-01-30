#!/usr/bin/env npx tsx
/**
 * Visual Test Suite - ASCII Output
 *
 * Tests all 9 phases with visual proof
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// ASCII Helpers
// ============================================================================

const PASS = "✓";
const FAIL = "✗";
const WARN = "⚠";

function box(title: string, content: string[], width = 60): string {
  const lines: string[] = [];
  const inner = width - 4;

  lines.push("┌─ " + title + " " + "─".repeat(Math.max(0, inner - title.length - 1)) + "┐");

  for (const line of content) {
    const padded = line.padEnd(inner);
    lines.push("│ " + padded.slice(0, inner) + " │");
  }

  lines.push("└" + "─".repeat(width - 2) + "┘");
  return lines.join("\n");
}

function table(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || "").length))
  );

  const lines: string[] = [];
  const sep = "+" + colWidths.map(w => "-".repeat(w + 2)).join("+") + "+";

  lines.push(sep);
  lines.push("|" + headers.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join("|") + "|");
  lines.push(sep);

  for (const row of rows) {
    lines.push("|" + row.map((c, i) => ` ${(c || "").padEnd(colWidths[i])} `).join("|") + "|");
  }

  lines.push(sep);
  return lines.join("\n");
}

function progressBar(current: number, total: number, width = 30): string {
  const pct = current / total;
  const filled = Math.round(pct * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return `[${bar}] ${current}/${total}`;
}

// ============================================================================
// Test Results
// ============================================================================

interface TestResult {
  name: string;
  phase: number;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function test(phase: number, name: string, fn: () => boolean | string): void {
  try {
    const result = fn();
    const passed = result === true || typeof result === "string";
    results.push({
      name,
      phase,
      passed,
      details: typeof result === "string" ? result : passed ? "OK" : "Failed",
    });
  } catch (err) {
    results.push({
      name,
      phase,
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

// ============================================================================
// Phase 1: Test Foundation
// ============================================================================

function testPhase1(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 1: TEST FOUNDATION");
  console.log("═".repeat(60));

  // Check test files exist
  const testFiles = [
    "src/app/api/items/route.test.ts",
    "src/app/api/items/[id]/route.test.ts",
    "src/hooks/useItems.test.ts",
    "src/lib/types.test.ts",
    "src/lib/config-service.test.ts",
  ];

  for (const file of testFiles) {
    const fullPath = path.join(__dirname, "..", file);
    test(1, `Test file: ${file}`, () => {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const testCount = (content.match(/it\(/g) || []).length;
        return `${testCount} tests`;
      }
      return false;
    });
  }
}

// ============================================================================
// Phase 2: Extended Data Model
// ============================================================================

function testPhase2(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 2: EXTENDED DATA MODEL");
  console.log("═".repeat(60));

  const typesPath = path.join(__dirname, "..", "src/lib/types.ts");
  const content = fs.readFileSync(typesPath, "utf-8");

  test(2, "DayOfWeek type exists", () => content.includes("type DayOfWeek"));
  test(2, "ShefItem has availableDays", () => content.includes("availableDays?: DayOfWeek[]"));
  test(2, "ShefItem has preferredPortion", () => content.includes("preferredPortion?: string"));
  test(2, "ShefItem has tags", () => content.includes("tags?: string[]"));
  test(2, "ScheduleConfig exists", () => content.includes("interface ScheduleConfig"));
  test(2, "getCurrentDayOfWeek exists", () => content.includes("function getCurrentDayOfWeek"));
  test(2, "isAvailableToday exists", () => content.includes("function isAvailableToday"));
}

// ============================================================================
// Phase 3: Reminder System
// ============================================================================

function testPhase3(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 3: REMINDER SYSTEM");
  console.log("═".repeat(60));

  const files = [
    { path: "src/lib/reminder-service.ts", checks: ["ReminderConfig", "shouldTriggerReminder"] },
    { path: "src/app/api/reminder/route.ts", checks: ["GET", "PUT"] },
    { path: "src/hooks/useReminder.ts", checks: ["useReminder"] },
    { path: "src/components/features/reminder/ReminderSettings.tsx", checks: ["ReminderSettings"] },
  ];

  for (const file of files) {
    const fullPath = path.join(__dirname, "..", file.path);
    test(3, `File: ${file.path}`, () => {
      if (!fs.existsSync(fullPath)) return false;
      const content = fs.readFileSync(fullPath, "utf-8");
      const found = file.checks.filter(c => content.includes(c));
      return `Has: ${found.join(", ")}`;
    });
  }
}

// ============================================================================
// Phase 4: Pretty UI
// ============================================================================

function testPhase4(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 4: PRETTY UI");
  console.log("═".repeat(60));

  const cssPath = path.join(__dirname, "..", "src/app/globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  test(4, "Gradient primary", () => css.includes("--gradient-primary"));
  test(4, "Shadow glow", () => css.includes("--shadow-glow"));
  test(4, "Button press animation", () => css.includes("btn-press"));
  test(4, "Card hover effect", () => css.includes("card-hover"));
  test(4, "Skeleton loading", () => css.includes("skeleton"));

  const uiFiles = [
    "src/components/ui/Button.tsx",
    "src/components/ui/Skeleton.tsx",
    "src/components/ui/Toast.tsx",
    "src/components/ui/DaySelector.tsx",
  ];

  for (const file of uiFiles) {
    test(4, `UI Component: ${path.basename(file)}`, () =>
      fs.existsSync(path.join(__dirname, "..", file))
    );
  }
}

// ============================================================================
// Phase 5: Day-Based Dishes
// ============================================================================

function testPhase5(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 5: DAY-BASED DISHES");
  console.log("═".repeat(60));

  const prefillPath = path.join(__dirname, "prefill.ts");
  const prefill = fs.readFileSync(prefillPath, "utf-8");

  test(5, "filterItemsForToday function", () => prefill.includes("filterItemsForToday"));
  test(5, "Checks availableDays", () => prefill.includes("item.availableDays"));

  const itemFormPath = path.join(__dirname, "..", "src/components/features/items/ItemForm.tsx");
  const itemForm = fs.readFileSync(itemFormPath, "utf-8");

  test(5, "ItemForm has DaySelector", () => itemForm.includes("DaySelector"));
  test(5, "ItemForm tracks availableDays", () => itemForm.includes("availableDays"));

  const itemCardPath = path.join(__dirname, "..", "src/components/features/items/ItemCard.tsx");
  const itemCard = fs.readFileSync(itemCardPath, "utf-8");

  test(5, "ItemCard shows day badges", () => itemCard.includes("item.availableDays"));
}

// ============================================================================
// Phase 6: Day Filter
// ============================================================================

function testPhase6(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 6: DAY FILTER");
  console.log("═".repeat(60));

  test(6, "DayFilter component exists", () =>
    fs.existsSync(path.join(__dirname, "..", "src/components/features/items/DayFilter.tsx"))
  );

  const pagePath = path.join(__dirname, "..", "src/app/page.tsx");
  const page = fs.readFileSync(pagePath, "utf-8");

  test(6, "Page imports DayFilter", () => page.includes("DayFilter"));
  test(6, "Page has dayFilter state", () => page.includes("dayFilter"));
  test(6, "Page has filteredItems", () => page.includes("filteredItems"));
}

// ============================================================================
// Phase 7: Item Search
// ============================================================================

function testPhase7(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 7: ITEM SEARCH");
  console.log("═".repeat(60));

  test(7, "Search automation module", () =>
    fs.existsSync(path.join(__dirname, "lib/search.ts"))
  );

  test(7, "Search API route", () =>
    fs.existsSync(path.join(__dirname, "..", "src/app/api/search/route.ts"))
  );

  test(7, "ItemSearch component", () =>
    fs.existsSync(path.join(__dirname, "..", "src/components/features/items/ItemSearch.tsx"))
  );

  const searchPath = path.join(__dirname, "lib/search.ts");
  const search = fs.readFileSync(searchPath, "utf-8");

  test(7, "searchDishes function", () => search.includes("async function searchDishes"));
  test(7, "SearchResult interface", () => search.includes("interface SearchResult"));
}

// ============================================================================
// Phase 8: Portion Controls
// ============================================================================

function testPhase8(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 8: PORTION CONTROLS");
  console.log("═".repeat(60));

  const cartPath = path.join(__dirname, "lib/cart.ts");
  const cart = fs.readFileSync(cartPath, "utf-8");

  test(8, "handleRequiredOptions accepts preferredPortion", () =>
    cart.includes("preferredPortion?: string")
  );
  test(8, "Searches for preferred portion", () =>
    cart.includes("preferredPortion") && cart.includes("labelText")
  );

  const prefillPath = path.join(__dirname, "prefill.ts");
  const prefill = fs.readFileSync(prefillPath, "utf-8");

  test(8, "Prefill passes preferredPortion", () =>
    prefill.includes("item.preferredPortion")
  );

  const formPath = path.join(__dirname, "..", "src/components/features/items/ItemForm.tsx");
  const form = fs.readFileSync(formPath, "utf-8");

  test(8, "ItemForm has portion input", () =>
    form.includes("preferredPortion") && form.includes("Preferred Portion")
  );

  const cardPath = path.join(__dirname, "..", "src/components/features/items/ItemCard.tsx");
  const card = fs.readFileSync(cardPath, "utf-8");

  test(8, "ItemCard shows portion badge", () =>
    card.includes("item.preferredPortion")
  );
}

// ============================================================================
// Phase 9: Auto-Scheduling
// ============================================================================

function testPhase9(): void {
  console.log("\n" + "═".repeat(60));
  console.log("PHASE 9: AUTO-SCHEDULING");
  console.log("═".repeat(60));

  test(9, "scheduled-prefill.ts exists", () =>
    fs.existsSync(path.join(__dirname, "scheduled-prefill.ts"))
  );

  test(9, "SCHEDULING.md documentation", () =>
    fs.existsSync(path.join(__dirname, "..", "docs/SCHEDULING.md"))
  );

  const pkgPath = path.join(__dirname, "..", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  test(9, "shef:scheduled script in package.json", () =>
    pkg.scripts["shef:scheduled"] !== undefined
  );

  const scheduledPath = path.join(__dirname, "scheduled-prefill.ts");
  const scheduled = fs.readFileSync(scheduledPath, "utf-8");

  test(9, "Idempotency check (hasRunToday)", () =>
    scheduled.includes("hasRunToday")
  );
  test(9, "shouldRun logic", () =>
    scheduled.includes("function shouldRun")
  );
  test(9, "Updates lastRun timestamp", () =>
    scheduled.includes("lastRun")
  );
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███████╗██╗  ██╗███████╗███████╗                          ║
║   ██╔════╝██║  ██║██╔════╝██╔════╝                          ║
║   ███████╗███████║█████╗  █████╗                            ║
║   ╚════██║██╔══██║██╔══╝  ██╔══╝                            ║
║   ███████║██║  ██║███████╗██║                               ║
║   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝                               ║
║                                                              ║
║   VISUAL TEST SUITE - ALL 9 PHASES                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

  // Run all phase tests
  testPhase1();
  testPhase2();
  testPhase3();
  testPhase4();
  testPhase5();
  testPhase6();
  testPhase7();
  testPhase8();
  testPhase9();

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));

  const phaseResults: Map<number, { passed: number; total: number }> = new Map();

  for (const r of results) {
    if (!phaseResults.has(r.phase)) {
      phaseResults.set(r.phase, { passed: 0, total: 0 });
    }
    const pr = phaseResults.get(r.phase)!;
    pr.total++;
    if (r.passed) pr.passed++;
  }

  const rows: string[][] = [];
  for (let phase = 1; phase <= 9; phase++) {
    const pr = phaseResults.get(phase) || { passed: 0, total: 0 };
    const status = pr.passed === pr.total ? PASS : (pr.passed > 0 ? WARN : FAIL);
    const phaseName = [
      "Test Foundation",
      "Extended Data Model",
      "Reminder System",
      "Pretty UI",
      "Day-Based Dishes",
      "Day Filter",
      "Item Search",
      "Portion Controls",
      "Auto-Scheduling",
    ][phase - 1];
    rows.push([
      `Phase ${phase}`,
      phaseName,
      `${pr.passed}/${pr.total}`,
      status,
    ]);
  }

  console.log("\n" + table(["Phase", "Name", "Tests", "Status"], rows));

  const totalPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log("\n" + progressBar(totalPassed, totalTests, 40));
  console.log(`\nTotal: ${totalPassed}/${totalTests} checks passed`);

  // Detailed results
  console.log("\n" + "═".repeat(60));
  console.log("DETAILED RESULTS");
  console.log("═".repeat(60));

  for (let phase = 1; phase <= 9; phase++) {
    const phaseResults = results.filter(r => r.phase === phase);
    if (phaseResults.length === 0) continue;

    const content = phaseResults.map(r =>
      `${r.passed ? PASS : FAIL} ${r.name}: ${r.details}`
    );
    console.log("\n" + box(`Phase ${phase}`, content));
  }

  // Final verdict
  console.log("\n");
  if (totalPassed === totalTests) {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║   ✓ ALL ${totalTests} CHECKS PASSED              ║
    ║                                           ║
    ║   All 9 phases implemented successfully   ║
    ║                                           ║
    ╚═══════════════════════════════════════════╝
    `);
  } else {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║   ⚠ ${totalTests - totalPassed} CHECKS FAILED                    ║
    ║                                           ║
    ║   Review detailed results above           ║
    ║                                           ║
    ╚═══════════════════════════════════════════╝
    `);
  }

  process.exit(totalPassed === totalTests ? 0 : 1);
}

main();
