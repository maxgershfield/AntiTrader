#!/usr/bin/env bash
# Set Twilio Incoming Phone Number Messaging webhook to {TWILIO_WEBHOOK_PUBLIC_URL}/webhooks/twilio/sms
# Requires LIVE API credentials — Twilio returns 403 "Test Account Credentials" for this API.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SID=$(grep '^TWILIO_ACCOUNT_SID=' .env | cut -d= -f2- | tr -d '\r')
TOKEN=$(grep '^TWILIO_AUTH_TOKEN=' .env | cut -d= -f2- | tr -d '\r')
NGROK=$(grep '^TWILIO_WEBHOOK_PUBLIC_URL=' .env | cut -d= -f2- | tr -d '\r' | sed 's:/*$::')
PHONE="${PHONE_NUMBER:-+16415353848}"

if [[ -z "$SID" || -z "$TOKEN" ]]; then
  echo "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env" >&2
  exit 1
fi
if [[ -z "$NGROK" ]]; then
  echo "Set TWILIO_WEBHOOK_PUBLIC_URL (run ./scripts/sync-ngrok-tunnel-to-env.sh)" >&2
  exit 1
fi

SMS_URL="${NGROK}/webhooks/twilio/sms"
BASE="https://api.twilio.com/2010-04-01/Accounts/${SID}"

echo "Looking up ${PHONE}..."
LIST=$(curl -sS -u "${SID}:${TOKEN}" "${BASE}/IncomingPhoneNumbers.json?$(python3 -c "import urllib.parse; print(urllib.parse.urlencode({'PhoneNumber': '${PHONE}'}))")")
CODE=$(echo "$LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('code',''))" 2>/dev/null || echo "")

if echo "$LIST" | grep -q '"code":20008'; then
  echo "Twilio API: Resource not accessible with Test Account Credentials (error 20008)." >&2
  echo "Use Twilio Console → Phone Numbers → your number → Messaging → Webhook POST →" >&2
  echo "  ${SMS_URL}" >&2
  echo "Or put LIVE Account SID + Auth Token in .env and run this script again." >&2
  exit 2
fi

PN_SID=$(echo "$LIST" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('incoming_phone_numbers') or []; print(r[0]['sid'] if r else '')" 2>/dev/null || true)
if [[ -z "$PN_SID" ]]; then
  echo "No incoming phone number matching ${PHONE}. API response:" >&2
  echo "$LIST" >&2
  exit 1
fi

echo "Updating ${PN_SID} SmsUrl → ${SMS_URL}"
RESP=$(curl -sS -u "${SID}:${TOKEN}" -X POST "${BASE}/IncomingPhoneNumbers/${PN_SID}.json" \
  --data-urlencode "SmsUrl=${SMS_URL}" \
  --data-urlencode "SmsMethod=POST")
echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('sms_url:', d.get('sms_url')); print('sms_method:', d.get('sms_method'))" 2>/dev/null || echo "$RESP"
