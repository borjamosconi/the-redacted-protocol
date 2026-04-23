# ═══════════════════════════════════════════════════════════════
#  deploy-everything.ps1 — Deploy Redacted Protocol to VPS
#  Automates: SSH setup, upload, configure, start bot, deploy contracts
# ═══════════════════════════════════════════════════════════════

$credFile = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) ".credentials"
if (-not (Test-Path $credFile)) {
    Write-Host "ERROR: .credentials file not found! Copy .credentials.example to .credentials first." -ForegroundColor Red
    exit 1
}

$creds = @{}
Get-Content $credFile | Where-Object { $_ -match '^\s*([^#=]+)\s*=\s*(.+)' -and $_ -notmatch '^\s*#' } | ForEach-Object {
    $creds[$matches[1].Trim()] = $matches[2].Trim()
}

$VPS_HOST = $creds['VPS_HOST']
$VPS_USER = $creds['VPS_USER']
$VPS_PASS = $creds['VPS_PASS']
$REMOTE_DIR = "/root/the_redacted_protocol"
$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   REDACTED PROTOCOL — Full Deployment to VPS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Target: ${VPS_USER}@${VPS_HOST}" -ForegroundColor Yellow
Write-Host "  Remote: ${REMOTE_DIR}" -ForegroundColor Yellow
Write-Host ""

# Step 1: Copy SSH key
Write-Host "📡 Step 1: Configuring SSH key..." -ForegroundColor Green
$PUBKEY = Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
Write-Host "   Public key: $($PUBKEY.Substring(0, 30))..." -ForegroundColor Gray

# Create remote command to add SSH key
$sshSetupCmd = @"
mkdir -p ~/.ssh
echo '$PUBKEY' >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
echo 'SSH key configured'
"@

Write-Host "   Setting up SSH key (enter password when prompted)..." -ForegroundColor Yellow
Write-Host "   Password: $VPS_PASS" -ForegroundColor DarkGray
Write-Host ""
Write-Host $sshSetupCmd | ssh ${VPS_USER}@${VPS_HOST} 2>&1

# Step 2: Build project
Write-Host ""
Write-Host "📦 Step 2: Building project locally..." -ForegroundColor Green
Set-Location $PROJECT_DIR
cargo build --release 2>&1 | Select-Object -Last 5
Write-Host "   ✅ Build complete" -ForegroundColor Green

# Step 3: Upload to VPS
Write-Host ""
Write-Host "📤 Step 3: Uploading to VPS..." -ForegroundColor Green

Write-Host "   Creating remote directory..." -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${REMOTE_DIR}" 2>&1

Write-Host "   Uploading binary..." -ForegroundColor Gray
scp "${PROJECT_DIR}\target\release\rd.exe" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/rd" 2>&1 | Select-Object -Last 3

Write-Host "   Uploading .env..." -ForegroundColor Gray
scp "${PROJECT_DIR}\.env" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/.env" 2>&1 | Select-Object -Last 3

Write-Host "   Uploading start script..." -ForegroundColor Gray
scp "${PROJECT_DIR}\start-autonomous.sh" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/start-autonomous.sh" 2>&1 | Select-Object -Last 3

Write-Host "   Uploading contracts..." -ForegroundColor Gray
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${REMOTE_DIR}/contracts" 2>&1
scp -r "${PROJECT_DIR}\contracts\*" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/contracts/" 2>&1 | Select-Object -Last 3

Write-Host "   Uploading Anchor setup script..." -ForegroundColor Gray
scp "${PROJECT_DIR}\setup-vps-anchor.sh" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/setup-vps-anchor.sh" 2>&1 | Select-Object -Last 3

Write-Host "   ✅ Upload complete" -ForegroundColor Green

# Step 4: Configure and start on VPS
Write-Host ""
Write-Host "🔧 Step 4: Configuring VPS..." -ForegroundColor Green
Write-Host "   (enter password if prompted)" -ForegroundColor Yellow
Write-Host "   Password: $VPS_PASS" -ForegroundColor DarkGray
Write-Host ""

$remoteCmd = @"
cd ${REMOTE_DIR}

# Make executable
chmod +x rd
chmod +x start-autonomous.sh
chmod +x setup-vps-anchor.sh

# Check .env
if grep -q "your_chat_id_here" .env 2>/dev/null; then
    echo "⚠️  WARNING: .env still has placeholder values"
else
    echo "✅ .env configured"
fi

# Kill old instances
pkill -f "rd.*--telegram" 2>/dev/null || true
sleep 1

# Start bot
echo ""
echo "🤖 Starting Telegram bot..."
nohup ./rd --telegram > bot.log 2>&1 &
BOT_PID=`$!

sleep 3
if kill -0 `$BOT_PID 2>/dev/null; then
    echo "✅ Bot started (PID: `$BOT_PID)"
    echo ""
    echo "📋 Last 20 lines of bot.log:"
    tail -20 bot.log
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "   BOT DEPLOYED SUCCESSFULLY"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "   Bot PID:  `$BOT_PID"
    echo "   Log file: ${REMOTE_DIR}/bot.log"
    echo ""
    echo "   Monitor:  tail -f ${REMOTE_DIR}/bot.log"
    echo "   Stop:     kill `$BOT_PID"
    echo "════════════════════════════════════════════════════════"
else
    echo "❌ Bot failed to start"
    cat bot.log
fi
"@

Write-Host $remoteCmd | ssh ${VPS_USER}@${VPS_HOST} 2>&1

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps for Anchor contracts on VPS:" -ForegroundColor Yellow
Write-Host "  ssh ${VPS_USER}@${VPS_HOST}" -ForegroundColor DarkYellow
Write-Host "  cd ${REMOTE_DIR}" -ForegroundColor DarkYellow
Write-Host "  bash setup-vps-anchor.sh" -ForegroundColor DarkYellow
Write-Host "  cd contracts && anchor build" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "Monitor bot:" -ForegroundColor Yellow
Write-Host "  ssh ${VPS_USER}@${VPS_HOST} 'tail -f ${REMOTE_DIR}/bot.log'" -ForegroundColor DarkYellow
Write-Host ""
