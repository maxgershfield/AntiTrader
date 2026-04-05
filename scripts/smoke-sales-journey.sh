#!/usr/bin/env bash
# POST a sample sales-journey envelope to n8n (host must reach n8n; workflow imported + active).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${N8N_SALES_JOURNEY_URL:-http://localhost:5678/webhook/sales-journey}"

echo "POSTing sample journey event to: ${URL}"
echo "(Set N8N_SALES_JOURNEY_URL to override)"

curl -sS -X POST "${URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "manual",
    "receivedAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "journeyStage": "webinar_registered",
    "payload": {
      "email": "journey-smoke@example.com",
      "phoneE164": "",
      "externalId": "smoke-1",
      "firstName": "Journey",
      "lastName": "Smoke",
      "meta": {}
    }
  }'

echo ""
echo "Done. Check n8n Executions and Twenty for Person (created or jobTitle updated)."
