#!/usr/bin/env bash
# POST a Twilio-shaped form to the local bridge (no Twilio servers).
# Signature check is skipped only when TWILIO_AUTH_TOKEN is unset on the bridge (dev).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRIDGE="${BRIDGE_SMOKE_URL:-http://localhost:3099/webhooks/twilio/sms}"

echo "POSTing sample Twilio form to: ${BRIDGE}"
echo "(Set BRIDGE_SMOKE_URL to override; if bridge has TWILIO_AUTH_TOKEN set, this returns 403 without a valid Twilio signature.)"

curl -sS -w "\nHTTP %{http_code}\n" -X POST "${BRIDGE}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "MessageSid=SM_ANTITRADER_SMOKE" \
  --data-urlencode "From=+447700900111" \
  --data-urlencode "To=+15551234567" \
  --data-urlencode "Body=AntiTrader bridge smoke" \
  --data-urlencode "NumMedia=0"

echo "Done. Check: docker compose logs antitrader-bridge --tail=20"
echo "If N8N_FORWARD_WEBHOOK_URL is set, check n8n Executions and Twenty."
