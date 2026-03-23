#!/bin/bash
###############################################################################
# VFR Autonomous Session — 4 Hour Orchestrator
#
# Runs Claude Code in phased execution with real Playwright eval gates.
# Each phase: Claude builds → production build → Playwright verifies → git tag
# If eval fails: one retry, then move on.
#
# Usage: bash run-session.sh
# Prereqs: Claude Code authenticated, npm install done, .env.local exists
###############################################################################
set -o pipefail

VFR_DIR="$(cd "$(dirname "$0")" && pwd)"
EVAL_DIR="$VFR_DIR/eval"
LOG_DIR="$EVAL_DIR/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Phase timeouts (seconds)
PHASE1_TIMEOUT=5400   # 1.5 hours
PHASE2_TIMEOUT=3600   # 1 hour
PHASE3_TIMEOUT=2700   # 45 min
PHASE4_TIMEOUT=2700   # 45 min
FIX_TIMEOUT=1200      # 20 min for fix attempts

# Colors
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

# Setup
mkdir -p "$EVAL_DIR"/{phase1,phase2,phase3,final,logs}

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         VFR AUTONOMOUS SESSION — $TIMESTAMP         ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Phase 1: Design Overhaul          (0:00 - 1:30)       ║"
echo "║  Phase 2: Catalog Scraping         (1:30 - 2:30)       ║"
echo "║  Phase 3: Integration + Generation (2:30 - 3:15)       ║"
echo "║  Phase 4: Testing + Polish         (3:15 - 4:00)       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Pre-flight checks
log "Running pre-flight checks..."

if [ ! -f "$VFR_DIR/.env.local" ]; then
  fail ".env.local not found! Set REPLICATE_API_TOKEN."
  if [ -n "$REPLICATE_API_TOKEN" ]; then
    echo "REPLICATE_API_TOKEN=$REPLICATE_API_TOKEN" > .env.local
    pass "Created .env.local from environment variable"
  else
    exit 1
  fi
fi

if ! command -v claude &>/dev/null; then
  fail "Claude Code not installed"
  exit 1
fi

if ! command -v npx &>/dev/null; then
  fail "Node.js/npx not found"
  exit 1
fi

npm install --silent 2>&1 | tail -1
pass "Dependencies installed"

# Verify baseline build
log "Verifying baseline build..."
if npm run build 2>"$LOG_DIR/baseline-build-errors.log"; then
  pass "Baseline build OK"
else
  warn "Baseline build failed — Phase 1 will need to fix this"
fi

git add -A && git commit -m "Pre-session: eval gates + session script" --allow-empty 2>/dev/null || true
git tag -f "pre-session-$TIMESTAMP" 2>/dev/null || true
pass "Git checkpoint: pre-session"

###############################################################################
# PHASE 1: DESIGN OVERHAUL
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "PHASE 1: Design Overhaul"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PHASE1_PROMPT='You are building a Virtual Fitting Room app. This is Phase 1: DESIGN OVERHAUL.

READ CLAUDE.md first for full context, constraints, and architecture.

YOUR TASK: Completely rebuild the UI from scratch to look like a production-quality fashion app.

DESIGN INSPIRATION (copy these patterns):
- **Fits app** (fits-app.com): Clean masonry card grid, category filter chips, beautiful try-on results with before/after
- **Klodsy** (klodsy.com): 3-step flow (Add Model → Upload Clothes → See Your Look), luxurious feel
- **Doji**: Selfie-based AI model, side-by-side before/after reveal

SPECIFIC UI REQUIREMENTS:
1. NAVIGATION: Bottom tab bar with icons (Closet / Outfits / Try-On / Settings) — NOT a sidebar
2. CLOSET VIEW: Masonry or grid of product cards with category filter chips (All, Dresses, Shoes, Tights, Bags, Accessories). Each card shows: product image, name, price, store badge
3. PRODUCT DETAIL: Full-screen lightbox with image carousel (swipeable), product info, "Add to Outfit" and "Try On" CTA buttons
4. TRY-ON FLOW: Select product → see reference photo side-by-side → click Generate → loading animation → beautiful before/after reveal
5. OUTFIT BUILDER: Multi-item assembly (dress + shoes + accessories), generate full look
6. SETTINGS: Reference photo upload, API token config

