# Virtual Fitting Room - Autonomous Development Context

## Architecture
- **Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **AI**: Replicate API for face-swap generation (google/nano-banana-pro model)
- **Data**: JSON files in data/ directory (products.json, renderings.json, outfits.json, settings.json)
- **Scraper**: Supports Shopify (/products/HANDLE.json), JSON-LD structured data, OG meta tags
- **Design**: Dark theme, gold accent (#D4AF61), Inter Tight + DM Serif Display fonts
- **Aesthetic**: Glossier/Aritzia vibes, warm tones, mobile-first, luxury feel

## Key Files
- `src/app/page.tsx` - Main page (closet + outfits tabs)
- `src/app/outfit/[id]/page.tsx` - Outfit builder page
- `src/app/globals.css` - Design tokens and base styles
- `src/lib/scraper.ts` - Product scraping (Shopify + JSON-LD + OG)
- `src/lib/db.ts` - JSON file database layer
- `src/lib/generate.ts` - Replicate AI generation
- `src/components/` - MotionLightbox, ProductCard, AddProductModal, AuthGate, Toast
- `data/products.json` - Product catalog
- `next.config.ts` - Image remote patterns
- `e2e/` - Playwright E2E tests
- `playwright.config.ts` - Playwright config

## Commands
- `npm run dev` - Start dev server (port 3000)
- `npm run build` - Production build
- `npm run test` - Unit tests (vitest)
- `npm run test:e2e` - Playwright E2E tests
- `npm run test:all` - All tests

## Product Categories
dress, shoes, tights, bag, accessories, other

## STRICT Product Constraints — DO NOT VIOLATE

### Dresses
- **Length categories must match BOTH the source label AND actual measurement:**
  - Mini: product page explicitly says "mini" AND garment length < 26 inches
  - Midi: product page explicitly says "midi" AND garment length < 38 inches
  - Maxi: product page explicitly says "maxi" AND garment length < 48 inches
  - REJECT any dress where label and measurement disagree (e.g., labeled "mini" but 31 inches = REJECTED)
- **Stores with garment length data:** Princess Polly, Peppermayo, Oh Polly, House of CB
- **Style exclusions:** NO strapless, corset, tube top, cowl neck, NO florals/prints, NO beachy
- **Colors allowed:** emerald, red, wine, burgundy, blue, navy, yellow, white, black, purple, gold
- **Colors excluded:** hot pink, beige, nude, tan, olive, moss, khaki, gray
- **Budget:** $100 max (House of CB exempt from price limit)
- **Size:** 0 / XXS only, petite (5'0"–5'3")

### Shoes
- **Size 5 ONLY** — verify size 5 availability before adding any shoe

### Accessories / Tights / Bags
- Must be from real product pages with working links
- No specific size constraints

## Bot Bypass Strategy
1. Always try Shopify JSON API first (`/products/{handle}.json`) — no bot protection
2. Use proper User-Agent header: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`
3. Add 1-3 second random delays between requests
4. Fall back to JSON-LD + OG meta extraction
5. If blocked, try alternate product URLs from the same store

## Supported Image Domains (in next.config.ts)
cdn.shopify.com, *.cloudfront.net, replicate.delivery, *.wolford.com, *.nordstrom.com, *.farfetch.com, *.mytheresa.com, *.ssense.com, *.net-a-porter.com, *.asos.com, *.zara.com

## Design Conventions
- Use CSS custom properties (var(--...)) not raw values
- Use framer-motion for animations
- Mobile-first, touch-optimized (44px min hit targets)
- No emojis in UI text
- Safe area insets for notched devices

## DO NOT
- Modify data/settings.json (contains API keys)
- Break the existing scraper
- Remove existing products from products.json
- Change data file paths in db.ts
- Add products that violate the constraints above
- Ship without running E2E tests
