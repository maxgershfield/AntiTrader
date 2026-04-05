#!/usr/bin/env bash
# Read-only Twilio REST checks from AntiTrader/.env (no Cursor/Twilio OAuth — run locally).
# Requires LIVE Account SID + Auth Token. Test credentials return 403 / error 20008 for most resources.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SID=$(grep '^TWILIO_ACCOUNT_SID=' .env | cut -d= -f2- | tr -d '\r')
TOKEN=$(grep '^TWILIO_AUTH_TOKEN=' .env | cut -d= -f2- | tr -d '\r')
NGROK=$(grep '^TWILIO_WEBHOOK_PUBLIC_URL=' .env | cut -d= -f2- | tr -d '\r' | sed 's:/*$::')

if [[ -z "$SID" || -z "$TOKEN" ]]; then
  echo "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env" >&2
  exit 1
fi

BASE="https://api.twilio.com/2010-04-01/Accounts/${SID}"

echo "=== Twilio account (API) ==="
OUT=$(curl -sS -w "\nHTTP:%{http_code}" -u "${SID}:${TOKEN}" "${BASE}.json") || true
echo "$OUT" | head -c 2000
echo ""

echo ""
echo "=== Incoming phone numbers (SmsUrl / VoiceUrl) ==="
OUT=$(curl -sS -w "\nHTTP:%{http_code}" -u "${SID}:${TOKEN}" "${BASE}/IncomingPhoneNumbers.json?PageSize=20") || true
echo "$OUT" | head -c 8000
echo ""

echo ""
echo "=== Recent messages (last 20) ==="
OUT=$(curl -sS -w "\nHTTP:%{http_code}" -u "${SID}:${TOKEN}" "${BASE}/Messages.json?PageSize=20") || true
echo "$OUT" | head -c 12000
echo ""

if [[ -n "$NGROK" ]]; then
  echo ""
  echo "=== Expected inbound webhook URL (compare to SmsUrl above) ==="
  echo "${NGROK}/webhooks/twilio/sms"
fi

echo ""
echo "Tip: If you see error 20008 or 403, use LIVE API credentials from Console → Account → API keys & tokens."
echo "Tip: Bridge logs: docker compose logs antitrader-bridge --tail=50"
