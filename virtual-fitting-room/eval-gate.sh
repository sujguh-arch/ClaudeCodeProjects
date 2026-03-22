#!/usr/bin/env bash
# Eval Gate v2 — Atris Labs-inspired 3-stage validation with self-improvement
# Stage 1: Automated Testing (build, unit, E2E)
# Stage 2: Reference Verification (constraints, URLs, images, data integrity)
# Stage 3: Architecture & Flow Validation (app flows, latency, UI quality, anti-slop)
# + Lessons Learned: appends to /tmp/eval-lessons.md after each run
set -uo pipefail

VFR_DIR="/workspaces/ClaudeCodeProjects/virtual-fitting-room"
cd "$VFR_DIR"
REPORT="/tmp/eval-gate-report.txt"
LESSONS="/tmp/eval-lessons.md"
BENCHMARKS="/tmp/eval-benchmarks.json"
FAILURES=0
WARNINGS=0
STEP_NAME="${1:-unnamed}"

log() { echo "$*" | tee -a "$REPORT"; }
fail() { log "  FAIL: $*"; FAILURES=$((FAILURES + 1)); }
warn() { log "  WARN: $*"; WARNINGS=$((WARNINGS + 1)); }
pass() { log "  PASS: $*"; }

echo "" > "$REPORT"
log "=========================================="
log "EVAL GATE v2 — Step: $STEP_NAME"
log "$(date '+%Y-%m-%d %H:%M:%S')"
log "=========================================="

PRODUCTS_FILE="$VFR_DIR/data/products.json"

# ============================================================
# STAGE 1: AUTOMATED TESTING (Atris Validator Stage 1)
# ============================================================
log ""
log "=== STAGE 1: Automated Testing ==="

# 1a. Build
log "--- 1a. Build ---"
BUILD_START=$(date +%s%N)
if npm run build > /tmp/eval-build.log 2>&1; then
  BUILD_MS=$(( ($(date +%s%N) - BUILD_START) / 1000000 ))
  pass "Build succeeded (${BUILD_MS}ms)"
  # Check for TypeScript warnings
  TS_WARNINGS=$(grep -c "warning" /tmp/eval-build.log 2>/dev/null || echo "0")
  if [ "$TS_WARNINGS" -gt 0 ]; then
    warn "Build has $TS_WARNINGS TypeScript warnings"
  fi
else
  BUILD_MS=$(( ($(date +%s%N) - BUILD_START) / 1000000 ))
  fail "Build FAILED (${BUILD_MS}ms)"
  tail -20 /tmp/eval-build.log | tee -a "$REPORT"
fi

# 1b. Unit tests
log "--- 1b. Unit Tests ---"
if npm run test > /tmp/eval-unit.log 2>&1; then
  UNIT_COUNT=$(grep -oP '\d+ tests' /tmp/eval-unit.log | head -1 || echo "unknown")
  pass "Unit tests passed ($UNIT_COUNT)"
else
  fail "Unit tests FAILED"
  tail -20 /tmp/eval-unit.log | tee -a "$REPORT"
fi

# 1c. E2E tests
log "--- 1c. E2E Tests ---"
if npm run test:e2e > /tmp/eval-e2e.log 2>&1; then
  E2E_COUNT=$(grep -oP '\d+ passed' /tmp/eval-e2e.log | head -1 || echo "unknown")
  pass "E2E tests passed ($E2E_COUNT)"
else
  fail "E2E tests FAILED"
  tail -30 /tmp/eval-e2e.log | tee -a "$REPORT"
fi

# ============================================================
# STAGE 2: REFERENCE VERIFICATION (Atris Validator Stage 2)
# ============================================================
log ""
log "=== STAGE 2: Reference Verification ==="

