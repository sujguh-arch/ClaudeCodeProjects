# Configuration

Copy `config.example.json` to `config.json` and customize with your Shef details:

```bash
cp config.example.json config.json
```

Then edit `config.json` with:
- `shefHomeUrl`: The Shef homepage URL
- `cartUrl`: The Shef cart URL
- `items`: Array of dishes to prefill, each with:
  - `name`: Display name for logging
  - `url`: Direct URL to the dish page
  - `quantity`: Number of times to add to cart

**Important:** `config.json` is gitignored to protect your order preferences.
