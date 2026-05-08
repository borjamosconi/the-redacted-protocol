# ============================================================
#    REDACTED PROTOCOL - Full Devnet Deployment
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   REDACTED PROTOCOL — Full Devnet Deployment" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check SOL balance
$wallet = solana address
Write-Host "[1/6] Checking wallet: $wallet" -ForegroundColor White
$balance = solana balance
Write-Host "      Balance: $balance"

if ($balance -match "0 SOL") {
    Write-Host "      Requesting airdrop..." -ForegroundColor Yellow
    solana airdrop 2
}

# 2. Build contracts
Write-Host ""
Write-Host "[2/6] Building Anchor programs..." -ForegroundColor White
cd contracts
anchor build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. Deploy contracts
Write-Host ""
Write-Host "[3/6] Deploying to Devnet..." -ForegroundColor White
anchor deploy --provider.cluster devnet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4. Initialize Bonding Curve
Write-Host ""
Write-Host "[4/6] Initializing Bonding Curve Global State..." -ForegroundColor White
# Using the fixed script
$treasury = "CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8"
npx ts-node scripts/init-bondingcurve.ts --treasury $treasury --migration-authority $wallet --emergency-admin $wallet --rpc https://api.devnet.solana.com

# 5. Initialize Staking (Optional but good)
Write-Host ""
Write-Host "[5/6] Initializing Staking Pool..." -ForegroundColor White
npx ts-node scripts/init-staking.ts --rpc https://api.devnet.solana.com

# 6. Final Status
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT COMPLETE — The system is alive." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Programs are now live on Devnet."
Write-Host "   Launchpad is initialized."
Write-Host ""
cd ..