if [ -f "$PRODUCTS_FILE" ]; then
  # 2a. Data integrity
  log "--- 2a. Data Integrity ---"
  TOTAL=$(node -e "const p=require('$PRODUCTS_FILE'); console.log(p.length)")
  UNIQUE_URLS=$(node -e "const p=require('$PRODUCTS_FILE'); console.log(new Set(p.map(x=>x.url)).size)")
  log "  Catalog: $TOTAL products, $UNIQUE_URLS unique URLs"

  if [ "$TOTAL" != "$UNIQUE_URLS" ]; then
    fail "Duplicate URLs: $TOTAL products but $UNIQUE_URLS unique"
  else
    pass "No duplicate URLs"
  fi

  # Products with all required fields
  INTEGRITY=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const issues=[];
    p.forEach((x,i)=>{
      if(!x.title) issues.push('product['+i+']: missing title');
      if(!x.url) issues.push('product['+i+']: missing url');
      if(!x.images||x.images.length===0) issues.push((x.title||'product['+i+']')+': no images');
      if(x.price===undefined||x.price===null) issues.push((x.title||'product['+i+']')+': no price');
      if(!x.category) issues.push((x.title||'product['+i+']')+': no category');
      if(!x.store) issues.push((x.title||'product['+i+']')+': no store');
    });
    if(issues.length) console.log(issues.join('\\n'));
    else console.log('NONE');
  ")
  if [ "$INTEGRITY" != "NONE" ]; then
    fail "Data integrity issues:\n$INTEGRITY"
  else
    pass "All products have title, url, images, price, category, store"
  fi

  # 2b. Constraint enforcement
  log "--- 2b. Product Constraints ---"

  # Price
  PRICE_BAD=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const bad=p.filter(x=>x.category==='dress'&&x.price>100&&!(x.store||'').toLowerCase().includes('house of cb'));
    if(bad.length) console.log(bad.map(x=>x.title+' (\$'+x.price+' @ '+x.store+')').join('\\n'));
    else console.log('NONE');
  ")
  [ "$PRICE_BAD" != "NONE" ] && fail "Over-budget dresses:\n$PRICE_BAD" || pass "Dress prices OK"

  # Excluded colors
  COLOR_BAD=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const exc=['hot pink','beige','nude','tan','olive','moss','khaki','gray','grey','pink'];
    const bad=p.filter(x=>x.category==='dress'&&exc.some(c=>(x.title||'').toLowerCase().includes(c)));
    if(bad.length) console.log(bad.map(x=>x.title).join('\\n'));
    else console.log('NONE');
  ")
  [ "$COLOR_BAD" != "NONE" ] && fail "Excluded color dresses:\n$COLOR_BAD" || pass "Dress colors OK"

  # Excluded styles
  STYLE_BAD=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const exc=['strapless','corset','tube top','cowl','floral','print','beachy','tropical','hawaiian'];
    const bad=p.filter(x=>x.category==='dress'&&exc.some(s=>(x.title||'').toLowerCase().includes(s)));
    if(bad.length) console.log(bad.map(x=>x.title).join('\\n'));
    else console.log('NONE');
  ")
  [ "$STYLE_BAD" != "NONE" ] && fail "Excluded style dresses:\n$STYLE_BAD" || pass "Dress styles OK"

  # Category distribution
  log "--- 2c. Catalog Balance ---"
  CATS=$(node -e "
    const p=require('$PRODUCTS_FILE');
    const cats={};
    p.forEach(x=>{cats[x.category||'unknown']=(cats[x.category||'unknown']||0)+1});
    Object.entries(cats).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('  '+k+': '+v));
  ")
  log "$CATS"

  # Warn if missing categories
  for CAT in dress shoes tights bag accessories; do
    COUNT=$(node -e "const p=require('$PRODUCTS_FILE'); console.log(p.filter(x=>x.category==='$CAT').length)")
    if [ "$COUNT" = "0" ]; then
      warn "No products in category: $CAT"
    fi
  done

  # 2d. URL verification (ALL products, not just sample)
  log "--- 2d. URL Verification (all products) ---"
  URL_RESULTS=$(node -e "
    const p=require('$PRODUCTS_FILE');
    p.forEach(x=>console.log(x.url));
  ")
  URL_OK=0
  URL_BAD=0
  while IFS= read -r url; do
    [ -z "$url" ] && continue
    STATUS=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 -L \
      -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
      "$url" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
      URL_OK=$((URL_OK + 1))
    else
      fail "URL ($STATUS): $url"
      URL_BAD=$((URL_BAD + 1))
    fi
  done <<< "$URL_RESULTS"
  log "  URLs: $URL_OK OK, $URL_BAD broken out of $TOTAL"

  # 2e. Image verification (ALL products, first image)
  log "--- 2e. Image Verification (all products) ---"
  IMG_OK=0
  IMG_BAD=0
  IMG_RESULTS=$(node -e "
    const p=require('$PRODUCTS_FILE');
    p.forEach(x=>{if(x.images&&x.images[0])console.log(x.images[0])});
  ")
  while IFS= read -r img; do
    [ -z "$img" ] && continue
    STATUS=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 10 -L "$img" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
      IMG_OK=$((IMG_OK + 1))
    else
      fail "Image ($STATUS): $(echo $img | cut -c1-80)"
      IMG_BAD=$((IMG_BAD + 1))
    fi
  done <<< "$IMG_RESULTS"
  log "  Images: $IMG_OK OK, $IMG_BAD broken"
else
  fail "products.json not found"
fi

# ============================================================
# STAGE 3: ARCHITECTURE & FLOW VALIDATION (Atris Validator Stage 3)
# ============================================================
log ""
log "=== STAGE 3: Architecture & Flow Validation ==="

# 3a. App flow — start dev server, test critical paths
log "--- 3a. App Flow Check ---"
npm run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 8  # Give Next.js time to compile

# Home page
HOME_START=$(date +%s%N)
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost:3000 2>/dev/null || echo "000")
HOME_MS=$(( ($(date +%s%N) - HOME_START) / 1000000 ))
[ "$HOME_STATUS" = "200" ] && pass "Home page: 200 (${HOME_MS}ms)" || fail "Home page: $HOME_STATUS"

# API routes
for ROUTE in "/api/products" "/api/outfits" "/api/settings"; do
  API_START=$(date +%s%N)
  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:3000${ROUTE}" 2>/dev/null || echo "000")
  API_MS=$(( ($(date +%s%N) - API_START) / 1000000 ))
  if [ "$API_STATUS" = "200" ]; then
    pass "API $ROUTE: 200 (${API_MS}ms)"
    if [ "$API_MS" -gt 2000 ]; then
      warn "API $ROUTE slow: ${API_MS}ms (>2000ms)"
    fi
  else
    fail "API $ROUTE: $API_STATUS"
  fi
done

# Product API returns valid JSON with products
PRODUCT_COUNT=$(curl -s --max-time 10 http://localhost:3000/api/products 2>/dev/null | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    try{console.log(JSON.parse(d).length)}catch(e){console.log('INVALID_JSON')}
  });
