#!/usr/bin/env bash
set -uo pipefail

REPO_ROOT="/workspaces/ClaudeCodeProjects"
VFR_DIR="$REPO_ROOT/virtual-fitting-room"
LOG_FILE="/tmp/vfr-sprint.log"

cd "$VFR_DIR"
git -C "$REPO_ROOT" config commit.gpgsign false

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

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

log "=== FINAL SPRINT: Fix core issues + verify URLs with Playwright + demo video ==="

# ============================================================
# STEP 1: Fix generation pipeline (timeout + dedup) + bundle size
# ============================================================
log "--- Step 1: Fix generation pipeline + bundle size ---"
timeout 900s claude \
  --print \
  --dangerously-skip-permissions \
  --max-turns 30 \
  'READ CLAUDE.md first. You have 3 focused tasks:

## Task 1: Fix generation pipeline (src/lib/generate.ts)
- Add proper timeout handling: use AbortSignal.timeout() or a Promise.race with a 60-second timeout per generation
- Add dedup protection: before generating, check if a rendering already exists for this product+image combo and skip if so
- Add retry logic with backoff for Replicate 429 errors (max 2 retries)

## Task 2: Add timeout to scraper (src/lib/scraper.ts)
- Add AbortSignal.timeout(10000) to all fetch calls (10 second timeout)
- Ensure the fallback chain still works with timeouts

## Task 3: Reduce bundle size
- page.tsx is 900 lines. Extract these into separate component files:
  - SkeletonGrid component → src/components/SkeletonGrid.tsx
  - Empty state components → src/components/EmptyState.tsx
  - Product input/add section → src/components/ProductInput.tsx
- Use dynamic imports with next/dynamic for MotionLightbox (already done? verify)
- Check if any large dependencies can be tree-shaken

After all changes:
- npm run build (check bundle size went down)
- npm run test
- Fix any failures

Do NOT touch data/products.json. Focus only on code quality.' \
  2>&1 | tee -a "$LOG_FILE" || log "Step 1 had issues"
commit_and_push "Fix generation timeout+dedup, scraper timeout, reduce bundle"

# ============================================================
# STEP 2: Verify ALL product URLs with Playwright headless browser
# ============================================================
log "--- Step 2: Verify product URLs with Playwright browser ---"
timeout 600s claude \
  --print \
  --dangerously-skip-permissions \
  --max-turns 25 \
  'READ CLAUDE.md first. The eval gate has been catching broken URLs, but curl gets blocked by bot protection. Use Playwright headless browser to verify URLs instead.

Create a script: scripts/verify-urls.ts (TypeScript, runs with npx tsx)

```typescript
// For each product in data/products.json:
// 1. Open the product URL in Playwright headless Chromium
// 2. Wait for page load (networkidle or 10s timeout)
// 3. Check if page has product content (not a 404 or bot block page)
// 4. Check if the first product image URL loads (navigate to it)
// 5. Log PASS/FAIL for each product
// 6. Remove products that truly fail (404, domain not found) from products.json
// 7. Keep products that load in browser even if curl returned 403
```

Install tsx if needed: npm install -D tsx
Run it: npx tsx scripts/verify-urls.ts
Then: npm run build && npm run test

IMPORTANT: Some stores show interstitials or age gates — if the page loads at all (even with a gate), count it as PASS. Only remove products where the page truly does not exist (404, domain error, timeout after 15s).' \
  2>&1 | tee -a "$LOG_FILE" || log "Step 2 had issues"
commit_and_push "Verify all product URLs with Playwright browser"

# ============================================================
# STEP 3: Record demo video
# ============================================================
log "--- Step 3: Record demo video ---"
timeout 600s claude \
  --print \
  --dangerously-skip-permissions \
  --max-turns 25 \
  'Create a Playwright test that RECORDS A VIDEO of the full app for a "Sexy Date Night in SF" shopping experience.

Create file: e2e/demo-video.spec.ts

The test config should enable video:
```
test.use({
  video: { mode: "on", size: { width: 393, height: 852 } },
  viewport: { width: 393, height: 852 },
});
```

Walk through this flow with natural pauses:
1. Home page — outfits tab (pause 2s)
2. Switch to closet tab (pause 2s)
3. Scroll slowly through the product grid (pause 1s between scrolls)
4. Click on a sexy dress (black or red if available) (pause 1s)
5. Swipe through lightbox images (pause 1.5s each)
6. Close lightbox (pause 1s)
7. Click Shop button on a product (pause 1s, navigate back)
8. Switch to outfits tab (pause 1s)
9. Click New Outfit or existing outfit (pause 2s)
10. Show outfit builder page (pause 2s)
11. Go back home (pause 1s)
12. Click through category filters: shoes, accessories, bags, tights (1.5s each)
13. End on full closet view (pause 3s)

Bypass AuthGate in beforeEach.
Run ONLY this test: npx playwright test e2e/demo-video.spec.ts
Verify the .webm video file exists in test-results/ directory.
Copy the video to a memorable path: cp test-results/.../*.webm ./demo-date-night.webm' \
  2>&1 | tee -a "$LOG_FILE" || log "Step 3 had issues"
commit_and_push "Add date night demo video"

# ============================================================
# STEP 4: Final eval gate + polish
# ============================================================
log "--- Step 4: Final eval gate ---"
if [ -f eval-gate.sh ]; then
  bash eval-gate.sh "Final Sprint" 2>&1 | tee -a "$LOG_FILE" || true
fi

# Final fixes if needed
VERDICT=$(grep "VERDICT" /tmp/eval-gate-report.txt 2>/dev/null || echo "unknown")
if echo "$VERDICT" | grep -q "FAIL"; then
  log "Final eval has failures — running last auto-fix..."
  timeout 300s claude \
    --print \
    --dangerously-skip-permissions \
    --max-turns 15 \
    "READ /tmp/eval-gate-report.txt and /tmp/eval-lessons.md. Fix ALL remaining failures. You are empowered to remove bad products, fix code, install packages. This is the LAST chance before the user sees the app. Make it perfect." \
    2>&1 | tee -a "$LOG_FILE" || log "Final fix had issues"
  commit_and_push "Final sprint fixes"
fi

# ============================================================
# DONE
# ============================================================
log ""
log "=========================================="
log "FINAL SPRINT COMPLETE"
log "=========================================="
log ""
cd "$REPO_ROOT"
log "Latest commits:"
git log --oneline -10 | tee -a "$LOG_FILE"
log ""
log "Product count:"
node -e "const p=require('$VFR_DIR/data/products.json'); const c={}; p.forEach(x=>c[x.category]=(c[x.category]||0)+1); console.log('Total:',p.length); Object.entries(c).forEach(([k,v])=>console.log(' ',k+':',v))" 2>/dev/null | tee -a "$LOG_FILE"
log ""
log "Demo video:"
ls -la "$VFR_DIR/demo-date-night.webm" 2>/dev/null || ls -la "$VFR_DIR/test-results/"*/*.webm 2>/dev/null || echo "No video found"
log "=========================================="
echo "SPRINT_DONE" > /tmp/vfr-sprint-status.txt
