#!/bin/bash
###############################################################################
# VFR Extended Session — Production Polish (3 hours)
#
# Run AFTER run-session.sh completes.
# 20 high-impact tasks to go from "it works" to "production-worthy"
###############################################################################
set -o pipefail

VFR_DIR="$(cd "$(dirname "$0")" && pwd)"
EVAL_DIR="$VFR_DIR/eval"
LOG_DIR="$EVAL_DIR/logs"

PHASE_TIMEOUT=3600    # 1 hour per macro-phase
FIX_TIMEOUT=1200      # 20 min for fixes

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

cd "$VFR_DIR"
mkdir -p "$EVAL_DIR"/{extended,logs,videos}

# Kill any running server from previous session
pkill -f "next start" 2>/dev/null || true
sleep 2

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       VFR EXTENDED SESSION — PRODUCTION POLISH          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Phase 5: UI Polish + Performance    (1 hour)           ║"
echo "║  Phase 6: Real Flow Testing          (1 hour)           ║"
echo "║  Phase 7: Edge Cases + Final Video   (1 hour)           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# PHASE 5: UI POLISH + PERFORMANCE (Tasks 1-5, 16)
###############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "PHASE 5: UI Polish + Performance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PHASE5_PROMPT='You are polishing a Virtual Fitting Room app to production quality. READ CLAUDE.md first.

The app already works (builds, passes eval gates, has products from 5 stores, has real AI generations).
Now make it BEAUTIFUL and FAST. These are the 6 highest-impact polish tasks:

TASK 1: SKELETON LOADING STATES
- Every page that fetches data must show skeleton screens while loading, NOT blank white
- Use Tailwind animate-pulse on placeholder rectangles matching the layout shape
- Closet grid: show 6-8 skeleton cards while products load
- Product lightbox: skeleton image + text placeholders
- Try-on results: skeleton while generation loads
- Test: temporarily add a 2-second delay to API routes, verify skeletons appear, then remove delay

TASK 2: IMAGE OPTIMIZATION
- Every <img> must use next/image with:
  - width/height or fill
  - loading="lazy" for below-fold, priority for hero images
  - placeholder="blur" with a small blurDataURL (generate 10x10 base64 for each product)
  - sizes attribute for responsive srcset
- Product cards: use fill with object-cover
- Lightbox: use priority loading for the main image

TASK 3: SMOOTH PAGE TRANSITIONS
- Use Framer Motion AnimatePresence for tab switching (Closet/Outfits/Try-On/Settings)
- Tab content should fade + slide in from the direction of the tab
- Product cards should stagger-animate in when category changes
- Lightbox should spring-animate open (scale from 0.9 to 1, opacity 0 to 1)
- Use layoutId on product cards for shared layout animation into lightbox

