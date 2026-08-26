$ErrorActionPreference = "Stop"
Write-Host "=== Chit App v50 Release Audit ==="
node --version
npm --version
Set-Location "$PSScriptRoot\..\chit_v5"
npm ci
npm run build
npm run test:release
Set-Location ..
docker compose -f docker-compose.prod.yml config | Out-Null
Write-Host "Audit complete. External staging/device/payment-provider validation is still required."