DESIGN TOKENS:
- Background: #0A0A0A (deep black)
- Card background: rgba(255,255,255,0.04) with subtle border rgba(255,255,255,0.08)
- Accent: #D4AF61 (warm gold)
- Text primary: #F5F0EB (warm cream)
- Text secondary: rgba(245,240,235,0.6)
- Typography: DM Serif Display for headings, Inter Tight for body
- Border radius: 16px cards, 12px buttons, 24px modals
- Shadows: 0 8px 32px rgba(0,0,0,0.4)
- Animations: Framer Motion springs (stiffness: 300, damping: 30)

CRITICAL RULES:
- Keep ALL existing API routes working (src/app/api/*)
- Keep ALL existing data files (data/*.json)
- Keep the scraper (src/lib/scraper.ts), db (src/lib/db.ts), generate (src/lib/generate.ts)
- ONLY rebuild UI components and pages
- Use Tailwind CSS 4 classes + CSS custom properties
- Mobile-first (390px viewport), responsive up to 1440px
- No emojis in UI
- Add data-testid attributes on key elements: product-card, category-tab, add-button, lightbox, tryon-button

When done: run `npm run build` to verify no errors. Fix any build errors before finishing.'

timeout $PHASE1_TIMEOUT claude -p "$PHASE1_PROMPT" \
  --dangerously-skip-permissions \
  --output-format text \
  2>&1 | tee "$LOG_DIR/phase1-claude.log"

log "Phase 1 build check..."
if npm run build 2>"$LOG_DIR/phase1-build-errors.log"; then
  pass "Phase 1 build succeeded"
else
  warn "Phase 1 build failed — attempting fix..."
  BUILD_ERRORS=$(cat "$LOG_DIR/phase1-build-errors.log" | tail -50)
  timeout $FIX_TIMEOUT claude -p "The production build failed with these errors. Fix them ALL. Then run npm run build again to verify.

ERRORS:
$BUILD_ERRORS" \
    --dangerously-skip-permissions --output-format text \
    2>&1 | tee "$LOG_DIR/phase1-fix.log"
  npm run build 2>"$LOG_DIR/phase1-rebuild-errors.log" || warn "Phase 1 build still failing"
fi

log "Phase 1 eval gate..."
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase1-design.spec.ts \
  2>&1 | tee "$LOG_DIR/phase1-eval.log"
PHASE1_RESULT=$?

if [ $PHASE1_RESULT -eq 0 ]; then
  pass "Phase 1 eval gate PASSED"
else
  warn "Phase 1 eval gate failed ($PHASE1_RESULT) — attempting fix..."
  EVAL_OUTPUT=$(cat "$LOG_DIR/phase1-eval.log" | tail -40)
  timeout $FIX_TIMEOUT claude -p "Phase 1 eval gate failed. Fix the issues so the tests pass. The tests verify real UI interactions.

EVAL OUTPUT:
$EVAL_OUTPUT

Fix the UI so these tests pass. Then run: npm run build" \
    --dangerously-skip-permissions --output-format text \
    2>&1 | tee "$LOG_DIR/phase1-eval-fix.log"
  npm run build 2>/dev/null
  npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase1-design.spec.ts \
    2>&1 | tee "$LOG_DIR/phase1-eval-retry.log" && pass "Phase 1 eval PASSED on retry" || warn "Phase 1 eval still failing — moving on"
fi

git add -A && git commit -m "Phase 1: Design overhaul complete" 2>/dev/null || true
git tag -f "phase1-design" 2>/dev/null || true
log "Git checkpoint: phase1-design"

###############################################################################
# PHASE 2: CATALOG SCRAPING
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "PHASE 2: Catalog Scraping"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PHASE2_PROMPT='You are building a Virtual Fitting Room app. This is Phase 2: CATALOG SCRAPING.

READ CLAUDE.md first for constraints (colors, prices, sizes, styles).

YOUR TASK: Scrape products from ALL 5 stores into data/products.json.

STORES AND STRATEGIES (try in order for each):

1. PRINCESS POLLY (Shopify) — us.princesspolly.com
   - Shopify JSON: /products/HANDLE.json
   - Collection pages: /collections/dresses, /collections/shoes, etc.
   - Get: dresses, shoes, bags, accessories

2. PEPPERMAYO (Shopify) — us.peppermayo.com
   - Shopify JSON: /products/HANDLE.json
   - Get: dresses, shoes, bags, accessories

3. OH POLLY — ohpolly.com
   - Try: Shopify JSON first, HTML parse, Tavily extract
   - If all fail: use Playwright browser to navigate collection pages
   - Get: dresses, accessories

4. HOUSE OF CB — houseofcb.com
   - Try: Shopify JSON first, HTML parse, Tavily extract
   - If all fail: use Playwright browser
   - EXEMPT from $100 price limit
   - Get: dresses, shoes

5. WOLFORD — wolford.com
   - NOT Shopify. Use HTML parse or Tavily extract
   - Get: ALL tights and stockings (at least 5 products)

SCRAPING RULES:
- 2-3 second random delay between requests
- User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
- Try Shopify JSON → Tavily extract → HTML parse → Playwright (escalating strategy)
- NEVER remove existing products from products.json — only ADD new ones
- Enforce ALL constraints from CLAUDE.md (colors, prices, sizes, lengths, styles)
- Each product needs: id, url, title, price, store, category, images[], and lengthInches for dresses

TARGETS:
- At least 3 products per store (15+ total new products)
- At least 5 Wolford tights/stockings
- Products across all categories: dress, shoes, tights, bag, accessories

You can write helper scripts in scripts/ to do the scraping. Update src/lib/scraper.ts if needed.
When done: verify data/products.json is valid JSON with products from all 5 stores.'

timeout $PHASE2_TIMEOUT claude -p "$PHASE2_PROMPT" \
  --dangerously-skip-permissions \
  --output-format text \
  2>&1 | tee "$LOG_DIR/phase2-claude.log"

# Build after scraping (in case scraper.ts changed)
npm run build 2>"$LOG_DIR/phase2-build-errors.log" || warn "Phase 2 build issue"

log "Phase 2 eval gate..."
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase2-catalog.spec.ts \
  2>&1 | tee "$LOG_DIR/phase2-eval.log"
PHASE2_RESULT=$?

if [ $PHASE2_RESULT -eq 0 ]; then
  pass "Phase 2 eval gate PASSED"
else
  warn "Phase 2 eval gate failed — attempting fix..."
  EVAL_OUTPUT=$(cat "$LOG_DIR/phase2-eval.log" | tail -40)
  timeout $FIX_TIMEOUT claude -p "Phase 2 eval gate failed. The catalog needs more products or has constraint violations. Fix issues:

$EVAL_OUTPUT

Add more products from missing stores. Fix any constraint violations. Ensure valid JSON." \
    --dangerously-skip-permissions --output-format text \
    2>&1 | tee "$LOG_DIR/phase2-fix.log"
  npm run build 2>/dev/null
  npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase2-catalog.spec.ts \
    2>&1 | tee "$LOG_DIR/phase2-eval-retry.log" && pass "Phase 2 eval PASSED on retry" || warn "Phase 2 eval still failing — moving on"
fi

git add -A && git commit -m "Phase 2: Catalog expansion — all 5 stores" 2>/dev/null || true
git tag -f "phase2-catalog" 2>/dev/null || true
log "Git checkpoint: phase2-catalog"

###############################################################################
# PHASE 3: INTEGRATION + REAL GENERATION
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "PHASE 3: Integration + Real Generation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PHASE3_PROMPT='You are building a Virtual Fitting Room app. This is Phase 3: INTEGRATION + REAL GENERATION.

READ CLAUDE.md for full context.

YOUR TASK: Wire the new UI (Phase 1) to the real data (Phase 2) and verify with REAL AI generation.

STEPS:
1. Ensure all scraped products from data/products.json display correctly in the new closet grid
2. Verify category filtering works (clicking Dresses shows dresses, Tights shows Wolford tights, etc.)
3. Verify product lightbox shows images from the correct product
4. Verify the outfit builder can assemble multi-item outfits
5. Run EXACTLY 3 real Replicate generations (budget: $0.50 max):
   a. Pick one dress → generate try-on → save result image to eval/phase3/generation-dress.png
   b. Pick one Wolford tights → generate try-on → save result image to eval/phase3/generation-tights.png
   c. Create an outfit (dress + shoes) → generate → save to eval/phase3/generation-outfit.png
6. Verify generated images display in the Try-On results gallery in the UI

IMPORTANT:
- The reference photo is at public/uploads/reference.jpg
- The Replicate token is in .env.local
- Model is google/nano-banana-pro via Replicate API
- Save ALL generation results as screenshots/images in eval/phase3/
- If generation fails, log the error and try once more. Do not spend more than $1 total.

When done: run npm run build. Verify the app displays products AND generation results.'

timeout $PHASE3_TIMEOUT claude -p "$PHASE3_PROMPT" \
  --dangerously-skip-permissions \
  --output-format text \
  2>&1 | tee "$LOG_DIR/phase3-claude.log"

npm run build 2>"$LOG_DIR/phase3-build-errors.log" || warn "Phase 3 build issue"

log "Phase 3 eval gate..."
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase3-integration.spec.ts \
  2>&1 | tee "$LOG_DIR/phase3-eval.log"
PHASE3_RESULT=$?

if [ $PHASE3_RESULT -eq 0 ]; then
  pass "Phase 3 eval gate PASSED"
else
  warn "Phase 3 eval partially failed — attempting fix..."
  EVAL_OUTPUT=$(cat "$LOG_DIR/phase3-eval.log" | tail -40)
  timeout $FIX_TIMEOUT claude -p "Phase 3 eval gate failed. Fix integration issues. Ensure products display and generation works:

$EVAL_OUTPUT" \
    --dangerously-skip-permissions --output-format text \
    2>&1 | tee "$LOG_DIR/phase3-fix.log"
  npm run build 2>/dev/null
fi

git add -A && git commit -m "Phase 3: Integration + real AI generation verified" 2>/dev/null || true
git tag -f "phase3-integration" 2>/dev/null || true
log "Git checkpoint: phase3-integration"

###############################################################################
# PHASE 4: TESTING + POLISH
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "PHASE 4: Testing + Polish"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PHASE4_PROMPT='You are building a Virtual Fitting Room app. This is Phase 4: TESTING + POLISH.

READ CLAUDE.md for full context.

YOUR TASK: Comprehensive testing and final polish. Make this app BULLETPROOF.

TESTING (write/fix tests):
1. Run existing unit tests: npm run test — fix any failures
2. Run the Phase 4 eval gate tests and make sure the app passes ALL of them:
   npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase4-final.spec.ts
3. Fix ANY test failure by modifying the app code (NOT the tests)
4. Add data-testid attributes wherever the tests expect them

POLISH:
1. Loading states: skeleton screens on every page while data loads (not blank white)
2. Empty states: beautiful message when a category has no products
3. Error handling: toast notifications for failed scrapes/generations
4. Image loading: lazy load with blur placeholder or skeleton
5. Category filter chips should show product counts: "Dresses (12)"
6. Smooth page transitions between Closet/Outfits/Try-On/Settings tabs
7. Touch targets: minimum 44px for all interactive elements

FINAL VERIFICATION:
1. npm run build must succeed
2. npm run test must pass
3. All Phase 4 eval gate tests must pass
4. Take final screenshots of EVERY page at mobile (390px) and desktop (1440px) viewports
5. Save all screenshots to eval/final/

DO NOT:
- Change any eval gate test files (eval-gates/*.spec.ts)
- Remove products from data/products.json
- Modify data/settings.json
- Break existing API routes
- Use any Replicate credits (all tests must mock generation)'

timeout $PHASE4_TIMEOUT claude -p "$PHASE4_PROMPT" \
  --dangerously-skip-permissions \
  --output-format text \
  2>&1 | tee "$LOG_DIR/phase4-claude.log"

npm run build 2>"$LOG_DIR/phase4-build-errors.log" || warn "Phase 4 build issue"

log "Phase 4 eval gate (FINAL)..."
npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase4-final.spec.ts \
  2>&1 | tee "$LOG_DIR/phase4-eval.log"
PHASE4_RESULT=$?

if [ $PHASE4_RESULT -eq 0 ]; then
  pass "PHASE 4 FINAL EVAL PASSED"
else
  warn "Phase 4 eval failed — final fix attempt..."
  EVAL_OUTPUT=$(cat "$LOG_DIR/phase4-eval.log" | tail -50)
  timeout $FIX_TIMEOUT claude -p "FINAL FIX ATTEMPT. These eval gate tests MUST pass. Fix the app:

$EVAL_OUTPUT

Fix every single failure. Run npm run build after. Do NOT modify test files." \
    --dangerously-skip-permissions --output-format text \
    2>&1 | tee "$LOG_DIR/phase4-final-fix.log"
  npm run build 2>/dev/null
  npx playwright test --config=eval-gates/playwright.config.ts eval-gates/phase4-final.spec.ts \
    2>&1 | tee "$LOG_DIR/phase4-eval-final.log" && pass "FINAL EVAL PASSED" || warn "Some tests still failing"
fi

git add -A && git commit -m "Phase 4: Testing + polish complete" 2>/dev/null || true
git tag -f "phase4-final" 2>/dev/null || true

###############################################################################
# POST-SESSION: Start production server and report
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "POST-SESSION: Starting production server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final build + start server
npm run build 2>&1 | tee "$LOG_DIR/final-build.log"

# Count results
TOTAL_PRODUCTS=$(python3 -c "import json; print(len(json.load(open('data/products.json'))))" 2>/dev/null || echo "?")
STORES=$(python3 -c "import json; print(len(set(p['store'] for p in json.load(open('data/products.json')))))" 2>/dev/null || echo "?")
EVAL_SCREENSHOTS=$(find eval/ -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
GEN_IMAGES=$(find eval/phase3/ -name "generation*" 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              SESSION COMPLETE — SUMMARY                  ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Products:        $TOTAL_PRODUCTS total from $STORES stores                 ║"
echo "║  Eval screenshots: $EVAL_SCREENSHOTS saved to eval/                       ║"
echo "║  Real generations: $GEN_IMAGES in eval/phase3/                      ║"
echo "║  Git tags:         pre-session, phase1-4                 ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Phase 1 (Design):      $([ $PHASE1_RESULT -eq 0 ] && echo 'PASS' || echo 'FAIL')                          ║"
echo "║  Phase 2 (Catalog):     $([ $PHASE2_RESULT -eq 0 ] && echo 'PASS' || echo 'FAIL')                          ║"
echo "║  Phase 3 (Integration): $([ $PHASE3_RESULT -eq 0 ] && echo 'PASS' || echo 'FAIL')                          ║"
echo "║  Phase 4 (Final):       $([ $PHASE4_RESULT -eq 0 ] && echo 'PASS' || echo 'FAIL')                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Push to GitHub
git push origin main --tags 2>&1 || warn "Git push failed"
log "Pushed to GitHub"

# Start production server (stays running for user to test)
log "Starting production server on port 3000..."
log "Open your Codespace port 3000 to test the app!"
npm start
