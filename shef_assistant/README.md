# Shef Assistant

Automated meal ordering assistant for Shef.com with real-time availability checking and cart prefill automation.

## Overview

Shef Assistant is a tool that helps you efficiently manage meal orders from Shef.com. It provides:

- **Item Management**: Add, edit, and organize your favorite dishes
- **Availability Checking**: Before ordering, verify which dishes are in stock
- **Cart Prefill**: Automatically add available items to your cart
- **Real-time Logs**: Watch the automation process live with streaming logs

⚠️ **Important**: This tool stops at the cart review screen. **You must manually review and place your order** — automated checkout is disabled for safety.

## Prerequisites

- **Node.js**: v18+ (check with `node --version`)
- **npm**: v9+ (check with `npm --version`)
- **macOS/Linux**: Developed on these systems (Windows may work but is untested)
- **Browser**: Chrome/Chromium (Playwright uses Chrome under the hood)
- **Active Shef.com account**: With saved payment and delivery methods

## Installation

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd shef_assistant
npm install
```

### 2. Create Configuration File

```bash
cp data/config.example.json data/config.json
```

Edit `data/config.json` with your dishes:

```json
{
  "shefHomeUrl": "https://shef.com",
  "cartUrl": "https://shef.com/cart",
  "items": [
    {
      "id": "unique-id-1",
      "name": "Paneer Paratha",
      "url": "https://shef.com/order/shef/.../paneer-paratha-229488?esid",
      "quantity": 2
    }
  ]
}
```

**How to find dish URLs**:
1. Go to Shef.com and search for a dish
2. Click on a dish to open its details
3. Copy the full URL from your browser's address bar
4. Paste it in your `config.json`

### 3. Login

Start the app and log in manually:

```bash
npm run dev
```

Visit http://localhost:3000, click "Launch Browser", and log into Shef.com. Your session is saved automatically.

## Usage

### Web Interface

**Development**:
```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

**Production**:
```bash
npm run build
npm run start
```

### Workflow

1. **Add Items**: Use the UI to add dishes from your `config.json`
2. **Check Availability**: Click "Check Availability" to verify dishes are in stock
3. **Review Status**:
   - ✅ Green = Available
   - ❌ Red = Unavailable (out of stock, disabled, etc.)
4. **Prefill Cart**: Click "Prefill X Items" to add available items to your cart
5. **Verify**: Check the cart manually on Shef.com
6. **Complete Order**: Manually review and place your order on Shef.com

### CLI Commands

Check availability from command line:

```bash
npm run shef:check-availability
```

This outputs:
- Available items (can be added to cart)
- Unavailable items (with reason: sold out, button disabled, etc.)
- Total count

## Configuration

### `data/config.json`

```json
{
  "shefHomeUrl": "https://shef.com",           // Shef home page URL
  "cartUrl": "https://shef.com/cart",          // Your cart page
  "items": [                                    // Array of dishes to order
    {
      "id": "unique-id",                        // Unique identifier
      "name": "Dish Name",                      // Display name
      "url": "https://shef.com/order/...",     // Full dish URL (copy from browser)
      "quantity": 2                             // How many to add to cart
    }
  ]
}
```

### Environment Variables

Optional environment variables (create `.env.local` if needed):

```bash
# Enable debug mode (extra logging and screenshots)
DEBUG_SHEF=1

# Force headless mode (not recommended - Shef blocks headless browsers)
HEADLESS=1

# Enable availability checker debug
DEBUG_AVAIL=1
```

## Troubleshooting

### "Browser won't open"

- Make sure Chrome is installed: `which chromium` or `which chrome`
- On macOS, try: `brew install chromium`

### "Dish not found during prefill"

- Verify the dish URL in `config.json` is correct
- Copy it again from Shef.com (URL may change)
- Check if the dish is still available on Shef.com

### "Add to cart button didn't work"

- The automation tries multiple methods (normal click, JavaScript click, force click)
- If none work, manually check the Shef.com website for issues (site maintenance, blocked by anti-bot)
- Wait a few minutes and try again

### "All items unavailable"

- The dish might be sold out
- Check Shef.com manually to verify
- Try checking availability again (stock updates frequently)

### "Login not saved"

- Make sure browser completes login (you see the home page)
- Close browser when prompted, don't close early
- Browser session is stored in `.pw-profile` directory

### "Config file got corrupted"

- If `data/config.json` is invalid JSON, the app will use default config
- Fix the JSON syntax and restart the app
- Backup before editing: `cp data/config.json data/config.json.backup`

## Safety & Limitations

⚠️ **Before Using:**

- **Manual verification required**: Always review your cart before placing orders
- **No auto-checkout**: Final order placement must be manual (safety feature)
- **Rate limiting**: Automation waits between requests to avoid overloading the server
- **Anti-bot detection**: Shef.com actively blocks automation. If you see errors, wait and try again
- **Network dependent**: Slow connections may cause timeouts or failures

### What This Tool Does:

✅ Checks dish availability before ordering
✅ Adds items to your cart automatically
✅ Reads your saved payment methods from Shef.com
✅ Saves your browser session between runs

### What This Tool Does NOT Do:

❌ Place orders automatically (requires manual confirmation)
❌ Store credentials or payment information
❌ Bypass CAPTCHAs (you handle those manually)
❌ Override availability checks (respects sold-out items)
❌ Charge your account without your action

## Development

### Project Structure

```
shef_assistant/
├── src/
│   ├── app/              # Next.js app router (pages, API)
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and services
│   └── styles/           # CSS modules
├── automation/           # Playwright automation scripts
│   ├── lib/              # Automation utilities
│   ├── prefill.ts        # Main prefill workflow
│   ├── login.ts          # Manual login flow
│   └── check-availability-json.ts  # Availability checker API
├── data/                 # User configuration
│   └── config.json       # Your item list
├── artifacts/            # Debug screenshots
└── .pw-profile/          # Browser session storage
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Check code quality
- `npm test` - Run tests
- `npm run shef:check-availability` - Check item availability

### Adding New Features

1. Create tests first (TDD approach)
2. Implement feature
3. Test manually on staging/dev
4. Run `npm run lint` to check code quality
5. Commit with clear message

## Known Issues

- **Headless mode blocked**: Shef.com has anti-bot detection that blocks headless browsers. The tool uses visible browser mode by default.
- **Timing sensitive**: Slow networks may cause automation to timeout
- **Portion sizes**: Some dishes require portion selection - the automation picks the first available option

## Future Roadmap

- **Phase 2**: Reminder system (check if low on food)
- **Phase 3**: Auto-trigger on schedule
- **Daily preferences**: Set different items for different days
- **Order history**: Track past orders
- **Price monitoring**: Alert on price changes

## Reporting Issues

If you find a bug:

1. Enable debug mode: Set `DEBUG_SHEF=1` environment variable
2. Run the automation again and capture the error
3. Check `artifacts/` directory for debug screenshots
4. Document: What happened, what you expected, steps to reproduce

## License

Personal use only. Not for commercial use or resale.

## Support

For help or questions:
1. Check the Troubleshooting section above
2. Review debug logs from automation runs
3. Check `artifacts/` for debug screenshots
4. Examine `data/config.json` for issues

---

**Last Updated**: 2026-01-28
**Version**: 1.0.0 (MVP)
