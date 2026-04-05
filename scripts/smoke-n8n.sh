#!/usr/bin/env bash
# POST a sample AntiTrader envelope to the n8n webhook (host must reach n8n).
# Requires: workflow imported + active; TWENTY_API_KEY in .env for n8n container.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

N8N_URL="${N8N_SMOKE_URL:-http://localhost:5678/webhook/antitrader-inbound}"

echo "POSTing sample payload to: ${N8N_URL}"
echo "(Set N8N_SMOKE_URL to override)"

curl -sS -X POST "${N8N_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "smoke-test",
    "receivedAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "payload": {},
    "normalized": {
      "channel": "sms",
      "phoneE164": "+447700900000",
      "text": "AntiTrader smoke test",
      "messageId": "smoke-1"
    }
  }'

echo ""
echo "Done. Check n8n Executions and Twenty for a new Person (Lead / 0000)."
