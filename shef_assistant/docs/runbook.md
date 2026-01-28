# Shef Assistant Runbook

## Prerequisites

1. Node.js 18+ installed
2. Playwright browser installed

## Initial Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install Playwright browsers

```bash
npx playwright install chromium
```

### 3. Create configuration

```bash
cp data/config.example.json data/config.json
```

Edit `data/config.json` with your Shef URLs and items:

```json
{
  "shefHomeUrl": "https://shef.com",
  "cartUrl": "https://shef.com/cart",
  "items": [
    {
      "name": "Your Favorite Dish",
      "url": "https://shef.com/shef/chef-name/dish-slug",
      "quantity": 2
    }
  ]
}
```

### 4. Log in to Shef

```bash
npm run shef:login
```

This opens a browser window. Log in manually, then press Enter in the terminal to save your session.

## Usage

### Prefill Cart (CLI)

```bash
npm run shef:prefill
```

### Prefill Cart (Web UI)

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000
3. Click "Prefill Cart" button

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run shef:login` | Open browser for manual login |
| `npm run shef:prefill` | Run cart prefill automation |

## Debugging

### Debug Mode

Debug mode runs headful (visible browser), keeps the browser open on failure, and saves screenshots with timestamps. Enable it using either method:

**Option 1: npm script with flag (recommended)**
```bash
npm run shef:prefill -- --debug
```

**Option 2: Environment variable**
```bash
DEBUG_SHEF=1 npm run shef:prefill
```

When debug mode is enabled:
- Browser stays open on errors for manual inspection
- Screenshots are saved to `artifacts/<item-name>-<timestamp>.png`
- All tried locators are logged to console
- All visible button names are logged for diagnosis
- Process doesn't exit on failure, allowing you to inspect state

### Debugging Steps

When the script fails to find the "Add to cart" button:

1. **Run in debug mode:**
   ```bash
   npm run shef:prefill -- --debug
   ```

2. **Check the screenshot:** Look in `artifacts/` for the timestamped screenshot showing the page state at failure.

3. **Review the logs:** The script logs:
   - All locators it tried (role-based, CSS selectors)
   - All visible button names on the page (helps identify new button text)

4. **Inspect the browser:** In debug mode, the browser stays open. Use DevTools to:
   - Right-click the Add button → Inspect
   - Note the button's text, aria-label, data-testid, or class names
   - Check if a modal/overlay is blocking the button

5. **Check for overlays:** The script tries to dismiss common modals, but new ones may need to be added to `dismissOverlays()` in `automation/prefill.ts`.

6. **Update selectors:** If Shef changed their button, add the new selector pattern to `findAndClickAddToCart()` in `automation/prefill.ts`.

### Error Screenshots

When the prefill script fails to find an "Add to Cart" button or encounters an error, it automatically saves a full-page screenshot to:
```
artifacts/<item-name>-<timestamp>.png
artifacts/prefill-error-<timestamp>.png
```

Review these screenshots to see the page state at the time of failure.

### Browser profile issues

If login is not persisting:

```bash
# Delete the profile and re-login
rm -rf .pw-profile/
npm run shef:login
```

### Playwright not finding buttons

1. Check if the Shef website has changed their button text/selectors
2. Open browser dev tools and inspect the Add to Cart button
3. Update selectors in `automation/prefill.ts` if needed

### Config not found error

```bash
# Ensure config exists
ls -la data/config.json

# If missing, copy from example
cp data/config.example.json data/config.json
```

### Script hangs

The prefill script leaves the browser open intentionally. Close it manually when done reviewing your cart.

## Common Failures

| Error | Cause | Fix |
|-------|-------|-----|
| `config.json not found` | Missing configuration | Copy from example |
| `Browser profile not found` | Haven't logged in | Run `npm run shef:login` |
| `Failed to add X to cart` | Button selector changed | Update selectors in prefill.ts |
| `Navigation timeout` | Slow network / site down | Check internet, retry |
| `CAPTCHA detected` | Shef requires verification | Log in manually |

## Safety Notes

- **Never places orders**: The automation stops at the cart page
- **No credentials stored**: Login is done manually in the browser
- **Review before checkout**: Always verify cart contents manually
- **Local only**: No cloud services, all data stays on your machine
