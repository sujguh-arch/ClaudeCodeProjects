/**
 * Comprehensive app audit — captures every error, warning, broken image,
 * layout issue, network failure, and accessibility problem.
 */
import { test, type Page, type ConsoleMessage } from "@playwright/test";

const BASE = "http://localhost:3000";

interface AuditEntry {
  id: number;
  page: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  detail?: string;
}

const errors: AuditEntry[] = [];
let nextId = 1;

function log(page: string, type: string, severity: AuditEntry["severity"], message: string, detail?: string) {
  errors.push({ id: nextId++, page, type, severity, message, detail });
}

async function authenticateAndGo(page: Page, url: string) {
  const consoleErrors: string[] = [];
  const networkFails: string[] = [];
  const jsExceptions: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon") && !text.includes("Download the React DevTools")) {
        consoleErrors.push(text);
      }
    }
  });
  page.on("pageerror", (err) => jsExceptions.push(err.message));
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (!u.includes("favicon")) networkFails.push(`${req.failure()?.errorText}: ${u}`);
  });

  // First visit to set localStorage before auth check
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem("mirror_pin", "1234");
    sessionStorage.setItem("mirror_session", "active");
  });
  // Reload so AuthGate reads the new values
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  return { consoleErrors, networkFails, jsExceptions };
}

