#!/usr/bin/env bash
# Import AntiTrader n8n workflows (CLI). Same pattern for all JSON files in integrations/n8n/.
# n8n 2.x: after import, publish + restart so webhooks return 200.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WF_DIR="${ROOT}/integrations/n8n"

cd "$ROOT"
while IFS=: read -r FILE ID; do
  [[ -z "${FILE:-}" || "${FILE}" =~ ^# ]] && continue
  SRC="${WF_DIR}/${FILE}"
  if [[ ! -f "$SRC" ]]; then
    echo "Missing workflow file: $SRC" >&2
    exit 1
  fi
  echo "Importing ${FILE} (id=${ID})..."
  docker compose cp "$SRC" "n8n:/tmp/${FILE}"
  # Do not attach stdin: exec would consume the heredoc and stop the loop after the first workflow.
  docker compose exec -u node -T n8n n8n import:workflow --input="/tmp/${FILE}" </dev/null
  docker compose exec -u node -T n8n n8n publish:workflow --id="$ID" </dev/null
  docker compose exec -u node -T n8n n8n update:workflow --id="$ID" --active=true </dev/null
done <<'EOF'
antitrader-inbound-to-twenty.json:a1b2c3d4-1a2b-3c4d-5e6f-111111010000
antitrader-funnel-to-twenty.json:a1b2c3d4-1a2b-3c4d-5e6f-111111010200
antitrader-stripe-to-twenty.json:a1b2c3d4-1a2b-3c4d-5e6f-111111010300
antitrader-sales-journey-to-twenty.json:a1b2c3d4-1a2b-3c4d-5e6f-111111010400
antitrader-send-sms-twilio.json:a1b2c3d4-1a2b-3c4d-5e6f-111111010500
antitrader-send-whatsapp-template.json:a1b2c3d4-1a2b-3c4d-5e6f-111111010600
EOF

echo "Imported + published + active. Restarting n8n (required for webhook registration)..."
docker compose restart n8n
echo "Done. After ~30s open http://localhost:5678 and run: ./scripts/smoke-n8n.sh"