" 2>/dev/null || echo "ERROR")
if [ "$PRODUCT_COUNT" != "ERROR" ] && [ "$PRODUCT_COUNT" != "INVALID_JSON" ]; then
  pass "Products API returns $PRODUCT_COUNT products"
else
  fail "Products API returned invalid data: $PRODUCT_COUNT"
fi

# Settings page
SETTINGS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/settings 2>/dev/null || echo "000")
[ "$SETTINGS_STATUS" = "200" ] && pass "Settings page: 200" || fail "Settings page: $SETTINGS_STATUS"

kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true

# 3b. Latency benchmarks
log "--- 3b. Latency Benchmarks ---"
log "  Home page: ${HOME_MS}ms (target: <3000ms)"
[ "$HOME_MS" -gt 3000 ] && fail "Home page too slow: ${HOME_MS}ms" || pass "Home page latency OK"

# 3c. Bundle size check
log "--- 3c. Bundle Size ---"
if [ -d ".next" ]; then
  # Check total JS size
  BUNDLE_KB=$(find .next/static -name "*.js" -exec du -k {} + 2>/dev/null | awk '{sum+=$1}END{print sum}')
  log "  Total JS bundle: ${BUNDLE_KB}KB"
  if [ "${BUNDLE_KB:-0}" -gt 500 ]; then
    warn "JS bundle large: ${BUNDLE_KB}KB (>500KB)"
  else
    pass "JS bundle size OK (${BUNDLE_KB}KB)"
  fi
fi

# 3d. Anti-slop: check for common code quality issues
log "--- 3d. Anti-Slop Check ---"
# console.log left in production code
CONSOLE_LOGS=$(grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -v __tests__ | grep -v node_modules | wc -l)
if [ "$CONSOLE_LOGS" -gt 3 ]; then
  warn "Console.logs in $CONSOLE_LOGS source files (anti-slop: clean up)"
else
  pass "Minimal console.logs ($CONSOLE_LOGS files)"
fi

# TODO/FIXME/HACK comments
TODOS=$(grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v __tests__ | grep -v node_modules | wc -l)
if [ "$TODOS" -gt 0 ]; then
  warn "$TODOS TODO/FIXME/HACK comments found (anti-slop: resolve or remove)"
else
  pass "Zero TODO/FIXME/HACK comments"
fi

# Unused imports (simple check)
UNUSED=$(grep -rn "^import.*from" src/ --include="*.tsx" 2>/dev/null | grep -v __tests__ | wc -l)
log "  Total imports in components: $UNUSED (manual review recommended if > 50)"

# 3e. File size check (no bloated files)
log "--- 3e. File Size Check ---"
LARGE_FILES=$(find src/ -name "*.tsx" -o -name "*.ts" | xargs wc -l 2>/dev/null | sort -rn | head -5)
log "  Largest files (lines):"
echo "$LARGE_FILES" | head -4 | while read line; do log "    $line"; done
BIGGEST=$(echo "$LARGE_FILES" | head -1 | awk '{print $1}')
if [ "${BIGGEST:-0}" -gt 1000 ]; then
  warn "Largest file is ${BIGGEST} lines (consider splitting)"
fi

