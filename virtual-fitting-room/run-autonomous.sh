#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/workspaces/ClaudeCodeProjects"
VFR_DIR="$REPO_ROOT/virtual-fitting-room"
START_TIME=$(date +%s)
MAX_DURATION=3600  # 60 minutes
ROUND=1
MAX_ROUNDS=4
LOG_FILE="/tmp/vfr-rounds.log"

cd "$VFR_DIR"

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
    git commit -m "Autonomous round $ROUND: $1

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
    git pull --rebase origin main || true
    git push origin main
    log "Committed and pushed: $1"
  fi
  cd "$VFR_DIR"
}

run_builder() {
  local prompt="$1"
  local timeout_secs="$2"

  log "  [BUILDER] Starting (timeout: ${timeout_secs}s)"
  timeout "${timeout_secs}s" claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 40 \
    "$prompt" \
    2>&1 | tee -a "$LOG_FILE" || {
      local exit_code=$?
      if [ $exit_code -eq 124 ]; then
        log "  [BUILDER] Timed out after ${timeout_secs}s"
      else
        log "  [BUILDER] Exited with code $exit_code"
      fi
    }
  log "  [BUILDER] Done"
}

run_oracle() {
  local round_name="$1"
  local timeout_secs="$2"

  local oracle_prompt="You are the REVIEWER ORACLE for the Virtual Fitting Room autonomous development session.

READ the CLAUDE.md file first for full product constraints.

Your job is to REVIEW and VERIFY the work done in Round: ${round_name}

## Your verification checklist:

1. **Build check**: Run \`npm run build\` — must pass with zero errors
2. **Unit tests**: Run \`npm run test\` — must pass
3. **E2E tests**: Run \`npm run test:e2e\` — must pass, check screenshots in test-results/
4. **Start dev server and take screenshots**:
   - \`npm run dev &\`
   - Use Playwright to navigate to http://localhost:3000 and take screenshots
   - Navigate to any outfit pages and take screenshots
   - Kill the dev server after
5. **Product constraint validation** (if catalog was modified):
   - Read data/products.json
   - For each dress: verify length category label matches measurement (mini < 26in, midi < 38in, maxi < 48in)
   - For each dress: verify color is allowed, style is allowed, price <= \$100 (House of CB exempt)
   - For each shoe: verify size 5 is available
   - For all products: curl -I each URL to verify 200/301
   - For all products: curl -I the first image URL to verify it loads
   - REJECT and REMOVE any product that violates constraints
6. **Fix any issues found** — do not just report them, actually fix them
7. **Re-run tests after fixes**

At the end, write a file /tmp/oracle-round-${ROUND}.txt with either:
- PASS: <summary of what was verified>
- FAIL: <what went wrong and could not be fixed>

Be thorough. The user will not see this app until all rounds are complete."

  log "  [ORACLE] Starting review (timeout: ${timeout_secs}s)"
  timeout "${timeout_secs}s" claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 25 \
    "$oracle_prompt" \
    2>&1 | tee -a "$LOG_FILE" || {
      local exit_code=$?
      if [ $exit_code -eq 124 ]; then
        log "  [ORACLE] Timed out after ${timeout_secs}s"
      else
        log "  [ORACLE] Exited with code $exit_code"
      fi
    }

  # Check oracle result
  if [ -f "/tmp/oracle-round-${ROUND}.txt" ]; then
    local result
    result=$(head -1 "/tmp/oracle-round-${ROUND}.txt")
    log "  [ORACLE] Result: $result"
  else
    log "  [ORACLE] No result file written (assuming PASS with fixes applied)"
  fi
  log "  [ORACLE] Done"
}

# ============================================================
# ROUND PROMPTS
# ============================================================

ROUND1_PROMPT='You are autonomously improving the Virtual Fitting Room app. This is ROUND 1: Reference & UI Foundation.

READ the CLAUDE.md file first for full context.

Your tasks:
1. Web search for "V0.dev virtual fitting room" and "best luxury fashion app UI 2025" and "Glossier app design" and "Aritzia mobile app"
2. Study the current page.tsx, globals.css, and all component files
3. Based on references found, implement these UI improvements:
   - Improve the product card layout with better image aspect ratios, hover states, and price display
   - Add smooth page transitions and tab switching animations
   - Improve empty state designs with elegant copy
   - Add proper loading skeletons (not just spinners)
   - Ensure the lightbox has smooth swipe gestures on mobile
   - Refine the color palette to match Glossier/Aritzia luxury aesthetic (warm tones, gold accent)
   - Improve typography hierarchy using the existing fonts
4. Run "npm run build" to verify no build errors
5. Run "npm run test" to verify tests pass

Do NOT break existing functionality. Make incremental improvements. The aesthetic should be: luxury, warm, mobile-first, Glossier/Aritzia vibes.'

ROUND2_PROMPT='You are autonomously improving the Virtual Fitting Room app. This is ROUND 2: Latency & Polish.

READ the CLAUDE.md file first for full context.

Your tasks:
1. **Image optimization**:
   - Replace any raw <img> tags with Next.js <Image> component
   - Add blur placeholder data URLs for product images
   - Add loading="lazy" to all below-fold images
   - Add explicit width/height to prevent layout shift (CLS)
2. **Network optimization**:
   - Add <link rel="preconnect"> hints in layout.tsx for cdn.shopify.com, cloudfront.net
   - Add Suspense boundaries around dynamic content
   - Ensure the main page JS bundle is as small as possible
3. **UI polish**:
   - Add staggered entry animations to product card grid (framer-motion)
   - Add price formatting with proper currency symbol ($)
   - Improve the product link/shop button — make it a proper styled button
   - Add pull-to-refresh visual hint on mobile
   - Smooth scroll behavior throughout
4. **Performance verification**:
   - Run "npm run build" and check the output sizes
   - Run "npm run test"
   - Run "npm run test:e2e"

Focus on making the app FAST and POLISHED. Every interaction should feel smooth.'

ROUND3_PROMPT='You are autonomously improving the Virtual Fitting Room app. This is ROUND 3: Full Catalog Expansion.

READ the CLAUDE.md file CAREFULLY — there are STRICT product constraints you MUST follow.

Your tasks:
1. **Find and add dresses** from Princess Polly, Peppermayo, Oh Polly, House of CB:
   - Web search for current product URLs on each store
   - For each dress, verify ON THE PRODUCT PAGE:
     a) It is explicitly labeled mini/midi/maxi
     b) The garment length is listed and matches the category (mini < 26in, midi < 38in, maxi < 48in)
     c) Color is in the allowed list (emerald, red, wine, burgundy, blue, navy, yellow, white, black, purple, gold)
     d) Style is NOT excluded (no strapless, corset, tube, cowl, florals, prints, beachy)
     e) Price is <= $100 (House of CB exempt)
     f) Available in size 0/XXS
   - REJECT any dress that fails ANY check
   - Start dev server: npm run dev &
   - Add via: curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d "{\"url\": \"<URL>\"}"

2. **Find and add shoes** (size 5 ONLY):
   - Web search for shoes on Princess Polly, Peppermayo, or House of CB
   - Verify size 5 is available on the product page before adding
   - Add at least 2 pairs

3. **Find and add accessories**:
   - Jewelry, bags, scarves from supported stores
   - At least 1 bag, 1 jewelry item

4. **Find and add tights**:
   - Try Wolford (scraper supports JSON-LD for Wolford)
   - At least 1 pair

5. **Bot bypass**: Use Shopify JSON API first. If blocked, add proper User-Agent headers. Add 2s delays between requests.

6. **Verify ALL products**: curl -I each product URL and first image URL.

7. Add any new image domains to next.config.ts remotePatterns.

8. Kill dev server. Run npm run build && npm run test && npm run test:e2e.'

ROUND4_PROMPT='You are autonomously improving the Virtual Fitting Room app. This is ROUND 4: More Catalog + Final Polish.

READ the CLAUDE.md file CAREFULLY for product constraints.

Your tasks:
1. **Add more products** following the SAME strict constraints as Round 3:
   - More dresses from stores not yet represented (try different Shopify stores)
   - More shoes (size 5 only)
   - More accessories
   - Same verification process (label + measurement match, color, style, price, size)

2. **Fix any remaining issues**:
   - Check all existing products still have working URLs
   - Fix any broken images or links
   - Ensure all categories are well-represented

3. **Final E2E verification**:
   - npm run dev &
   - Run full Playwright suite with screenshots
   - Verify every product renders in the grid
   - Verify outfit builder works with new products
   - Kill dev server

4. **Final build**: npm run build && npm run test && npm run test:e2e

This is the last round. Make sure everything is polished and working perfectly.'

# ============================================================
# MAIN LOOP
# ============================================================

log "=== VFR Autonomous Development Session Started ==="
log "Max duration: ${MAX_DURATION}s ($(( MAX_DURATION / 60 )) minutes)"

while [ $ROUND -le $MAX_ROUNDS ]; do
  REMAINING=$(remaining)

  if [ "$REMAINING" -le 180 ]; then
    log "Less than 3 minutes remaining. Stopping."
    break
  fi

  log "=== Starting Round $ROUND of $MAX_ROUNDS (${REMAINING}s remaining) ==="

  # Select prompt for this round
  case $ROUND in
    1) PROMPT="$ROUND1_PROMPT"; ROUND_NAME="Reference & UI Foundation" ;;
    2) PROMPT="$ROUND2_PROMPT"; ROUND_NAME="Latency & Polish" ;;
    3) PROMPT="$ROUND3_PROMPT"; ROUND_NAME="Full Catalog Expansion" ;;
    4) PROMPT="$ROUND4_PROMPT"; ROUND_NAME="More Catalog + Final Polish" ;;
  esac

  # Calculate timeouts: builder gets 60%, oracle gets 30%, buffer 10%
  ROUND_TIME=$(( REMAINING < 900 ? REMAINING : 900 ))
  BUILDER_TIMEOUT=$(( ROUND_TIME * 60 / 100 ))
  ORACLE_TIMEOUT=$(( ROUND_TIME * 30 / 100 ))

  log "Round $ROUND: $ROUND_NAME"
  log "  Builder timeout: ${BUILDER_TIMEOUT}s, Oracle timeout: ${ORACLE_TIMEOUT}s"

  # Run builder
  run_builder "$PROMPT" "$BUILDER_TIMEOUT"

  # Commit builder work
  commit_and_push "$ROUND_NAME - builder"

  # Run oracle reviewer
  REMAINING=$(remaining)
  if [ "$REMAINING" -gt 180 ]; then
    run_oracle "$ROUND_NAME" "$ORACLE_TIMEOUT"
    # Commit oracle fixes
    commit_and_push "$ROUND_NAME - oracle review"
  else
    log "  [ORACLE] Skipped — not enough time remaining"
  fi

  ROUND=$((ROUND + 1))
  log "=== Round complete ==="
done

# ============================================================
# FINAL SUMMARY
# ============================================================
TOTAL_ELAPSED=$(elapsed)
log ""
log "=========================================="
log "VFR Autonomous Development Session Complete"
log "=========================================="
log "Rounds completed: $((ROUND - 1)) of $MAX_ROUNDS"
log "Total time: ${TOTAL_ELAPSED}s ($(( TOTAL_ELAPSED / 60 )) minutes)"
log "Log file: $LOG_FILE"
log ""
log "Check commits: git log --oneline -20"
log "=========================================="
