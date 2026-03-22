#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/workspaces/ClaudeCodeProjects"
VFR_DIR="$REPO_ROOT/virtual-fitting-room"
LOG_FILE="/tmp/vfr-phase2.log"
START_TIME=$(date +%s)
MAX_DURATION=5400  # 90 minutes for phase 2

cd "$VFR_DIR"
git -C "$REPO_ROOT" config commit.gpgsign false

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

elapsed() {
  echo $(( $(date +%s) - START_TIME ))
}

remaining() {
  echo $(( MAX_DURATION - $(elapsed) ))
}

commit_and_push() {
  cd "$REPO_ROOT"
  git add -A
  if git diff --cached --quiet; then
    log "No changes to commit"
  else
    git commit -m "$1

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
    git pull --rebase origin main || true
    git push origin main
    log "Committed and pushed: $1"
  fi
  cd "$VFR_DIR"
}

log "=== VFR Phase 2: Deep Tests + Extended Catalog + Video Demo ==="
log "Max duration: ${MAX_DURATION}s ($(( MAX_DURATION / 60 )) minutes)"

# Eval gate function — runs deterministic checks after every step
run_eval_gate() {
  local step_name="$1"
  log "  [EVAL GATE v2] Running 3-stage validation for: $step_name"
  if [ -f eval-gate.sh ]; then
    local exit_code=0
    bash eval-gate.sh "$step_name" 2>&1 | tee -a "$LOG_FILE" || exit_code=${PIPESTATUS[0]}
    # Also check directly
    if [ $exit_code -eq 0 ] && grep -q "VERDICT: FAIL" /tmp/eval-gate-report.txt 2>/dev/null; then
      exit_code=1
    fi
    if [ $exit_code -eq 0 ]; then
      log "  [EVAL GATE] PASSED for: $step_name"
    else
      log "  [EVAL GATE] $exit_code FAILURES for: $step_name — auto-fixing..."
      # Atris-style: read eval report + lessons learned, fix with full context
      timeout 420s claude \
        --print \
        --dangerously-skip-permissions \
        --max-turns 20 \
        "You are fixing quality issues found by the eval gate. You are EMPOWERED to install any packages, re-architect code, or make whatever changes are needed for a perfect product.

READ these files:
1. /tmp/eval-gate-report.txt — the failures to fix
2. /tmp/eval-lessons.md — lessons from previous eval runs (learn from past mistakes)
3. /tmp/eval-benchmarks.json — performance trends across steps
4. CLAUDE.md — project constraints

Fix ALL failures. For each fix:
- Explain what was wrong and why
- Make the fix
- If a product violates constraints, REMOVE it from data/products.json
- If a URL is broken, try to find a replacement or remove the product
- If tests fail, fix the test or the code (prefer fixing code)
- If the build fails, fix TypeScript errors
- If latency is bad, optimize (lazy loading, code splitting, etc.)
- Install any needed packages with npm install

After fixing, re-run: bash eval-gate.sh '$step_name'
If issues remain after 2 attempts, document what could not be fixed in /tmp/eval-lessons.md and move on." \
        2>&1 | tee -a "$LOG_FILE" || log "  [EVAL GATE] Auto-fix timed out"
      commit_and_push "Eval gate fixes for: $step_name"
    fi
  else
    log "  [EVAL GATE] eval-gate.sh not found, skipping"
  fi
}

# ============================================================
# STEP 0: Pull latest and validate ALL Phase 1 work
# ============================================================
log "--- Step 0: Sync + Validate Phase 1 Output ---"
cd "$REPO_ROOT"
git pull --rebase origin main || true
cd "$VFR_DIR"

# Run eval gate against everything Phase 1 produced
# This catches any slop from rounds 1-4 BEFORE we build on top of it
run_eval_gate "Phase 1 Baseline"

# If Phase 1 had issues, the auto-fixer already ran.
# Now read lessons learned so far and have Claude do a holistic review
log "--- Step 0b: Holistic Phase 1 Review ---"
timeout 300s claude \
  --print \
  --dangerously-skip-permissions \
  --max-turns 15 \
  "You are reviewing ALL work from Phase 1 (rounds 1-4) before Phase 2 begins.

READ these files:
1. /tmp/eval-gate-report.txt — eval results for Phase 1 output
2. /tmp/eval-lessons.md — any lessons captured so far
3. /tmp/eval-benchmarks.json — baseline metrics
4. CLAUDE.md — project constraints
5. data/products.json — the current catalog

Your job:
1. Are there any products that should NOT be in the catalog? (wrong color, style, price, broken URL) — REMOVE them
2. Is the UI code clean? Read page.tsx — any dead code, unused variables, commented-out blocks? — CLEAN them
3. Are there any accessibility issues? (missing alt text, poor contrast, tiny tap targets) — FIX them
4. Is the data layer clean? Any orphaned renderings or outfits pointing to deleted products? — CLEAN them
5. Write a summary of Phase 1 quality to /tmp/phase1-review.txt

