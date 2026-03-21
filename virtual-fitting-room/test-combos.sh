#!/bin/bash
# ============================================================================
# Virtual Fitting Room - Comprehensive Scraping & Outfit Assembly Test
# ============================================================================
# Tests product scraping across 5 categories from diverse stores,
# then creates 10 outfits with different product combinations.
# ============================================================================

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

TOTAL_PRODUCTS=0
PASSED_PRODUCTS=0
FAILED_PRODUCTS=0
TOTAL_OUTFITS=0
PASSED_OUTFITS=0
FAILED_OUTFITS=0

# Arrays to store product IDs by category for outfit assembly
DRESS_IDS=()
SHOES_IDS=()
TIGHTS_IDS=()
BAG_IDS=()
ACCESSORIES_IDS=()

# Track failures for summary
FAILURES=()

# ============================================================================
# Helper functions
# ============================================================================

print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════${NC}"
}

print_subheader() {
  echo ""
  echo -e "${BOLD}  ── $1 ──${NC}"
}

pass() {
  echo -e "  ${GREEN}✓ PASS${NC} $1"
}

fail() {
  echo -e "  ${RED}✗ FAIL${NC} $1"
  FAILURES+=("$1")
}

warn() {
  echo -e "  ${YELLOW}⚠ WARN${NC} $1"
}

# Add a product via API and validate the response
# Usage: add_product "URL" "expected_category" "store_label"
# Returns: product ID via stdout (last line), or "FAILED"
add_product() {
  local url="$1"
  local expected_category="$2"
  local store_label="$3"

  TOTAL_PRODUCTS=$((TOTAL_PRODUCTS + 1))

  echo -e "  ${CYAN}→${NC} Adding: ${store_label}"
  echo -e "    URL: ${url}"

  # Call the API
  local response
  response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/products" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${url}\", \"category\": \"${expected_category}\"}" \
    --max-time 30 2>/dev/null)

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" != "200" ]]; then
    local error_msg
    error_msg=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','Unknown error'))" 2>/dev/null || echo "HTTP $http_code")
    fail "${store_label}: HTTP ${http_code} - ${error_msg}"
    FAILED_PRODUCTS=$((FAILED_PRODUCTS + 1))
    echo "FAILED"
    return 1
  fi

  # Parse response
  local title price store category image_count product_id
  title=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
  price=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('price','null'))" 2>/dev/null)
  store=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('store',''))" 2>/dev/null)
  category=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('category',''))" 2>/dev/null)
  image_count=$(echo "$body" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('images',[])))" 2>/dev/null)
  product_id=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

  # Validation checks
  local all_passed=true

  # Check title
  if [[ -z "$title" || "$title" == "Unknown Product" || "$title" == "None" ]]; then
    fail "${store_label}: Title is empty or 'Unknown Product'"
    all_passed=false
  else
    pass "${store_label}: Title = '${title}'"
  fi

  # Check images
  if [[ "$image_count" -lt 1 || "$image_count" == "0" ]]; then
    fail "${store_label}: No images found"
    all_passed=false
  else
    pass "${store_label}: ${image_count} image(s) found"
  fi

  # Check category
  if [[ "$category" == "$expected_category" ]]; then
    pass "${store_label}: Category = '${category}' (matches expected)"
  else
    warn "${store_label}: Category = '${category}' (expected '${expected_category}') - using override"
  fi

  # Price info (not a pass/fail, just info)
  if [[ "$price" != "null" && "$price" != "None" && -n "$price" ]]; then
    echo -e "    ${CYAN}Price: \$${price}${NC}"
  fi

  if $all_passed; then
    PASSED_PRODUCTS=$((PASSED_PRODUCTS + 1))
  else
    FAILED_PRODUCTS=$((FAILED_PRODUCTS + 1))
  fi

  echo "$product_id"
  return 0
}

# ============================================================================
# Pre-flight check
# ============================================================================

print_header "PRE-FLIGHT CHECK"

echo -n "  Checking server at ${BASE_URL}... "
health=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/products" --max-time 5 2>/dev/null)
if [[ "$health" == "200" ]]; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FAILED (HTTP ${health})${NC}"
  echo -e "${RED}Server is not running at ${BASE_URL}. Start it first!${NC}"
  exit 1
fi

