#!/usr/bin/env bash
# Deterministic quality gate — runs concrete checks, no LLM judgment needed
# Exit code 0 = PASS, non-zero = FAIL with details
set -uo pipefail

VFR_DIR="/workspaces/ClaudeCodeProjects/virtual-fitting-room"
cd "$VFR_DIR"
REPORT="/tmp/eval-gate-report.txt"
FAILURES=0

log() { echo "$*" | tee -a "$REPORT"; }
fail() { log "FAIL: $*"; FAILURES=$((FAILURES + 1)); }
pass() { log "PASS: $*"; }

echo "" > "$REPORT"
log "=========================================="
log "EVAL GATE REPORT - $(date '+%Y-%m-%d %H:%M:%S')"
log "=========================================="

# ============================================================
# 1. BUILD CHECK
# ============================================================
log ""
log "--- 1. Build Check ---"
if npm run build > /tmp/eval-build.log 2>&1; then
  pass "npm run build succeeded"
else
  fail "npm run build FAILED"
  tail -20 /tmp/eval-build.log | tee -a "$REPORT"
fi

# ============================================================
# 2. UNIT TESTS
# ============================================================
log ""
log "--- 2. Unit Tests ---"
if npm run test > /tmp/eval-unit.log 2>&1; then
  UNIT_COUNT=$(grep -oP '\d+ tests' /tmp/eval-unit.log | head -1 || echo "unknown")
  pass "Unit tests passed ($UNIT_COUNT)"
else
  fail "Unit tests FAILED"
  tail -20 /tmp/eval-unit.log | tee -a "$REPORT"
fi

# ============================================================
# 3. E2E TESTS
# ============================================================
log ""
log "--- 3. E2E Tests ---"
if npm run test:e2e > /tmp/eval-e2e.log 2>&1; then
  E2E_COUNT=$(grep -oP '\d+ passed' /tmp/eval-e2e.log | head -1 || echo "unknown")
  pass "E2E tests passed ($E2E_COUNT)"
else
  fail "E2E tests FAILED"
  tail -30 /tmp/eval-e2e.log | tee -a "$REPORT"
fi

# ============================================================
# 4. PRODUCT CONSTRAINT VALIDATION
# ============================================================
log ""
log "--- 4. Product Constraints ---"
PRODUCTS_FILE="$VFR_DIR/data/products.json"
if [ ! -f "$PRODUCTS_FILE" ]; then
  fail "products.json not found"
