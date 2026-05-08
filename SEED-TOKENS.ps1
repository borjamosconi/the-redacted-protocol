# ============================================================
#    REDACTED PROTOCOL - Seed Devnet Tokens
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   REDACTED PROTOCOL — Seeding Devnet Tokens" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

cd contracts

# Ensure dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    npm install
}

# Run seeder
Write-Host "Running seeder script..." -ForegroundColor White
npx ts-node scripts/seed-docs.ts

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   SEEDING COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
cd ..