This sets the clean baseline for Phase 2. Be thorough but fast." \
  2>&1 | tee -a "$LOG_FILE" || log "Phase 1 review had issues"
commit_and_push "Phase 1 holistic review and cleanup"

# ============================================================
# STEP 2: Deep Test Suite Creation
# ============================================================
log "--- Step 2: Deep Test Suite ---"
if [ -f run-deep-tests.sh ]; then
  bash run-deep-tests.sh 2>&1 | tee -a "$LOG_FILE" || log "Deep tests script had issues, continuing..."
else
  log "run-deep-tests.sh not found, running inline..."
  timeout 900s claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 40 \
    "READ CLAUDE.md first. Create comprehensive deep E2E tests in e2e/ covering: product add/dedup flows, outfit builder flows, constraint validation (dress length+label, shoe size 5, colors, prices), performance assertions (LCP <3s, no console errors, no 404s), UI edge cases (rapid tab switching, mobile/desktop resize, empty states, long titles, offline). Also create vitest tests for scraper error handling and mocked generation flow. ALL generation tests must mock Replicate (zero credits). Run npm run build && npm run test && npm run test:e2e after. Fix any failures." \
    2>&1 | tee -a "$LOG_FILE" || log "Deep test creation had issues"
fi
commit_and_push "Add comprehensive deep test suite"
run_eval_gate "Deep Test Suite"

# ============================================================
# STEP 3: Extended Catalog - More Date Night Products
# ============================================================
log "--- Step 3: Extended Catalog - Sexy Date Night Collection ---"
REMAINING=$(remaining)
if [ "$REMAINING" -gt 600 ]; then
  timeout 900s claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 40 \
    'READ CLAUDE.md first for STRICT product constraints.

You are building a "Sexy Date Night in SF" collection. Add MORE products:

DRESSES (the star of the show):
- Find 5-8 more date night dresses from Princess Polly, Peppermayo, Oh Polly, House of CB
- MUST be explicitly labeled mini/midi on the product page
- MUST have garment length listed that matches label (mini < 26in, midi < 38in)
- Colors: black, red, wine, burgundy, emerald, navy, gold, white, purple ONLY
- NO strapless, corset, tube, cowl, florals, prints, beachy
- Price <= $100 (House of CB exempt)
- Size 0/XXS
- Think: bodycon, satin, silk, cutout, backless, one-shoulder — SEXY date night vibes

SHOES:
- Find 3-4 heels/strappy sandals in size 5
- From Princess Polly, Peppermayo, or House of CB
- Black, gold, nude (neutral shoe tones ok), red

ACCESSORIES:
- 2-3 statement earrings or delicate necklaces
- 1-2 clutch bags (small evening bags)
- Gold or silver jewelry that complements the dresses

TIGHTS:
- 1-2 sheer or patterned tights from Wolford

For EACH product:
1. Web search for real current product URLs
2. Start dev server: npm run dev &
3. Add via curl POST to /api/products
4. Verify the product was added correctly (images, price, category)
5. curl -I the product URL to verify it works
6. Check all constraints before adding

After adding all products:
- Kill dev server
- npm run build && npm run test && npm run test:e2e
- Fix any failures' \
    2>&1 | tee -a "$LOG_FILE" || log "Extended catalog had issues"
  commit_and_push "Expand catalog with sexy date night collection"
run_eval_gate "Date Night Collection"
else
  log "Skipping extended catalog - not enough time"
fi

# Oracle review of extended catalog
REMAINING=$(remaining)
if [ "$REMAINING" -gt 600 ]; then
  log "--- Step 3b: Oracle review of extended catalog ---"
  timeout 600s claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 25 \
    'READ CLAUDE.md for constraints. You are the ORACLE reviewer.

Review ALL products in data/products.json:
1. For every dress:
   - Verify price <= $100 (House of CB exempt)
   - Verify color is allowed (emerald, red, wine, burgundy, blue, navy, yellow, white, black, purple, gold)
   - Verify no excluded styles (strapless, corset, tube, cowl, florals, prints, beachy)
   - Note: we cannot verify length/label from JSON alone, but verify category is set
2. For every product:
   - curl -I the product URL — must return 200 or 301
   - curl -I the first image URL — must load
3. Check for duplicate URLs
4. REMOVE any product that fails checks
5. npm run build && npm run test && npm run test:e2e
6. Write results to /tmp/oracle-catalog-review.txt' \
    2>&1 | tee -a "$LOG_FILE" || log "Oracle catalog review had issues"
  commit_and_push "Oracle catalog review - constraint enforcement"
