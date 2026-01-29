# Shef Assistant - User Guide

**Complete step-by-step guide to set up and use Shef Assistant safely.**

---

## Table of Contents

1. [First-Time Setup](#first-time-setup)
2. [Adding Dishes](#adding-dishes)
3. [Logging In](#logging-in)
4. [Using the Web Interface](#using-the-web-interface)
5. [Checking Availability](#checking-availability)
6. [Prefilling Your Cart](#prefilling-your-cart)
7. [Completing Your Order](#completing-your-order)
8. [Safety Checklist](#safety-checklist)
9. [Troubleshooting](#troubleshooting)

---

## First-Time Setup

### Step 1: Install

```bash
# Clone the repository
git clone <your-repo-url>
cd shef_assistant

# Install dependencies
npm install
```

**Check versions:**
```bash
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
```

### Step 2: Create Your Configuration File

```bash
# Copy the example config
cp data/config.example.json data/config.json
```

Open `data/config.json` in your editor. You'll see:

```json
{
  "shefHomeUrl": "https://shef.com",
  "cartUrl": "https://shef.com/cart",
  "items": []
}
```

The `items` array is empty. **You'll add dishes here** in the next section.

### Step 3: Start the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see:
- **Shef Assistant** header
- "Items" section (empty initially)
- Buttons for "Launch Browser" and other options

---

## Adding Dishes

### How to Find Dish URLs

**On Shef.com:**

1. Go to https://shef.com
2. Search for a dish (e.g., "Paneer Paratha")
3. Click on the dish to view details
4. **Copy the full URL** from your browser's address bar
5. It should look like: `https://shef.com/order/shef/restaurant-name/dish-name-123456?esid`

### Adding Items to config.json

Edit `data/config.json` and add items to the `items` array:

```json
{
  "shefHomeUrl": "https://shef.com",
  "cartUrl": "https://shef.com/cart",
  "items": [
    {
      "id": "item-1",
      "name": "Paneer Paratha",
      "url": "https://shef.com/order/shef/moms-b/paneer-paratha-229488?esid",
      "quantity": 2
    },
    {
      "id": "item-2",
      "name": "Chill Fish",
      "url": "https://shef.com/order/shef/heder-l/chill-fish-45321?esid",
      "quantity": 1
    }
  ]
}
```

**Important:**
- Each `id` must be unique (e.g., "item-1", "item-2", etc.)
- `name` is for your reference (displayed in the UI)
- `url` must be the FULL URL copied from Shef.com
- `quantity` is how many portions to add (minimum 1)

### Via Web Interface

After starting the app:

1. Click **"+ Add Item"**
2. Enter:
   - **Name**: Dish name (e.g., "Paneer Paratha")
   - **URL**: Paste the full Shef.com URL
   - **Quantity**: Number of portions
3. Click **"Add Item"**
4. Item appears in the list

To remove an item, click the **"Delete"** button next to it.

---

## Logging In

### First-Time Login (Browser Session Setup)

1. Open http://localhost:3000
2. Click **"Launch Browser"**
   - A Chrome window opens showing Shef.com
3. **Log in manually**:
   - Click "Login" on Shef.com
   - Enter your email and password
   - Complete any 2FA (two-factor authentication)
4. Once logged in, you should see the Shef.com homepage
5. **Do NOT close the browser window** — the app will close it automatically
6. You'll see a message: **"Press Enter to close the browser..."**
7. Press **Enter** in your terminal
   - Browser closes
   - Your session is saved

### Subsequent Runs

Your login is saved automatically. The next time you run automation:
- You don't need to log in again
- Browser opens already logged in
- Automation proceeds directly

**Session is stored in:** `.pw-profile/` directory

**To force re-login:**
```bash
rm -rf .pw-profile
# Then run login again
npm run dev
# Click "Launch Browser"
```

---

## Using the Web Interface

### Main Dashboard

When you visit http://localhost:3000, you see:

#### 1. **Items Section**
- List of all dishes from your config
- Shows: Name, URL, Quantity
- Actions: Edit, Delete, Check Availability

#### 2. **Check Availability Button**
- Verifies if dishes are currently in stock
- Shows results with status:
  - ✅ **Green** = Available
  - ❌ **Red** = Unavailable (sold out, disabled, etc.)

#### 3. **Prefill Cart Button**
- Adds available items to your cart on Shef.com
- Only available if you have items checked and at least one is available
- Shows progress as items are added

#### 4. **Automation Logs**
- Real-time stream of what the automation is doing
- Updates as each step completes

---

## Checking Availability

### Why Check Availability?

Some dishes may be temporarily unavailable:
- Sold out
- Not available at selected time
- Restaurant closed
- Portion size unavailable

By checking first, you know which items can actually be ordered.

### How to Check

1. Open http://localhost:3000
2. You should see your items listed
3. Click **"Check Availability"**
4. Wait for results (usually 30-60 seconds)

### Understanding Results

**✅ Available (Green)**
- Item can be added to cart
- Shows reason if any (e.g., "requires portion size selection")

**❌ Unavailable (Red)**
- Item cannot be added
- Reason shown:
  - "Sold out" = No stock
  - "Button disabled" = Not available
  - "Modal did not open" = Item page error
  - "Error: ..." = Connection/parsing issue

### What Happens Next?

When you click **"Prefill X Items"**:
- Only available items are added
- Unavailable items are skipped
- You see which items were successfully added

---

## Prefilling Your Cart

### Prerequisites

Before prefilling, ensure:

1. ✅ You're logged in (browser session saved)
2. ✅ You've checked availability
3. ✅ At least one item is available
4. ✅ Your Shef.com cart is currently empty (recommended)

### How to Prefill

1. Click **"Check Availability"** and wait for results
2. Review the availability status:
   - ✅ Green items will be added
   - ❌ Red items will be skipped
3. Click **"Prefill X Items"** (where X = number of available items)
4. Watch the progress:
   - Logs show each step
   - Progress bar fills as items are added
   - ✅ Success message when done

### What Happens During Prefill

For each available item, the automation:
1. Navigates to the dish URL
2. Waits for the dish modal to open
3. Selects any required options (portion size, etc.)
4. Clicks "Add to Cart"
5. Verifies quantity in cart
6. Moves to next item

---

## Completing Your Order

### ⚠️ CRITICAL: Manual Verification Required

**The automation stops after adding items to your cart.** You MUST manually:

1. ✅ Review your cart on Shef.com
2. ✅ Verify all items are present
3. ✅ Verify quantities are correct
4. ✅ Check for any surprises
5. ✅ Review total price
6. ✅ Proceed to checkout manually

### Why Manual Review?

- **Safety**: Prevents accidental orders
- **Verification**: Ensures items were added correctly
- **Flexibility**: You can adjust quantities or remove items
- **Confirmation**: You explicitly confirm the final order

### How to Complete

1. Go to https://shef.com/cart
2. Review all items added by the automation
3. Make any adjustments if needed
4. Proceed to checkout manually
5. Complete payment
6. Confirm order

---

## Safety Checklist

**Before EVERY automation run, confirm:**

- [ ] You're logged into Shef.com (browser session exists)
- [ ] Your Shef saved payment method is up to date
- [ ] Your saved delivery address is correct
- [ ] You have sufficient balance/payment method
- [ ] Your intended dishes are in config.json with correct quantities
- [ ] You understand your order will cost (roughly quantity × price per item)
- [ ] You have time to review and complete the order manually

**After checking availability:**

- [ ] You've reviewed which items are available vs unavailable
- [ ] You're comfortable with the items that will be added
- [ ] Your cart on Shef.com is empty (optional but recommended)

**After prefilling:**

- [ ] You review your cart on Shef.com before placing order
- [ ] Quantities match your config
- [ ] No unexpected items were added
- [ ] Total price is reasonable
- [ ] You manually complete the order yourself

---

## Troubleshooting

### "Browser won't launch"

**Problem**: Error when clicking "Launch Browser"

**Solutions**:
```bash
# Check if Chrome is installed
which chromium    # or
which google-chrome

# On macOS, install if missing
brew install chromium

# On Linux (Ubuntu/Debian)
sudo apt-get install chromium-browser

# On Linux (Fedora/CentOS)
sudo dnf install chromium
```

### "Dish not found during prefill"

**Problem**: Prefill skips an item saying "Modal did not open"

**Reasons & Solutions**:
- URL is outdated → Copy fresh URL from Shef.com
- Dish is sold out → Check availability first
- Restaurant closed → Check Shef.com manually
- Anti-bot protection triggered → Wait 10+ minutes and try again

**Fix**:
1. Go to Shef.com manually
2. Search for the dish
3. Copy the NEW URL
4. Update config.json
5. Try again

### "Add to cart button doesn't work"

**Problem**: Prefill runs but items aren't added

**Possible Causes**:
- Overlay covering the button → Browser/site UI issue
- Portion selection required → Automation should handle, but may need manual selection
- Item sold out → Check availability first
- Anti-bot detection → Wait and retry

**Fix**:
1. Enable debug mode: `DEBUG_SHEF=1 npm run dev`
2. Run prefill again
3. Check `artifacts/` folder for screenshots
4. Screenshots show what automation saw
5. If button covered → Dish may have UI issue; try manually

### "Login not saved"

**Problem**: Browser opens but you're logged out

**Solutions**:
```bash
# Make sure you completed login properly:
# 1. Saw the Shef homepage after login
# 2. Pressed Enter only when asked
# 3. Didn't close browser early

# Check if session exists
ls -la .pw-profile

# If not, clear and retry
rm -rf .pw-profile
npm run dev
# Click "Launch Browser"
# Log in again completely
```

### "All items show as unavailable"

**Problem**: Every item is unavailable even though you know they're not

**Reasons**:
1. Wrong time of day (restaurant isn't serving)
2. Website maintenance
3. All dishes actually out of stock
4. Shef.com changed something

**What to do**:
1. Check Shef.com manually — can you see these dishes?
2. If yes on Shef but "unavailable" here → Technical issue
3. Wait 10 minutes and try again
4. Check `artifacts/` debug screenshots

### "Config file corrupted"

**Problem**: App crashes with JSON parsing error

**Fix**:
```bash
# Fix the JSON syntax in data/config.json
# Common issues:
# - Missing commas between array items
# - Single quotes instead of double quotes
# - Trailing commas in JSON (not allowed in standard JSON)

# Backup before editing
cp data/config.json data/config.json.backup

# Edit and fix, then restart
npm run dev
```

**Validate JSON:**
```bash
# Use a JSON validator or Node
node -e "console.log(JSON.parse(require('fs').readFileSync('data/config.json')))"
# If no error, JSON is valid
```

### "Automation hangs/takes forever"

**Problem**: Prefill seems stuck or very slow

**Reasons**:
- Slow network connection
- Shef.com is slow
- Anti-bot detection throttling
- Browser/system resource issues

**Solutions**:
- Wait patiently (automation has 5-10 minute timeout)
- Check if browser window is doing something
- Look at logs to see what step it's on
- If stuck for >10 min, close browser and try again
- Restart app: `npm run dev`

### "Rate limited - try again later"

**Problem**: Get message about too many requests

**Why**: You're checking availability or prefilling too frequently

**Fix**:
- Wait 5-10 minutes before trying again
- The tool has built-in rate limiting to be respectful to Shef.com
- One prefill run at a time (don't click button multiple times)

---

## Tips for Success

✅ **Do:**
- Run availability check before prefill
- Review your cart before completing order
- Wait between multiple runs
- Use debug mode if issues occur
- Keep config.json updated with fresh URLs

❌ **Don't:**
- Click buttons multiple times rapidly
- Try to use app during peak Shef hours
- Modify automation code without testing
- Close browser window during login
- Run automation while viewing Shef.com manually

---

## Support & Help

If something isn't working:

1. **Check logs**: Look at the messages on screen
2. **Debug screenshots**: `ls artifacts/`
3. **Enable debug mode**: `DEBUG_SHEF=1 npm run dev`
4. **Check README**: See [README.md](../README.md) for more details
5. **Verify config**: Make sure `data/config.json` has valid JSON

---

**Last Updated**: 2026-01-28
**Version**: 1.0.0 (MVP)
