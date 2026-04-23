# ═══════════════════════════════════════════════════════════════
#  setup-vps.ps1 — Setup Anchor CLI on VPS
#  Connects to VPS and runs the setup script
# ═══════════════════════════════════════════════════════════════

$VPS_HOST = "root@69.62.116.165"
$REMOTE_DIR = "/root/the_redacted_protocol"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   REDACTED PROTOCOL — VPS Anchor Setup Helper" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Target: $VPS_HOST" -ForegroundColor Yellow
Write-Host ""

# Step 1: Upload setup script
Write-Host "📤 Uploading setup script..." -ForegroundColor Green
scp "setup-vps-anchor.sh" "${VPS_HOST}:${REMOTE_DIR}/setup-vps-anchor.sh" 2>&1 | Select-Object -Last 3

Write-Host ""
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Connect to VPS:" -ForegroundColor White
Write-Host "   ssh $VPS_HOST" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "2. Run setup script:" -ForegroundColor White
Write-Host "   cd $REMOTE_DIR" -ForegroundColor DarkYellow
Write-Host "   bash setup-vps-anchor.sh" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "3. Build contracts:" -ForegroundColor White
Write-Host "   cd contracts && anchor build" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "4. Deploy to devnet:" -ForegroundColor White
Write-Host "   anchor deploy --provider.cluster devnet" -ForegroundColor DarkYellow
Write-Host ""