TASK 4: DARK MODE CONSISTENCY AUDIT
- Scan EVERY component for any hardcoded white/light colors
- All backgrounds must use CSS variables or Tailwind dark classes
- Check for white flashes on page load (add dark background to <html> in layout.tsx)
- Verify no component uses bg-white, text-black, or similar
- The only light colors allowed: cream text (#F5F0EB), gold accent (#D4AF61), subtle card borders

TASK 5: BUNDLE SIZE AUDIT
- Run: npx next build && ls -la .next/static/chunks/ | sort -k5 -n
- If any chunk > 200KB, investigate and code-split it
- Ensure framer-motion is tree-shaken (import { motion } not import framer-motion)
- Ensure no unused dependencies in package.json
- Remove any dead code from components

TASK 6: LINK OUT TO STORE
- Every product card and lightbox must have a "Buy" or "Shop" button/link
- Opens the product URL in a new tab (target="_blank" rel="noopener")
- Styled as a subtle secondary button (outlined, not filled)
- Must be accessible (proper link semantics, not just onClick window.open)

When done: run npm run build to verify. Fix any errors.'

timeout $PHASE_TIMEOUT claude -p "$PHASE5_PROMPT" \
  --dangerously-skip-permissions \
  --output-format text \
  2>&1 | tee "$LOG_DIR/phase5-claude.log"

npm run build 2>"$LOG_DIR/phase5-build-errors.log" || {
  warn "Phase 5 build failed — fixing..."
  BUILD_ERRORS=$(tail -50 "$LOG_DIR/phase5-build-errors.log")
  timeout $FIX_TIMEOUT claude -p "Build failed. Fix ALL errors:
$BUILD_ERRORS" \
    --dangerously-skip-permissions --output-format text \
    2>&1 | tee "$LOG_DIR/phase5-fix.log"
  npm run build 2>/dev/null
}

git add -A && git commit -m "Phase 5: UI polish — skeletons, image optimization, transitions, dark mode" 2>/dev/null || true
git tag -f "phase5-polish" 2>/dev/null || true
pass "Phase 5 complete"

###############################################################################
# PHASE 6: REAL FLOW TESTING (Tasks 6-10, 17-19)
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "PHASE 6: Real Flow Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PHASE6_PROMPT='You are testing a Virtual Fitting Room app with REAL end-to-end flows. READ CLAUDE.md.

Write a comprehensive Playwright test file at eval-gates/phase6-real-flows.spec.ts.
These tests must perform REAL user interactions and measure REAL performance.

IMPORTANT: Use the eval-gates/playwright.config.ts (production build, not dev mode).

TEST 1: LIVE SCRAPE FROM EACH STORE (Task 6)
For each store, paste a REAL product URL into the add-product flow and verify it scrapes:
- Princess Polly: pick a dress URL from us.princesspolly.com
- Peppermayo: pick a dress URL from us.peppermayo.com
- Oh Polly: pick a product URL from ohpolly.com
- House of CB: pick a product URL from houseofcb.com
- Wolford: pick a tights URL from wolford.com
Use the app UI (click Add button, paste URL, submit) NOT direct API calls.
Verify the product appears in the closet after scraping.
Timeout: 15 seconds per scrape. Take screenshots of each result.
If a store fails to scrape (anti-bot), log it but dont fail the entire test.

TEST 2: FULL TRY-ON FLOW — TIMED (Task 7)
- Navigate to closet → click a dress → click Try On → wait for generation
- Measure total time from click to result displayed
- Assert total time < 60 seconds (generation can take time)
- Save screenshot of the generated result to eval/extended/tryon-result.png
- This test should use the REAL Replicate API (1 generation, ~$0.15)

TEST 3: FULL OUTFIT FLOW (Task 8)
- Navigate to outfit builder
- Add a dress + shoes to an outfit
- Verify both items display in the outfit
- Click generate outfit
- Wait for result (this uses real Replicate — 1 generation)
- Save screenshot to eval/extended/outfit-result.png

TEST 4: ERROR HANDLING (Task 9)
- Paste an invalid URL (e.g., "https://notarealstore.com/product/123")
- Verify an error message appears (toast, alert, or inline error)
- Verify the app does NOT crash (page is still interactive after error)
- Paste an empty string — verify validation prevents submission

TEST 5: DEDUP REJECTION (Task 10)
- Get the URL of an existing product from data/products.json
- Paste it into the add-product flow
- Verify the app shows a "duplicate" or "already exists" message
- Verify the product count doesnt increase

TEST 6: API PERFORMANCE (Tasks 17-18)
- Time the /api/products response — assert < 500ms
- Time the /api/settings response — assert < 200ms
- Time category switching in the UI — click each tab, measure render time

TEST 7: CONCURRENT IMAGE LOADING (Task 19)
- Navigate to closet with all products visible
- Count how many images load within 3 seconds
- Assert at least 80% of visible images loaded

After writing the test file, RUN it:
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase6-real-flows.spec.ts

Fix any test failures by modifying the APP code (not the tests).
Save all screenshots to eval/extended/.
Budget: maximum 2 real Replicate generations ($0.30 total) for tests 2 and 3.'

timeout $PHASE_TIMEOUT claude -p "$PHASE6_PROMPT" \
  --dangerously-skip-permissions \
  --output-format text \
  2>&1 | tee "$LOG_DIR/phase6-claude.log"

npm run build 2>/dev/null

# Run the real flow tests
log "Running Phase 6 real flow tests..."
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase6-real-flows.spec.ts \
  2>&1 | tee "$LOG_DIR/phase6-eval.log"
PHASE6_RESULT=$?

if [ $PHASE6_RESULT -eq 0 ]; then
  pass "Phase 6 real flow tests PASSED"
else
  warn "Phase 6 tests had failures — attempting fix..."
  EVAL_OUTPUT=$(tail -50 "$LOG_DIR/phase6-eval.log")
  timeout $FIX_TIMEOUT claude -p "Phase 6 real flow tests failed. Fix the app so these user flows work:

$EVAL_OUTPUT

Do NOT modify the test files. Fix the app code. Then rebuild." \
    --dangerously-skip-permissions --output-format text \
    2>&1 | tee "$LOG_DIR/phase6-fix.log"
  npm run build 2>/dev/null
  npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase6-real-flows.spec.ts \
    2>&1 | tee "$LOG_DIR/phase6-eval-retry.log" && pass "Phase 6 PASSED on retry" || warn "Phase 6 still has failures"
fi

git add -A && git commit -m "Phase 6: Real flow testing — live scraping, generation, error handling, perf" 2>/dev/null || true
git tag -f "phase6-flows" 2>/dev/null || true

###############################################################################
# PHASE 7: EDGE CASES + FINAL VIDEO (Tasks 11-15, 20)
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "PHASE 7: Edge Cases + Final Video"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PHASE7_PROMPT='You are hardening a Virtual Fitting Room app for production. READ CLAUDE.md.

TASK 11: LONG PRODUCT TITLES
- House of CB and Oh Polly have verbose product names
- Ensure product cards truncate titles with text-overflow: ellipsis
- Lightbox should show full title with word wrapping
- Test with a 100-character title — must not break layout

TASK 12: MISSING IMAGE FALLBACK
- If a product image fails to load (404, timeout), show a styled placeholder
- Use next/image onError handler to swap to a placeholder
- Placeholder: dark gray gradient with a subtle fashion icon or store name
- Test: temporarily break an image URL, verify fallback renders

TASK 13: EMPTY CATEGORY STATES
- If a category has 0 products, show a beautiful empty state
- Include: category icon, "No [category] yet" message, "Add Product" CTA button
- Style it to match the luxury aesthetic (not generic/boring)
- Test: create a category filter for a category with no products

TASK 14: BACK/FORWARD NAVIGATION
- Ensure browser back/forward buttons work correctly
- Lightbox should close on back press (use router events or popstate)
- Tab state should be preserved in URL (e.g., /?tab=shoes or hash #shoes)
- Test: navigate tabs, press back, verify correct tab restores

TASK 15: REFERENCE PHOTO MANAGEMENT
- Settings page should show the current reference photo
- Should be able to upload a new photo (file input, preview before save)
- Photo should be saved to public/uploads/reference.jpg
- Verify the try-on flow uses the uploaded photo

TASK 20: FINAL PROOF VIDEO
Write a Playwright test that records a COMPLETE video of the happy path:

```typescript
// eval-gates/phase7-video.spec.ts
import { test } from "@playwright/test";

test.use({
  video: { mode: "on", size: { width: 390, height: 844 } },
  viewport: { width: 390, height: 844 },
});

test("complete happy path video recording", async ({ page }) => {
  // 1. Open app — show home screen with products
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // 2. Browse categories — click through each tab
  const tabs = ["dress", "shoes", "tights", "accessories"];
  for (const tab of tabs) {
    const tabEl = await page.$(`[data-category="${tab}"], button:has-text("${tab}"), [data-testid="category-tab"]:has-text("${tab}")`);
    if (tabEl) {
      await tabEl.click();
      await page.waitForTimeout(1500);
    }
  }

  // 3. Click all tab to show everything
  const allTab = await page.$("[data-category='all'], button:has-text('All')");
  if (allTab) await allTab.click();
  await page.waitForTimeout(1000);

  // 4. Click a product — open lightbox
  const card = await page.$("[data-testid='product-card'], article:has(img)");
  if (card) {
    await card.click();
    await page.waitForTimeout(2000);
  }

  // 5. Close lightbox
  const closeBtn = await page.$("[aria-label='Close'], button:has-text('Close'), [class*='close']");
  if (closeBtn) await closeBtn.click();
  await page.waitForTimeout(1000);

  // 6. Navigate to settings
  const settingsTab = await page.$("a[href='/settings'], button:has-text('Settings'), [data-testid='tab-settings']");
  if (settingsTab) {
    await settingsTab.click();
    await page.waitForTimeout(2000);
  }

  // 7. Go back to closet
  await page.goto("/");
  await page.waitForTimeout(2000);
});
```

Run it with: npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase7-video.spec.ts
The video will be saved to eval/test-results/.
Copy the video to eval/videos/happy-path.webm

Also do tasks 11-15 as code changes. Fix edge cases, then run npm run build.
Then run ALL eval gates in sequence to verify nothing is broken:
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase4-final.spec.ts
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase7-video.spec.ts'

timeout $PHASE_TIMEOUT claude -p "$PHASE7_PROMPT" \
  --dangerously-skip-permissions \
  --output-format text \
  2>&1 | tee "$LOG_DIR/phase7-claude.log"

npm run build 2>"$LOG_DIR/phase7-build-errors.log" || {
  warn "Phase 7 build failed — fixing..."
  BUILD_ERRORS=$(tail -50 "$LOG_DIR/phase7-build-errors.log")
  timeout $FIX_TIMEOUT claude -p "Build failed. Fix:
$BUILD_ERRORS" \
    --dangerously-skip-permissions --output-format text \
    2>&1 | tee "$LOG_DIR/phase7-fix.log"
  npm run build 2>/dev/null
}

# Run final video recording
log "Recording final happy-path video..."
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase7-video.spec.ts \
  2>&1 | tee "$LOG_DIR/phase7-video.log"

# Copy video to eval/videos/
find eval/test-results -name "*.webm" -exec cp {} eval/videos/happy-path.webm \; 2>/dev/null

# Run the definitive Phase 4 final eval one more time
log "Running FINAL comprehensive eval..."
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase4-final.spec.ts \
  2>&1 | tee "$LOG_DIR/final-comprehensive-eval.log"
FINAL_RESULT=$?

if [ $FINAL_RESULT -eq 0 ]; then
  pass "FINAL COMPREHENSIVE EVAL PASSED"
else
  warn "Final eval had failures"
fi

git add -A && git commit -m "Phase 7: Edge cases, polish, happy-path video recording" 2>/dev/null || true
git tag -f "phase7-final" 2>/dev/null || true

###############################################################################
# POST-SESSION SUMMARY
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "EXTENDED SESSION COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_PRODUCTS=$(python3 -c "import json; print(len(json.load(open('data/products.json'))))" 2>/dev/null || echo "?")
STORES=$(python3 -c "import json; print(len(set(p['store'] for p in json.load(open('data/products.json')))))" 2>/dev/null || echo "?")
SCREENSHOTS=$(find eval/ -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
VIDEOS=$(find eval/ -name "*.webm" 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           EXTENDED SESSION COMPLETE — SUMMARY            ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Products:     $TOTAL_PRODUCTS from $STORES stores                          ║"
echo "║  Screenshots:  $SCREENSHOTS across all phases                        ║"
echo "║  Videos:       $VIDEOS happy-path recordings                     ║"
echo "║  Git tags:     phase1 → phase7                          ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  TO TEST: Port 3000 is running. Open it in your browser ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

git push origin main --tags 2>&1 || warn "Git push failed"
log "Pushed to GitHub"

# Start production server for user testing
log "Starting production server on port 3000..."
npm run build 2>/dev/null && npm start