# 3f. Generation pipeline check (mock — no credits used)
log "--- 3f. Generation Pipeline Check ---"
GEN_FILE="$VFR_DIR/src/lib/generate.ts"
if [ -f "$GEN_FILE" ]; then
  # Check generate.ts has proper error handling
  HAS_TRY=$(grep -c "try" "$GEN_FILE" 2>/dev/null || echo "0")
  HAS_CATCH=$(grep -c "catch" "$GEN_FILE" 2>/dev/null || echo "0")
  HAS_TIMEOUT=$(grep -c "timeout\|maxDuration\|AbortSignal" "$GEN_FILE" 2>/dev/null || echo "0")
  if [ "$HAS_TRY" -gt 0 ] && [ "$HAS_CATCH" -gt 0 ]; then
    pass "Generation has error handling (try/catch)"
  else
    warn "Generation may lack error handling"
  fi
  if [ "$HAS_TIMEOUT" -gt 0 ]; then
    pass "Generation has timeout handling"
  else
    warn "Generation may lack timeout handling"
  fi

  # Check dedup logic exists
  HAS_DEDUP=$(grep -c "dedup\|existing\|already\|duplicate\|find(" "$GEN_FILE" 2>/dev/null || echo "0")
  if [ "$HAS_DEDUP" -gt 0 ]; then
    pass "Generation has dedup logic"
  else
    warn "Generation may lack dedup protection"
  fi
else
  warn "generate.ts not found"
fi

# 3g. Scraper robustness check
log "--- 3g. Scraper Robustness ---"
SCRAPER_FILE="$VFR_DIR/src/lib/scraper.ts"
if [ -f "$SCRAPER_FILE" ]; then
  HAS_FALLBACK=$(grep -c "fallback\|catch\|try" "$SCRAPER_FILE" 2>/dev/null || echo "0")
  HAS_USERAGENT=$(grep -ci "user-agent\|useragent" "$SCRAPER_FILE" 2>/dev/null || echo "0")
  HAS_TIMEOUT=$(grep -c "timeout\|AbortSignal\|signal" "$SCRAPER_FILE" 2>/dev/null || echo "0")
  [ "$HAS_FALLBACK" -gt 2 ] && pass "Scraper has fallback chain" || warn "Scraper may lack fallback chain"
  [ "$HAS_USERAGENT" -gt 0 ] && pass "Scraper sets User-Agent" || warn "Scraper missing User-Agent (bot risk)"
  [ "$HAS_TIMEOUT" -gt 0 ] && pass "Scraper has timeout" || warn "Scraper may lack timeout"
fi

# ============================================================
# BENCHMARKS: Save for trend tracking
# ============================================================
node -e "
  const b = {
    timestamp: new Date().toISOString(),
    step: '$STEP_NAME',
    buildMs: $BUILD_MS,
    homeMs: $HOME_MS,
    products: $(node -e "console.log(require('$PRODUCTS_FILE').length)" 2>/dev/null || echo 0),
    bundleKb: ${BUNDLE_KB:-0},
    failures: $FAILURES,
    warnings: $WARNINGS
  };
  const fs = require('fs');
  let benchmarks = [];
  try { benchmarks = JSON.parse(fs.readFileSync('$BENCHMARKS','utf8')); } catch(e) {}
  benchmarks.push(b);
  fs.writeFileSync('$BENCHMARKS', JSON.stringify(benchmarks, null, 2));
  console.log(JSON.stringify(b));
" 2>/dev/null || true

# ============================================================
# LESSONS LEARNED: Append insights from this run (Atris-style)
# ============================================================
log ""
log "--- Lessons Learned ---"
cat >> "$LESSONS" << LESSON

## Eval Gate Run: $STEP_NAME ($(date '+%Y-%m-%d %H:%M:%S'))
- Failures: $FAILURES | Warnings: $WARNINGS
- Products: $TOTAL | Build: ${BUILD_MS}ms | Home: ${HOME_MS}ms | Bundle: ${BUNDLE_KB:-?}KB
- URL broken: ${URL_BAD:-0} | Image broken: ${IMG_BAD:-0}
$([ $FAILURES -gt 0 ] && echo "- ACTION NEEDED: Fix $FAILURES failures before next step" || echo "- All checks passed")
---
LESSON
log "  Lessons appended to $LESSONS"

# ============================================================
# SUMMARY
# ============================================================
log ""
log "=========================================="
log "STEP: $STEP_NAME"
log "FAILURES: $FAILURES | WARNINGS: $WARNINGS"
if [ $FAILURES -eq 0 ]; then
  log "VERDICT: PASS"
else
  log "VERDICT: FAIL — $FAILURES issues must be fixed"
fi
log "=========================================="

exit $FAILURES
