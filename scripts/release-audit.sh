#!/usr/bin/env bash
set -euo pipefail
echo "=== Chit App v50 Release Audit ==="
echo "[1/6] Node/npm"
node --version
npm --version
echo "[2/6] Backend install/build"
cd "$(dirname "$0")/../chit_v5"
npm ci
npm run build
echo "[3/6] Release tests"
npm run test:release
echo "[4/6] Environment safety"
if [ -f .env.production ]; then
  echo "WARNING: .env.production exists locally; ensure it is never committed."
fi
echo "[5/6] Docker configuration"
cd ..
docker compose -f docker-compose.prod.yml config >/dev/null
echo "[6/6] Audit complete"
echo "External staging/device/payment-provider validation is still required."