test("FULL APP AUDIT", async ({ page }) => {
  test.setTimeout(180000);

  // ═══════════════════════════════════════════════
  // 1. HOME PAGE — DESKTOP
  // ═══════════════════════════════════════════════
  const home = await authenticateAndGo(page, BASE);
  for (const e of home.consoleErrors) log("/", "console-error", "high", "Console error on home", e);
  for (const e of home.networkFails) log("/", "network-fail", "high", "Network failure on home", e);
  for (const e of home.jsExceptions) log("/", "js-exception", "critical", "JS exception on home", e);

  await page.screenshot({ path: "audit-home-desktop.png", fullPage: true });

  const bodyText = await page.textContent("body");
  if (!bodyText || bodyText.trim().length < 10) log("/", "rendering", "critical", "Home page body is empty");

  const hasMirror = await page.getByText(/mirror/i).first().isVisible().catch(() => false);
  if (!hasMirror) log("/", "rendering", "high", "Missing 'mirror' branding in nav");

  for (const tab of ["outfits", "closet"]) {
    const vis = await page.getByText(new RegExp(tab, "i")).first().isVisible().catch(() => false);
    if (!vis) log("/", "rendering", "critical", `'${tab}' tab not visible`);
  }

  const hasInput = await page.locator("input").first().isVisible().catch(() => false);
  if (!hasInput) log("/", "ux", "medium", "No product URL input visible");

  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const vw = page.viewportSize()?.width || 1280;
  if (bodyWidth > vw + 10) log("/", "layout", "high", `Horizontal overflow: ${bodyWidth}px > ${vw}px`);

  const homeImgs = await page.locator("img").all();
  for (const img of homeImgs) {
    const src = await img.getAttribute("src");
    const nw = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    if (nw === 0 && src) log("/", "broken-image", "high", `Broken image: ${src.substring(0, 100)}`);
  }
  if (homeImgs.length === 0) log("/", "rendering", "medium", "No images on home page");

  const settingsLinks = await page.locator("a[href='/settings'], a[href*='settings']").count();
  if (settingsLinks === 0) log("/", "ux", "medium", "No settings link on home page");

  const hasBg = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)";
  });
  if (!hasBg) log("/", "rendering", "high", "Body has no background-color");

  // ═══════════════════════════════════════════════
  // 2. CLOSET TAB
  // ═══════════════════════════════════════════════
  const closetTab = page.getByText(/closet/i).first();
  if (await closetTab.isVisible().catch(() => false)) {
    await closetTab.click();
    await page.waitForTimeout(1000);

    for (const cat of ["all", "dress", "shoes", "tights", "bag", "accessories"]) {
      const pill = await page.getByText(new RegExp(`^${cat}$`, "i")).first().isVisible().catch(() => false);
      if (!pill) log("/closet", "rendering", "medium", `Category pill '${cat}' not visible`);
    }

    const closetImgs = await page.locator("img").all();
    for (const img of closetImgs) {
      const src = await img.getAttribute("src");
      const nw = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      if (nw === 0 && src) log("/closet", "broken-image", "high", `Broken closet image: ${src.substring(0, 100)}`);
    }

    await page.screenshot({ path: "audit-closet-desktop.png", fullPage: true });
  }

  // ═══════════════════════════════════════════════
  // 3. API ENDPOINTS
  // ═══════════════════════════════════════════════
  let products: any[] = [];
  try {
    const r = await page.request.get(`${BASE}/api/products`);
    if (!r.ok()) log("/api/products", "api-error", "critical", `GET /api/products -> ${r.status()}`);
    else {
      products = await r.json();
      if (!Array.isArray(products)) log("/api/products", "api-error", "critical", "Not an array");
      for (const p of products) {
        if (!p.id) log("/api/products", "api-error", "high", `Missing id: ${p.title}`);
        if (!p.title) log("/api/products", "api-error", "high", `Missing title: ${p.id}`);
        if (!p.images?.length) log("/api/products", "api-error", "high", `No images: ${p.title}`);
        if (!p.category) log("/api/products", "api-error", "medium", `Missing category: ${p.title}`);
        if (p.images?.[0]) {
          try {
            const ir = await page.request.head(p.images[0], { timeout: 8000 });
            if (!ir.ok()) log("/api/products", "broken-image", "high", `Image 404: ${p.title} -- ${p.images[0].substring(0, 80)}`);
          } catch {
            log("/api/products", "broken-image", "medium", `Image unreachable: ${p.title} -- ${p.images[0].substring(0, 80)}`);
          }
        }
      }
    }
  } catch (e: any) { log("/api/products", "api-error", "critical", `GET failed: ${e.message}`); }

  let outfits: any[] = [];
  try {
    const r = await page.request.get(`${BASE}/api/outfits`);
    if (!r.ok()) log("/api/outfits", "api-error", "critical", `GET /api/outfits -> ${r.status()}`);
    else {
      outfits = await r.json();
      if (!Array.isArray(outfits)) log("/api/outfits", "api-error", "critical", "Not an array");
      for (const o of outfits) {
        if (!o.id) log("/api/outfits", "api-error", "high", `Missing id: ${o.name}`);
        if (!o.name) log("/api/outfits", "api-error", "medium", `Missing name: ${o.id}`);
        for (const [slot, val] of Object.entries(o.items || {})) {
          if (!val) continue;
          const ids = Array.isArray(val) ? val : [val];
          for (const pid of ids) {
            if (!products.find((p: any) => p.id === pid))
              log("/api/outfits", "api-error", "high", `Dangling ref: outfit '${o.name}' slot '${slot}' -> product ${pid} missing`);
          }
        }
      }
    }
  } catch (e: any) { log("/api/outfits", "api-error", "critical", `GET failed: ${e.message}`); }

  try {
    const r = await page.request.get(`${BASE}/api/settings`);
    if (!r.ok()) log("/api/settings", "api-error", "critical", `GET -> ${r.status()}`);
    else {
      const s = await r.json();
      if (!s.replicateToken) log("/api/settings", "api-error", "high", "Replicate token not configured");
      if (!s.referencePhoto) log("/api/settings", "api-error", "high", "No reference photo set");
      if (!s.model) log("/api/settings", "api-error", "medium", "No model set");
    }
  } catch (e: any) { log("/api/settings", "api-error", "critical", `GET failed: ${e.message}`); }

  try {
    const r = await page.request.get(`${BASE}/api/generate`);
    if (!r.ok()) log("/api/generate", "api-error", "critical", `GET -> ${r.status()}`);
    else {
      const renderings = await r.json();
      if (Array.isArray(renderings)) {
        const errored = renderings.filter((r: any) => r.status === "error");
        for (const rr of errored) log("/api/generate", "api-error", "high", `Failed rendering: product ${rr.productId}`, rr.error);
        const done = renderings.filter((r: any) => r.status === "done");
        for (const rr of done) {
          if (rr.generatedImage) {
            try {
              const ir = await page.request.head(`${BASE}${rr.generatedImage}`, { timeout: 5000 });
              if (!ir.ok()) log("/api/generate", "broken-image", "high", `Generated 404: ${rr.generatedImage}`);
            } catch {
              log("/api/generate", "broken-image", "high", `Generated unreachable: ${rr.generatedImage}`);
            }
          }
        }
      }
    }
  } catch (e: any) { log("/api/generate", "api-error", "critical", `GET failed: ${e.message}`); }

  // ═══════════════════════════════════════════════
  // 4. OUTFIT BUILDER PAGE
  // ═══════════════════════════════════════════════
  let outfitId: string | null = outfits[0]?.id || null;
  if (!outfitId) {
    try {
      const r = await page.request.post(`${BASE}/api/outfits`, { data: { name: "Audit Outfit" } });
      if (r.ok()) outfitId = (await r.json()).id;
      else log("/api/outfits", "api-error", "critical", `POST create failed: ${r.status()}`);
    } catch (e: any) { log("/api/outfits", "api-error", "critical", `POST failed: ${e.message}`); }
  }

  if (outfitId) {
    const oe = await authenticateAndGo(page, `${BASE}/outfit/${outfitId}`);
    for (const e of oe.consoleErrors) log("/outfit", "console-error", "high", "Console error", e);
    for (const e of oe.networkFails) log("/outfit", "network-fail", "high", "Network failure", e);
    for (const e of oe.jsExceptions) log("/outfit", "js-exception", "critical", "JS exception", e);

    await page.screenshot({ path: "audit-outfit-desktop.png", fullPage: true });

    const nameEl = await page.locator("h2, h1").first().textContent().catch(() => "");
    if (!nameEl?.trim()) log("/outfit", "rendering", "high", "Outfit name not rendered");

    for (const label of ["Dress", "Shoes", "Tights", "Bag", "Accessories"]) {
      const vis = await page.getByText(new RegExp(label, "i")).first().isVisible().catch(() => false);
      if (!vis) log("/outfit", "rendering", "medium", `Slot '${label}' not visible`);
    }

    const back = await page.locator("a[href='/'], nav a").first().isVisible().catch(() => false);
    if (!back) log("/outfit", "ux", "medium", "No back button");

    const ow = await page.evaluate(() => document.body.scrollWidth);
    if (ow > vw + 10) log("/outfit", "layout", "high", `Outfit horizontal overflow: ${ow}px`);

    const oimgs = await page.locator("img").all();
    for (const img of oimgs) {
      const src = await img.getAttribute("src");
      const nw = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      if (nw === 0 && src) log("/outfit", "broken-image", "high", `Broken: ${src.substring(0, 100)}`);
    }
  }

  // ═══════════════════════════════════════════════
  // 5. SETTINGS PAGE
  // ═══════════════════════════════════════════════
  const se = await authenticateAndGo(page, `${BASE}/settings`);
  for (const e of se.consoleErrors) log("/settings", "console-error", "high", "Console error", e);
  for (const e of se.networkFails) log("/settings", "network-fail", "high", "Network failure", e);
  for (const e of se.jsExceptions) log("/settings", "js-exception", "critical", "JS exception", e);

  const settingsBody = await page.textContent("body");
  if (!settingsBody || settingsBody.length < 10) log("/settings", "rendering", "critical", "Settings page empty");

  await page.screenshot({ path: "audit-settings-desktop.png", fullPage: true });

  // ═══════════════════════════════════════════════
  // 6. MOBILE (iPhone 14 Pro: 393x852)
  // ═══════════════════════════════════════════════
  await page.setViewportSize({ width: 393, height: 852 });

  const mh = await authenticateAndGo(page, BASE);
  for (const e of mh.consoleErrors) log("/mobile", "console-error", "high", "Mobile console error", e);
  for (const e of mh.jsExceptions) log("/mobile", "js-exception", "critical", "Mobile JS exception", e);

  await page.screenshot({ path: "audit-home-mobile.png", fullPage: true });

  const mbw = await page.evaluate(() => document.body.scrollWidth);
  if (mbw > 398) log("/mobile", "layout", "critical", `Mobile overflow: ${mbw}px > 393px`);

  const allBtns = await page.locator("button, a").all();
  let tinyTargets = 0;
  for (const btn of allBtns) {
    const box = await btn.boundingBox();
    if (box && box.width > 0 && (box.width < 30 || box.height < 30)) tinyTargets++;
  }
  if (tinyTargets > 3) log("/mobile", "a11y", "medium", `${tinyTargets} touch targets under 30px`);

  const smallText = await page.evaluate(() => {
    let count = 0;
    document.querySelectorAll("*").forEach(el => {
      const s = parseFloat(getComputedStyle(el).fontSize);
      if (s < 10 && el.textContent?.trim() && el.children.length === 0) count++;
    });
    return count;
  });
  if (smallText > 5) log("/mobile", "a11y", "medium", `${smallText} text elements < 10px on mobile`);

  const mCloset = page.getByText(/closet/i).first();
  if (await mCloset.isVisible().catch(() => false)) {
    await mCloset.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "audit-closet-mobile.png", fullPage: true });
  }

  if (outfitId) {
    await authenticateAndGo(page, `${BASE}/outfit/${outfitId}`);
    await page.screenshot({ path: "audit-outfit-mobile.png", fullPage: true });
    const mow = await page.evaluate(() => document.body.scrollWidth);
    if (mow > 398) log("/mobile/outfit", "layout", "critical", `Mobile outfit overflow: ${mow}px`);
  }

  // ═══════════════════════════════════════════════
  // 7. PROD URL
  // ═══════════════════════════════════════════════
  try {
    const pr = await page.request.get("https://virtual-fitting-room-five.vercel.app/");
    if (!pr.ok()) log("/prod", "api-error", "critical", `Prod returned ${pr.status()}`);
  } catch (e: any) { log("/prod", "network-fail", "high", `Prod unreachable: ${e.message}`); }

  try {
    const pr = await page.request.get("https://virtual-fitting-room-five.vercel.app/api/products");
    if (!pr.ok()) log("/prod/api", "api-error", "critical", `Prod API returned ${pr.status()}`);
    else {
      const pp = await pr.json();
      if (!Array.isArray(pp)) log("/prod/api", "api-error", "critical", "Prod API not array");
      else if (pp.length === 0) log("/prod/api", "api-error", "medium", "Prod has 0 products");
    }
  } catch (e: any) { log("/prod/api", "network-fail", "high", `Prod API error: ${e.message}`); }

  // ═══════════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════════
  console.log("\n" + "=".repeat(70));
  console.log("  VIRTUAL FITTING ROOM - FULL AUDIT REPORT");
  console.log("=".repeat(70));
  console.log(`  Total: ${errors.length}  |  Critical: ${errors.filter(e => e.severity === "critical").length}  |  High: ${errors.filter(e => e.severity === "high").length}  |  Medium: ${errors.filter(e => e.severity === "medium").length}  |  Low: ${errors.filter(e => e.severity === "low").length}`);
  console.log("=".repeat(70));

  for (const e of errors) {
    const sev = { critical: "CRIT", high: "HIGH", medium: "MED ", low: "LOW " }[e.severity];
    console.log(`  [${sev}] #${String(e.id).padStart(2, "0")} [${e.type}] ${e.page}`);
    console.log(`         ${e.message}`);
    if (e.detail) console.log(`         > ${e.detail.substring(0, 150)}`);
  }

  console.log("=".repeat(70));

  const fs = await import("fs");
  fs.writeFileSync("audit-report.json", JSON.stringify(errors, null, 2));
});
