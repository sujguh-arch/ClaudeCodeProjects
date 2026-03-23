import { readFileSync, writeFileSync } from 'fs';

const products = JSON.parse(readFileSync('data/products.json', 'utf8'));
console.log(`Loaded ${products.length} products\n`);

const VALID_CATEGORIES = ['dress', 'shoes', 'tights', 'bag', 'accessories', 'other'];
const ALLOWED_COLORS = ['emerald', 'red', 'wine', 'burgundy', 'blue', 'navy', 'yellow', 'white', 'black', 'purple', 'gold'];
const EXCLUDED_COLORS = ['hot pink', 'beige', 'nude', 'tan', 'olive', 'moss', 'khaki', 'gray'];
const EXCLUDED_STYLES = ['strapless', 'corset', 'tube top', 'cowl neck', 'floral', 'print', 'beachy'];

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Check URL with timeout
async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return res.status >= 200 && res.status < 400;
  } catch (e) {
    clearTimeout(timeout);
    // Try GET if HEAD fails
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 10000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller2.signal,
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      });
      clearTimeout(timeout2);
      return res.status >= 200 && res.status < 400;
    } catch (e2) {
      clearTimeout(timeout2);
      return false;
    }
  }
}

// Extract color from title
function extractColor(title) {
  const lower = title.toLowerCase();
  for (const c of EXCLUDED_COLORS) {
    if (lower.includes(c)) return { color: c, excluded: true };
  }
  for (const c of ALLOWED_COLORS) {
    if (lower.includes(c)) return { color: c, excluded: false };
  }
  return { color: 'unknown', excluded: false };
}

// Check for excluded styles in title
function hasExcludedStyle(title) {
  const lower = title.toLowerCase();
  for (const s of EXCLUDED_STYLES) {
    if (lower.includes(s)) return s;
  }
  return null;
}

// Is House of CB?
function isHouseOfCB(product) {
  return product.url.includes('houseofcb.com') || (product.store && product.store.toLowerCase().includes('house of cb'));
}

const results = { passed: [], failed: [] };
const seenUrls = new Set();
const storeStats = {};

// Process in batches to avoid too many concurrent requests
const BATCH_SIZE = 15;
const DELAY_MS = 500;

for (let i = 0; i < products.length; i += BATCH_SIZE) {
  const batch = products.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(batch.map(async (product) => {
    const reasons = [];
    const store = (() => {
      try { return new URL(product.url).hostname; } catch { return 'unknown'; }
    })();

    if (!storeStats[store]) storeStats[store] = { total: 0, passed: 0, failed: 0, reasons: {} };
    storeStats[store].total++;

    // 1. Duplicate URL check
    if (seenUrls.has(product.url)) {
      reasons.push('duplicate URL');
    }
    seenUrls.add(product.url);

    // 2. Has at least 1 image
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      reasons.push('no images');
    }

    // 3. Price is a number > 0
    if (typeof product.price !== 'number' || product.price <= 0) {
      reasons.push(`invalid price: ${product.price}`);
    }

    // 4. Valid category
    if (!VALID_CATEGORIES.includes(product.category)) {
      reasons.push(`invalid category: ${product.category}`);
    }

    // 5. Dress-specific constraints
    if (product.category === 'dress') {
      const { color, excluded } = extractColor(product.title);
      if (excluded) {
        reasons.push(`excluded color: ${color}`);
      }
      const excludedStyle = hasExcludedStyle(product.title);
      if (excludedStyle) {
        reasons.push(`excluded style: ${excludedStyle}`);
      }
      if (product.price > 100 && !isHouseOfCB(product)) {
        reasons.push(`price $${product.price} > $100 (non-HouseOfCB)`);
      }
    }

    // 6. URL resolves
    const urlOk = await checkUrl(product.url);
    if (!urlOk) {
      reasons.push('URL not reachable');
    }

    if (reasons.length === 0) {
      storeStats[store].passed++;
      return { product, pass: true };
    } else {
      storeStats[store].failed++;
      for (const r of reasons) {
        storeStats[store].reasons[r] = (storeStats[store].reasons[r] || 0) + 1;
      }
      console.log(`FAIL: ${product.title} (${store})`);
      reasons.forEach(r => console.log(`  - ${r}`));
      return { product, pass: false, reasons };
    }
  }));

  for (const r of batchResults) {
    if (r.pass) results.passed.push(r.product);
    else results.failed.push({ title: r.product.title, url: r.product.url, reasons: r.reasons });
  }

  // Progress
  const done = Math.min(i + BATCH_SIZE, products.length);
  process.stdout.write(`\rProgress: ${done}/${products.length}`);

  if (i + BATCH_SIZE < products.length) {
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

console.log('\n\n=== VALIDATION REPORT ===\n');
console.log(`Total: ${products.length}`);
console.log(`Passed: ${results.passed.length}`);
console.log(`Failed: ${results.failed.length}`);
console.log(`Removed: ${results.failed.length}`);

console.log('\n--- Per Store ---');
for (const [store, stats] of Object.entries(storeStats).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`\n${store}: ${stats.passed}/${stats.total} passed, ${stats.failed} removed`);
  if (Object.keys(stats.reasons).length > 0) {
    for (const [reason, count] of Object.entries(stats.reasons)) {
      console.log(`  - ${reason}: ${count}`);
    }
  }
}

console.log(`\n--- Failed Products ---`);
for (const f of results.failed) {
  console.log(`  ${f.title}: ${f.reasons.join(', ')}`);
}

// Save cleaned products
if (results.failed.length > 0) {
  writeFileSync('data/products.json', JSON.stringify(results.passed, null, 2) + '\n');
  console.log(`\nSaved cleaned products.json with ${results.passed.length} products`);
} else {
  console.log('\nNo products removed, products.json unchanged');
}

console.log(`\nFinal product count: ${results.passed.length}`);