# Clear existing products and outfits for a clean test
echo -n "  Clearing existing data... "
existing_products=$(curl -s "${BASE_URL}/api/products" 2>/dev/null)
existing_ids=$(echo "$existing_products" | python3 -c "
import sys, json
try:
    products = json.load(sys.stdin)
    for p in products:
        print(p['id'])
except: pass
" 2>/dev/null)

for pid in $existing_ids; do
  curl -s -X DELETE "${BASE_URL}/api/products" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"${pid}\"}" > /dev/null 2>&1
done

existing_outfits=$(curl -s "${BASE_URL}/api/outfits" 2>/dev/null)
existing_outfit_ids=$(echo "$existing_outfits" | python3 -c "
import sys, json
try:
    outfits = json.load(sys.stdin)
    for o in outfits:
        print(o['id'])
except: pass
" 2>/dev/null)

for oid in $existing_outfit_ids; do
  curl -s -X DELETE "${BASE_URL}/api/outfits" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"${oid}\"}" > /dev/null 2>&1
done

echo -e "${GREEN}Done${NC}"

# ============================================================================
# PHASE 1: Scrape Products
# ============================================================================

print_header "PHASE 1: SCRAPING PRODUCTS (50 URLs across 5 categories)"

# ---------- DRESSES (10 products) ----------
print_subheader "DRESSES (10 products)"

# Princess Polly (Shopify)
id=$(add_product "https://www.princesspolly.com/products/hollie-mini-dress-black" "dress" "Princess Polly - Hollie Mini Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

id=$(add_product "https://www.princesspolly.com/products/emmie-mini-dress-white" "dress" "Princess Polly - Emmie Mini Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

id=$(add_product "https://www.princesspolly.com/products/the-romero-mini-dress-black" "dress" "Princess Polly - Romero Mini Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

# Peppermayo (Shopify)
id=$(add_product "https://www.peppermayo.com/products/abigail-mini-dress-black" "dress" "Peppermayo - Abigail Mini Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

id=$(add_product "https://www.peppermayo.com/products/rosalie-maxi-dress-beige" "dress" "Peppermayo - Rosalie Maxi Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

# House of CB (Shopify)
id=$(add_product "https://www.houseofcb.com/products/anamaria-black-strapless-corset-mini-dress" "dress" "House of CB - Anamaria Mini Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

id=$(add_product "https://www.houseofcb.com/products/giselle-vanilla-floral-tiered-midi-dress" "dress" "House of CB - Giselle Midi Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

# Oh Polly (Shopify)
id=$(add_product "https://www.ohpolly.com/products/ruched-corset-mini-dress-in-black" "dress" "Oh Polly - Ruched Corset Mini Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

id=$(add_product "https://www.ohpolly.com/products/cowl-neck-satin-mini-dress-in-champagne" "dress" "Oh Polly - Cowl Neck Satin Dress")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

id=$(add_product "https://www.ohpolly.com/products/off-shoulder-bodycon-mini-dress-in-red" "dress" "Oh Polly - Off Shoulder Bodycon")
[[ "$id" != "FAILED" && -n "$id" ]] && DRESS_IDS+=("$id")

# ---------- SHOES (10 products) ----------
print_subheader "SHOES (10 products)"

# Steve Madden (Shopify)
id=$(add_product "https://www.stevemadden.com/products/vala-black" "shoes" "Steve Madden - Vala Black")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

id=$(add_product "https://www.stevemadden.com/products/carrson-black-suede" "shoes" "Steve Madden - Carrson Black Suede")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

id=$(add_product "https://www.stevemadden.com/products/irenee-natural" "shoes" "Steve Madden - Irenee Natural")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

id=$(add_product "https://www.stevemadden.com/products/daisie-black-patent" "shoes" "Steve Madden - Daisie Black Patent")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

# Public Desire (Shopify)
id=$(add_product "https://www.publicdesire.com/products/tipsy-black-patent-pu" "shoes" "Public Desire - Tipsy Black")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

id=$(add_product "https://www.publicdesire.com/products/goddess-wide-fit-black-pu" "shoes" "Public Desire - Goddess Wide Fit")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

id=$(add_product "https://www.publicdesire.com/products/tinsel-black-patent-pu" "shoes" "Public Desire - Tinsel Black")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

# ALDO (Shopify)
id=$(add_product "https://www.aldoshoes.com/products/stessy-black" "shoes" "ALDO - Stessy Black")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

id=$(add_product "https://www.aldoshoes.com/products/cassedyna-black" "shoes" "ALDO - Cassedyna Black")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

id=$(add_product "https://www.aldoshoes.com/products/larsjulia-gold" "shoes" "ALDO - Larsjulia Gold")
[[ "$id" != "FAILED" && -n "$id" ]] && SHOES_IDS+=("$id")

# ---------- TIGHTS (10 products) ----------
print_subheader "TIGHTS (10 products)"

# Wolford (non-Shopify - JSON-LD/OG scraping)
id=$(add_product "https://www.wolford.com/en-us/fatal-15-tights-18076.html" "tights" "Wolford - Fatal 15 Tights")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/satin-touch-20-tights-18378.html" "tights" "Wolford - Satin Touch 20")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/neon-40-tights-18391.html" "tights" "Wolford - Neon 40 Tights")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/velvet-de-luxe-66-tights-14775.html" "tights" "Wolford - Velvet de Luxe 66")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/individual-10-tights-18382.html" "tights" "Wolford - Individual 10")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/individual-20-tights-18267.html" "tights" "Wolford - Individual 20")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/satin-opaque-50-tights-18379.html" "tights" "Wolford - Satin Opaque 50")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/pure-50-tights-14434.html" "tights" "Wolford - Pure 50")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/fatal-50-tights-18043.html" "tights" "Wolford - Fatal 50")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

id=$(add_product "https://www.wolford.com/en-us/luxe-9-tights-17028.html" "tights" "Wolford - Luxe 9")
[[ "$id" != "FAILED" && -n "$id" ]] && TIGHTS_IDS+=("$id")

# ---------- BAGS (10 products) ----------
print_subheader "BAGS (10 products)"

# Coach (Shopify)
id=$(add_product "https://www.coach.com/products/tabby-shoulder-bag-26/CT101-V5BLK.html" "bag" "Coach - Tabby Shoulder Bag")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

id=$(add_product "https://www.coach.com/products/heart-crossbody/CQ192-B4BLK.html" "bag" "Coach - Heart Crossbody")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

id=$(add_product "https://www.coach.com/products/mini-tabby-bag-charm/CU362-B4BLK.html" "bag" "Coach - Mini Tabby Charm")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

id=$(add_product "https://www.coach.com/products/willow-tote-bag/C0689-B4BLK.html" "bag" "Coach - Willow Tote")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

id=$(add_product "https://www.coach.com/products/ergo-bag-in-coachtopia-leather/CQ831-LHE6W.html" "bag" "Coach - Ergo Bag")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

# Kate Spade (non-Shopify, OG/JSON-LD)
id=$(add_product "https://www.katespade.com/products/sam-icon-small-shoulder-bag/K8818.html" "bag" "Kate Spade - Sam Icon Bag")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

id=$(add_product "https://www.katespade.com/products/madison-saffiano-leather-medium-satchel/KC437.html" "bag" "Kate Spade - Madison Satchel")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

id=$(add_product "https://www.katespade.com/products/bleecker-large-tote/KE929.html" "bag" "Kate Spade - Bleecker Tote")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

id=$(add_product "https://www.katespade.com/products/glimmer-glitter-crossbody/KE938.html" "bag" "Kate Spade - Glimmer Crossbody")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

id=$(add_product "https://www.katespade.com/products/dakota-medium-convertible-shoulder-bag/K8841.html" "bag" "Kate Spade - Dakota Shoulder Bag")
[[ "$id" != "FAILED" && -n "$id" ]] && BAG_IDS+=("$id")

# ---------- ACCESSORIES (10 products) ----------
print_subheader "ACCESSORIES (10 products)"

# BaubleBar (Shopify)
id=$(add_product "https://www.baublebar.com/products/alidia-ring" "accessories" "BaubleBar - Alidia Ring")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

id=$(add_product "https://www.baublebar.com/products/dalilah-earrings" "accessories" "BaubleBar - Dalilah Earrings")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

id=$(add_product "https://www.baublebar.com/products/pisa-bracelet" "accessories" "BaubleBar - Pisa Bracelet")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

id=$(add_product "https://www.baublebar.com/products/mae-necklace" "accessories" "BaubleBar - Mae Necklace")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

id=$(add_product "https://www.baublebar.com/products/bennett-earrings" "accessories" "BaubleBar - Bennett Earrings")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

# Mejuri (Shopify)
id=$(add_product "https://www.mejuri.com/products/bold-hoop-earrings" "accessories" "Mejuri - Bold Hoop Earrings")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

id=$(add_product "https://www.mejuri.com/products/croissant-dome-ring" "accessories" "Mejuri - Croissant Dome Ring")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

id=$(add_product "https://www.mejuri.com/products/tennis-bracelet" "accessories" "Mejuri - Tennis Bracelet")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

id=$(add_product "https://www.mejuri.com/products/charlotte-necklace" "accessories" "Mejuri - Charlotte Necklace")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

id=$(add_product "https://www.mejuri.com/products/small-hoop-earrings" "accessories" "Mejuri - Small Hoop Earrings")
[[ "$id" != "FAILED" && -n "$id" ]] && ACCESSORIES_IDS+=("$id")

# ============================================================================
# PHASE 2: Create Outfits
# ============================================================================

print_header "PHASE 2: CREATING 10 OUTFITS"

echo ""
echo -e "  Available products per category:"
echo -e "    Dresses:     ${#DRESS_IDS[@]}"
echo -e "    Shoes:       ${#SHOES_IDS[@]}"
echo -e "    Tights:      ${#TIGHTS_IDS[@]}"
echo -e "    Bags:        ${#BAG_IDS[@]}"
echo -e "    Accessories: ${#ACCESSORIES_IDS[@]}"

# Helper to safely get an ID from an array with fallback
get_id() {
  local -n arr=$1
  local idx=$2
  if [[ $idx -lt ${#arr[@]} ]]; then
    echo "${arr[$idx]}"
  else
    echo ""
  fi
}

# Create 10 outfits, each using a different combination
create_outfit() {
  local name="$1"
  local dress_idx=$2
  local shoes_idx=$3
  local tights_idx=$4
  local bag_idx=$5
  local acc_idx=$6

  TOTAL_OUTFITS=$((TOTAL_OUTFITS + 1))

  local dress_id=$(get_id DRESS_IDS $dress_idx)
  local shoes_id=$(get_id SHOES_IDS $shoes_idx)
  local tights_id=$(get_id TIGHTS_IDS $tights_idx)
  local bag_id=$(get_id BAG_IDS $bag_idx)
  local acc_id=$(get_id ACCESSORIES_IDS $acc_idx)

  print_subheader "Outfit ${TOTAL_OUTFITS}: ${name}"

  # Create the outfit
  local create_resp
  create_resp=$(curl -s -X POST "${BASE_URL}/api/outfits" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${name}\"}" \
    --max-time 10 2>/dev/null)

  local outfit_id
  outfit_id=$(echo "$create_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)

  if [[ -z "$outfit_id" ]]; then
    fail "Could not create outfit '${name}'"
    FAILED_OUTFITS=$((FAILED_OUTFITS + 1))
    return 1
  fi

  pass "Created outfit with ID: ${outfit_id}"

  # Build items JSON
  local items="{"
  local item_count=0

  if [[ -n "$dress_id" ]]; then
    items+="\"dress\": \"${dress_id}\""
    item_count=$((item_count + 1))
  fi
  if [[ -n "$shoes_id" ]]; then
    [[ $item_count -gt 0 ]] && items+=", "
    items+="\"shoes\": \"${shoes_id}\""
    item_count=$((item_count + 1))
  fi
  if [[ -n "$tights_id" ]]; then
    [[ $item_count -gt 0 ]] && items+=", "
    items+="\"tights\": \"${tights_id}\""
    item_count=$((item_count + 1))
  fi
  if [[ -n "$bag_id" ]]; then
    [[ $item_count -gt 0 ]] && items+=", "
    items+="\"bag\": \"${bag_id}\""
    item_count=$((item_count + 1))
  fi
  if [[ -n "$acc_id" ]]; then
    [[ $item_count -gt 0 ]] && items+=", "
    items+="\"accessories\": [\"${acc_id}\"]"
    item_count=$((item_count + 1))
  fi
  items+="}"

  echo -e "    Items: ${item_count}/5 categories filled"

  # Update the outfit with items
  local update_resp
  update_resp=$(curl -s -X PUT "${BASE_URL}/api/outfits" \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"${outfit_id}\", \"items\": ${items}}" \
    --max-time 10 2>/dev/null)

  local updated_name
  updated_name=$(echo "$update_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name',''))" 2>/dev/null)

  if [[ "$updated_name" == "$name" ]]; then
    pass "Updated outfit with ${item_count} items"
    PASSED_OUTFITS=$((PASSED_OUTFITS + 1))
  else
    fail "Failed to update outfit '${name}'"
    FAILED_OUTFITS=$((FAILED_OUTFITS + 1))
  fi
}

# Create 10 outfits with different combos (indices into the ID arrays)
#               name                          dress shoes tights bag acc
create_outfit  "Classic Black Night Out"       0     0     0     0   0
create_outfit  "Weekend Brunch Chic"           1     1     1     1   1
create_outfit  "Date Night Glam"               2     2     2     2   2
create_outfit  "Office to Cocktails"           3     3     3     3   3
create_outfit  "Garden Party Vibes"            4     4     4     4   4
create_outfit  "Bold & Beautiful"              5     5     5     5   5
create_outfit  "Elegant Evening"               6     6     6     6   6
create_outfit  "City Explorer"                 7     7     7     7   7
create_outfit  "Sunday Sophisticate"           8     8     8     8   8
create_outfit  "Power Dinner"                  9     9     9     9   9

# ============================================================================
# PHASE 3: Verify Outfits via GET
# ============================================================================

print_header "PHASE 3: VERIFYING OUTFITS VIA GET /api/outfits"

outfits_response=$(curl -s "${BASE_URL}/api/outfits" --max-time 10 2>/dev/null)
outfit_count=$(echo "$outfits_response" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)

echo ""
echo -e "  Total outfits returned: ${outfit_count}"

# Check each outfit has resolved products
verified=0
echo "$outfits_response" | python3 -c "
import sys, json
outfits = json.load(sys.stdin)
for o in outfits:
    name = o.get('name', 'Unknown')
    products = o.get('products', {})
    item_count = len(o.get('items', {}))
    product_count = len(products)
    print(f'{name}|{item_count}|{product_count}')
" 2>/dev/null | while IFS='|' read -r name items prods; do
  if [[ "$prods" -gt 0 ]]; then
    echo -e "  ${GREEN}✓${NC} ${name}: ${prods} products resolved"
  else
    echo -e "  ${RED}✗${NC} ${name}: 0 products resolved (${items} items set)"
  fi
done

# ============================================================================
# PHASE 4: Product Count Verification
# ============================================================================

print_header "PHASE 4: PRODUCT COUNT VERIFICATION"

products_response=$(curl -s "${BASE_URL}/api/products" --max-time 10 2>/dev/null)
total_in_db=$(echo "$products_response" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)

echo ""
echo -e "  Total products in database: ${total_in_db}"

# Count by category
echo "$products_response" | python3 -c "
import sys, json
products = json.load(sys.stdin)
cats = {}
for p in products:
    c = p.get('category', 'unknown')
    cats[c] = cats.get(c, 0) + 1
for c, n in sorted(cats.items()):
    print(f'  {c}: {n}')
" 2>/dev/null

# ============================================================================
# SUMMARY
# ============================================================================

print_header "FINAL SUMMARY"

echo ""
echo -e "  ${BOLD}Products:${NC}"
echo -e "    Attempted:  ${TOTAL_PRODUCTS}"
echo -e "    Passed:     ${GREEN}${PASSED_PRODUCTS}${NC}"
echo -e "    Failed:     ${RED}${FAILED_PRODUCTS}${NC}"
echo -e "    Success:    ${BOLD}${PASSED_PRODUCTS}/${TOTAL_PRODUCTS}${NC}"
echo ""
echo -e "  ${BOLD}Outfits:${NC}"
echo -e "    Attempted:  ${TOTAL_OUTFITS}"
echo -e "    Passed:     ${GREEN}${PASSED_OUTFITS}${NC}"
echo -e "    Failed:     ${RED}${FAILED_OUTFITS}${NC}"
echo -e "    Success:    ${BOLD}${PASSED_OUTFITS}/${TOTAL_OUTFITS}${NC}"

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo ""
  echo -e "  ${BOLD}${RED}Failures:${NC}"
  for f in "${FAILURES[@]}"; do
    echo -e "    ${RED}• ${f}${NC}"
  done
fi

echo ""
if [[ $FAILED_PRODUCTS -eq 0 && $FAILED_OUTFITS -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}ALL TESTS PASSED!${NC}"
else
  echo -e "  ${YELLOW}${BOLD}SOME TESTS FAILED - see details above${NC}"
fi
echo ""
