#!/usr/bin/env bash
# Usage: N8N_URL="http://localhost:5678/webhook-test/feedback-intake" API_KEY="your-key" ./scripts/send-test-request.sh [payload.json]
set -euo pipefail
PAYLOAD="${1:-data/sample-payload.json}"
curl -sS -X POST "${N8N_URL:?Set N8N_URL}" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY:?Set API_KEY}" \
  -d @"$PAYLOAD"
echo
