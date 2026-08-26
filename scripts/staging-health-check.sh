#!/usr/bin/env bash
set -euo pipefail
: "${API_URL:?API_URL is required}"
curl --fail --silent --show-error "${API_URL}/health" >/dev/null
echo "API health: OK"