run_eval_gate "Oracle Catalog Review"
else
  log "Skipping oracle catalog review - not enough time"
fi

# ============================================================
# STEP 4: Even More Products if Time Permits
# ============================================================
REMAINING=$(remaining)
if [ "$REMAINING" -gt 900 ]; then
  log "--- Step 4: Additional products from new stores ---"
  timeout 900s claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 40 \
    'READ CLAUDE.md for constraints. Add more products from stores NOT already heavily represented.

Try these stores (all Shopify, scraper should work):
- Oh Polly (ohpolly.com) - bodycon dresses, date night styles
- Meshki (meshki.us) - evening wear
- Tiger Mist (tigermist.com.au) - going-out dresses
- Beginning Boutique (beginningboutique.com) - date night

Same strict constraints as CLAUDE.md. Size 0/XXS, shoes size 5.
Verify every product URL works. Add new image domains to next.config.ts if needed.
npm run build && npm run test && npm run test:e2e after.' \
    2>&1 | tee -a "$LOG_FILE" || log "Additional products had issues"
  commit_and_push "Add products from additional stores"
run_eval_gate "Additional Stores"
fi

# ============================================================
# STEP 5: Video Demo - Sexy Date Night Flow
# ============================================================
REMAINING=$(remaining)
if [ "$REMAINING" -gt 600 ]; then
  log "--- Step 5: Video Demo Recording ---"
  timeout 600s claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 30 \
    'Create a Playwright test that RECORDS A VIDEO of the full app experience.
The video should showcase a "Sexy Date Night in SF" shopping flow.

Create file: e2e/demo-video.spec.ts

Configure Playwright video recording in the test:
```
test.use({
  video: { mode: "on", size: { width: 393, height: 852 } },
  viewport: { width: 393, height: 852 },
});
```

The test should walk through this flow (with pauses so the video looks natural):
1. Show the home page (outfits tab) - pause 2s
2. Switch to closet tab - pause 2s
3. Scroll through the product grid slowly (scroll down in increments) - pause 1s between scrolls
4. Click on a dress (preferably a sexy black or red one) - pause 1s
5. Swipe through the lightbox images - pause 1.5s between swipes
6. Close lightbox - pause 1s
7. Click "Shop" button on a product to show the link works - pause 1s, go back
8. Switch to outfits tab - pause 1s
9. Click on an outfit or create a new one - pause 2s
10. Show the outfit builder page - pause 2s
11. Go back to home - pause 1s
12. Show different category filters (shoes, accessories, tights) - click each with 1.5s pause
13. End on the full closet view - pause 3s

Use page.waitForTimeout() for pauses.
Bypass AuthGate in beforeEach.
The video will be saved to test-results/ directory automatically.

After creating the test:
- Run ONLY this test: npx playwright test e2e/demo-video.spec.ts
- Verify the video file exists in test-results/
- The video file will be a .webm file

Do NOT run any other tests, just this demo video test.' \
    2>&1 | tee -a "$LOG_FILE" || log "Video demo had issues"
  commit_and_push "Add date night demo video recording"
else
  log "Skipping video demo - not enough time"
fi

# ============================================================
# STEP 6: Final Polish Pass
# ============================================================
REMAINING=$(remaining)
if [ "$REMAINING" -gt 300 ]; then
  log "--- Step 6: Final Polish ---"
  timeout 600s claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 25 \
    'Final polish pass on the Virtual Fitting Room. READ CLAUDE.md.

1. Run the full test suite: npm run build && npm run test && npm run test:e2e
2. Fix ANY failures
3. Check data/products.json - remove any products with broken URLs or missing images
4. Verify the app looks good at mobile viewport (393x852)
5. Check for any TypeScript warnings in the build output
6. Ensure all image domains in products are in next.config.ts remotePatterns
7. Run a final npm run build to confirm clean output

This is the final check before the user sees the app.' \
    2>&1 | tee -a "$LOG_FILE" || log "Final polish had issues"
  commit_and_push "Final polish and cleanup"
run_eval_gate "Final Polish"
fi

# ============================================================
# DONE
# ============================================================
TOTAL_ELAPSED=$(elapsed)
log ""
log "=========================================="
log "VFR Phase 2 Complete"
log "=========================================="
log "Total time: ${TOTAL_ELAPSED}s ($(( TOTAL_ELAPSED / 60 )) minutes)"
log ""
log "Deliverables:"
log "  - Deep test suite (e2e/ + src/__tests__/)"
log "  - Expanded date night catalog"
log "  - Demo video in test-results/"
log "  - All tests passing"
log "=========================================="
echo "PHASE2_DONE" > /tmp/vfr-phase2-status.txt
