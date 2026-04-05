#!/usr/bin/env bash
# POST to n8n outbound SMS webhook (Twilio). Sends a real SMS if Twilio + secret are configured.
# Requires: antitrader-send-sms-twilio.json imported + active; n8n env:
#   N8N_ANTITRADER_OUTBOUND_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_FROM
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "${ROOT}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT}/.env"
  set +a
fi

URL="${N8N_SEND_SMS_URL:-http://localhost:5678/webhook/antitrader-send-sms}"
SECRET="${N8N_ANTITRADER_OUTBOUND_SECRET:-}"
TO="${SMOKE_SMS_TO_E164:-}"

if [[ -z "${SECRET}" ]]; then
  echo "Set N8N_ANTITRADER_OUTBOUND_SECRET in .env (and on the n8n container)." >&2
  exit 1
fi

if [[ -z "${TO}" ]]; then
  echo "Set SMOKE_SMS_TO_E164 to your test handset in E.164 (e.g. +447700900000)." >&2
  exit 1
fi

MSG="${SMOKE_SMS_BODY:-AntiTrader smoke SMS $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
export TO MSG SECRET

echo "POSTing to: ${URL}"
BODY="$(python3 -c "import json,os; print(json.dumps({'toE164':os.environ['TO'],'message':os.environ['MSG'],'webhookSecret':os.environ['SECRET']}))")"
curl -sS -X POST "${URL}" \
  -H "Content-Type: application/json" \
  -d "${BODY}"

echo ""
echo "Done. Check n8n Executions and the handset for the SMS."