else
  # Check for duplicates
  TOTAL=$(node -e "const p=require('$PRODUCTS_FILE'); console.log(p.length)")
  UNIQUE_URLS=$(node -e "const p=require('$PRODUCTS_FILE'); console.log(new Set(p.map(x=>x.url)).size)")
  if [ "$TOTAL" != "$UNIQUE_URLS" ]; then
    fail "Duplicate URLs found: $TOTAL products but only $UNIQUE_URLS unique URLs"
  else
    pass "No duplicate URLs ($TOTAL products)"
  fi

  # Check each product has required fields
  MISSING_FIELDS=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const bad=p.filter(x=>!x.title||!x.url||!x.images||x.images.length===0);
    if(bad.length) console.log(bad.map(x=>x.title||x.url).join(', '));
    else console.log('NONE');
  ")
  if [ "$MISSING_FIELDS" != "NONE" ]; then
    fail "Products missing title/url/images: $MISSING_FIELDS"
  else
    pass "All products have title, url, and images"
  fi

  # Check dress prices
  PRICE_VIOLATIONS=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const bad=p.filter(x=>x.category==='dress'&&x.price>100&&!x.store?.toLowerCase().includes('house of cb'));
    if(bad.length) console.log(bad.map(x=>x.title+' (\$'+x.price+')').join(', '));
    else console.log('NONE');
  ")
  if [ "$PRICE_VIOLATIONS" != "NONE" ]; then
    fail "Dresses over \$100 (non-HouseOfCB): $PRICE_VIOLATIONS"
  else
    pass "All dress prices within budget"
  fi

  # Check dress colors
  COLOR_VIOLATIONS=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const allowed=['emerald','red','wine','burgundy','blue','navy','yellow','white','black','purple','gold'];
    const excluded=['hot pink','beige','nude','tan','olive','moss','khaki','gray','grey'];
    const bad=p.filter(x=>{
      if(x.category!=='dress') return false;
      const t=(x.title||'').toLowerCase();
      return excluded.some(c=>t.includes(c));
    });
    if(bad.length) console.log(bad.map(x=>x.title).join(', '));
    else console.log('NONE');
  ")
  if [ "$COLOR_VIOLATIONS" != "NONE" ]; then
    fail "Dresses with excluded colors: $COLOR_VIOLATIONS"
  else
    pass "No excluded color violations"
  fi

  # Check dress style exclusions
  STYLE_VIOLATIONS=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const excluded=['strapless','corset','tube','cowl','floral','print','beachy','tropical'];
    const bad=p.filter(x=>{
      if(x.category!=='dress') return false;
      const t=(x.title||'').toLowerCase();
      return excluded.some(s=>t.includes(s));
    });
    if(bad.length) console.log(bad.map(x=>x.title).join(', '));
    else console.log('NONE');
  ")
  if [ "$STYLE_VIOLATIONS" != "NONE" ]; then
    fail "Dresses with excluded styles: $STYLE_VIOLATIONS"
  else
    pass "No excluded style violations"
  fi
fi

# ============================================================
# 5. URL VERIFICATION (sample 5 products)
# ============================================================
log ""
log "--- 5. URL Verification (sample) ---"
URL_FAILURES=0
URLS=$(node -e "const p=require('$PRODUCTS_FILE'); p.slice(0,5).forEach(x=>console.log(x.url))")
while IFS= read -r url; do
  if [ -z "$url" ]; then continue; fi
  STATUS=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 -L "$url" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
    pass "URL OK ($STATUS): $(echo $url | cut -c1-60)..."
  else
    fail "URL BROKEN ($STATUS): $url"
    URL_FAILURES=$((URL_FAILURES + 1))
  fi
done <<< "$URLS"

# ============================================================
# 6. IMAGE VERIFICATION (sample 5 products)
# ============================================================
log ""
log "--- 6. Image Verification (sample) ---"
IMG_URLS=$(node -e "const p=require('$PRODUCTS_FILE'); p.slice(0,5).forEach(x=>{if(x.images&&x.images[0])console.log(x.images[0])})")
while IFS= read -r img; do
  if [ -z "$img" ]; then continue; fi
  STATUS=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 -L "$img" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    pass "Image OK: $(echo $img | cut -c1-60)..."
  else
    fail "Image BROKEN ($STATUS): $img"
  fi
done <<< "$IMG_URLS"

# ============================================================
# 7. CONSOLE ERROR CHECK (start dev server, load page)
# ============================================================
log ""
log "--- 7. Console Error Check ---"
npm run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 5
CONSOLE_ERRORS=$(timeout 15 node -e "
  const http = require('http');
  http.get('http://localhost:3000', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) console.log('OK');
      else console.log('HTTP ' + res.statusCode);
    });
  }).on('error', (e) => console.log('ERROR: ' + e.message));
" 2>/dev/null || echo "TIMEOUT")
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true
if [ "$CONSOLE_ERRORS" = "OK" ]; then
  pass "Dev server responds 200"
else
  fail "Dev server issue: $CONSOLE_ERRORS"
fi

# ============================================================
# SUMMARY
# ============================================================
log ""
log "=========================================="
if [ $FAILURES -eq 0 ]; then
  log "RESULT: ALL CHECKS PASSED"
else
  log "RESULT: $FAILURES FAILURES DETECTED"
fi
log "=========================================="

exit $FAILURES
