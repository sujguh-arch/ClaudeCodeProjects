#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/workspaces/ClaudeCodeProjects"
VFR_DIR="$REPO_ROOT/virtual-fitting-room"
LOG_FILE="/tmp/vfr-deep-tests.log"

cd "$VFR_DIR"
git -C "$REPO_ROOT" config commit.gpgsign false

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Deep Test Enhancement Session ==="

# Phase 1: Create comprehensive E2E test suite (NO generation credits used)
DEEP_TEST_PROMPT='You are enhancing the Virtual Fitting Room test suite. READ CLAUDE.md first.

BUDGET CONSTRAINT: User has only $14 in Replicate generation credits (~280 generations at ~$0.05 each). ALL automated tests MUST mock Replicate. Never call the real Replicate API in tests.

Create a comprehensive deep test suite. Create these NEW test files:

## 1. e2e/deep-product-flow.spec.ts
Full interaction flow tests:
- Add a product via the input field → verify it appears in the grid
- Add the SAME product URL again → verify dedup rejection (no duplicate)
- Click a product card → verify lightbox opens with correct images
- Navigate between lightbox images → verify swipe/arrow navigation works
- Click "Shop" button → verify it opens the correct external URL (intercept navigation)
- Filter by category pills → verify correct products shown/hidden
- Add product with missing images → verify graceful fallback
- Add product with very long title → verify truncation, no layout break
- Add product with $0 price → verify display handles it
- Add product with special characters in title → verify no XSS or rendering issues

## 2. e2e/deep-outfit-flow.spec.ts
Full outfit builder flow:
- Create new outfit → verify it appears in outfits tab
- Add dress to outfit slot → verify it shows in the builder
- Add shoes to outfit → verify correct slot
- Add multiple accessories → verify array behavior
- Remove item from outfit → verify slot clears
- Rename outfit → verify name updates
- Delete outfit → verify removal
- Create outfit with items from every category → verify all slots populated

## 3. e2e/deep-constraint-validation.spec.ts
Product constraint enforcement:
- Read data/products.json directly
- For every dress: assert price <= $100 (or store is "House of CB")
- For every dress: assert color is in allowed list
- For every dress: assert no excluded style keywords in title
- For every product: HTTP HEAD request to product URL, assert 200 or 301
- For every product: HTTP HEAD request to first image URL, assert loads
- Assert no duplicate product URLs in catalog
- Assert every product has at least 1 image
- Assert every product has a non-empty title and valid price

## 4. e2e/deep-performance.spec.ts
Performance and latency measurement:
- Measure page load time (DOMContentLoaded → interactive) → assert < 3s
- Measure time to render product grid after tab switch → assert < 500ms
- Measure lightbox open animation → assert < 300ms
- Measure image lazy loading (below-fold images should not load until scroll)
- Check for layout shift (CLS) → take screenshot before and after images load
- Verify no console errors on any page
- Verify no 404s for any asset (listen for failed requests)
- Measure total JS bundle size via page.coverage → warn if > 300KB

## 5. e2e/deep-ui-edge-cases.spec.ts
UI weirdness and edge cases:
- Empty state: no products → verify empty state renders with CTA
- Empty state: no outfits → verify empty state renders correctly
- Rapid tab switching (click closet/outfits 10 times fast) → no crash, no stale state
- Scroll to bottom of long product list → verify all cards rendered
- Mobile viewport (393x852) → verify no horizontal overflow
- Desktop viewport (1440x900) → verify grid layout correct
- Resize window from mobile to desktop → verify responsive transition
- Network offline simulation → verify graceful error handling
- Slow network (3G throttle) → verify loading skeletons appear
- Back/forward browser navigation → verify correct page state

## 6. src/__tests__/deep-scraper.test.ts (vitest, not playwright)
Scraper edge cases:
- Shopify URL with invalid handle → graceful error
- Non-Shopify URL with no JSON-LD → falls back to OG tags
- URL that returns 403 (bot blocked) → graceful error message
- URL that returns 500 → graceful error
- URL with redirect chain → follows redirects
- Timeout handling → does not hang forever
- Dedup: POST same URL twice to /api/products → second returns error/409

## 7. src/__tests__/deep-generation.test.ts (vitest with MSW mocks)
Generation flow (ALL MOCKED, zero Replicate credits):
- Mock Replicate API → verify generation request format is correct
- Mock successful generation → verify rendering status updated to "done"
- Mock Replicate timeout → verify status set to "error"
- Mock Replicate 429 rate limit → verify retry or graceful failure
- Verify dedup: same product+image combo → should not re-generate
- Verify batch processing: multiple images → queued correctly
- Measure mock generation latency tracking accuracy

IMPORTANT:
- All E2E tests must bypass AuthGate (set localStorage mirror_pin + sessionStorage mirror_session in beforeEach)
- Use page.route() to mock/intercept external API calls where needed
- Use expect.soft() for non-critical assertions so tests continue
- Take screenshots at key assertion points (saved to test-results/)
- Run npm run build after creating tests
- Run npm run test to verify unit tests
- Run npm run test:e2e to verify E2E tests
- Fix any failures before finishing'

log "Starting deep test creation..."
timeout 900s claude \
  --print \
  --dangerously-skip-permissions \
  --max-turns 40 \
  "$DEEP_TEST_PROMPT" \
  2>&1 | tee -a "$LOG_FILE" || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      log "Timed out after 900s"
    else
      log "Exited with code $EXIT_CODE"
    fi
  }

# Commit and push
cd "$REPO_ROOT"
git add -A
if git diff --cached --quiet; then
  log "No changes to commit"
else
  git commit -m "Add comprehensive deep test suite — dedup, latency, edge cases, constraints

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
  git pull --rebase origin main || true
  git push origin main
  log "Deep tests committed and pushed"
fi

log "=== Deep Test Enhancement Complete ==="
