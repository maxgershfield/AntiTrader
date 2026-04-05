#!/usr/bin/env bash
# POST to n8n outbound WhatsApp template webhook. Requires approved template in Meta.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "${ROOT}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT}/.env"
  set +a
fi

URL="${N8N_SEND_WHATSAPP_URL:-http://localhost:5678/webhook/antitrader-send-whatsapp}"
SECRET="${N8N_ANTITRADER_OUTBOUND_SECRET:-}"
TO="${SMOKE_WA_TO_E164:-}"
TEMPLATE="${SMOKE_WA_TEMPLATE_NAME:-hello_world}"
LANGCODE="${SMOKE_WA_LANGUAGE:-en_US}"

if [[ -z "${SECRET}" ]]; then
  echo "Set N8N_ANTITRADER_OUTBOUND_SECRET in .env (and on the n8n container)." >&2
  exit 1
fi

if [[ -z "${TO}" ]]; then
  echo "Set SMOKE_WA_TO_E164 to a handset in E.164 (e.g. +447700900000)." >&2
  exit 1
fi

export TO TEMPLATE LANGCODE SECRET
BODY="$(python3 -c "import json,os; print(json.dumps({'toE164':os.environ['TO'],'templateName':os.environ['TEMPLATE'],'languageCode':os.environ['LANGCODE'],'webhookSecret':os.environ['SECRET']}))")"

echo "POSTing to: ${URL}"
curl -sS -X POST "${URL}" \
  -H "Content-Type: application/json" \
  -d "${BODY}"

echo ""
echo "Done. Check n8n Executions and WhatsApp on the device."
