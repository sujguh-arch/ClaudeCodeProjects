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
