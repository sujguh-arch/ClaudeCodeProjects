#!/bin/bash
set -e

echo "=== VFR Codespace Setup ==="

# Install Claude Code
curl -fsSL https://claude.ai/install.sh | bash
export PATH="$HOME/.claude/bin:$PATH"

# Install VFR dependencies
cd virtual-fitting-room
npm install

# Install Playwright browsers
npx playwright install --with-deps chromium

# Write .env.local from Codespace secret
if [ -n "$REPLICATE_API_TOKEN" ]; then
  echo "REPLICATE_API_TOKEN=$REPLICATE_API_TOKEN" > .env.local
  echo "✓ .env.local created from Codespace secret"
else
  echo "⚠ REPLICATE_API_TOKEN not set. Add it as a Codespace secret."
fi

# Verify build works
npm run build
echo "✓ Production build succeeded"

echo "=== Setup complete. Run: bash run-session.sh ==="
