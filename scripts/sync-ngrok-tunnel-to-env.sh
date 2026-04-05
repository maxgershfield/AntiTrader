#!/usr/bin/env bash
# Read https public URL from local ngrok API (4040) and set TWILIO_WEBHOOK_PUBLIC_URL in .env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL=$(curl -sS http://127.0.0.1:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('tunnels') or []; print(t[0]['public_url'] if t else '')" 2>/dev/null || true)
if [[ -z "$URL" ]]; then
  echo "No ngrok tunnel found. Start: ngrok http 3099" >&2
  exit 1
fi
if [[ "$URL" != https://* ]]; then
  echo "Expected https ngrok URL, got: $URL" >&2
  exit 1
fi

if grep -q '^TWILIO_WEBHOOK_PUBLIC_URL=' .env; then
  sed -i.bak "s|^TWILIO_WEBHOOK_PUBLIC_URL=.*|TWILIO_WEBHOOK_PUBLIC_URL=${URL}|" .env && rm -f .env.bak
else
  echo "TWILIO_WEBHOOK_PUBLIC_URL=${URL}" >> .env
fi
echo "Set TWILIO_WEBHOOK_PUBLIC_URL=${URL}"
echo "Recreate bridge: docker compose up -d --force-recreate antitrader-bridge"
