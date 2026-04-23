@echo off
REM ═══════════════════════════════════════════════════════════════
REM  DEPLOY-PROFESSIONAL.bat — Complete Professional Deployment
REM  Domain: redacted.bond
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0the_redacted_protocol"

call load-creds.bat
if errorlevel 1 exit /b 1

set VPS=%VPS_USER%@%VPS_HOST%

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   REDACTED PROTOCOL — Professional Deployment            ║
echo ║   Domain: redacted.bond                                   ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo [DNS] Configure these records in your DNS panel:
echo.
echo   Type  ^| Name     ^| Value
echo   ------^|----------^|------------------
echo   A     ^| @        ^| 69.62.116.165
echo   A     ^| app      ^| 69.62.116.165
echo   A     ^| api      ^| 69.62.116.165
echo   A     ^| status   ^| 69.62.116.165
echo   A     ^| docs     ^| 69.62.116.165
echo   A     ^| *        ^| 69.62.116.165
echo.
echo Press any key when DNS is configured...
pause >nul

echo.
echo [1/5] Building project...
cargo build --release

echo.
echo [2/5] Uploading to VPS...
scp setup-vps-professional.sh %VPS%:/root/ 2>&1 | findstr -v "^$"

echo.
echo [3/5] Running VPS setup...
ssh %VPS% "bash /root/setup-vps-professional.sh"

echo.
echo [4/5] Starting services...
ssh %VPS% "systemctl start redacted-bot && systemctl start redacted-dashboard"

echo.
echo [5/5] Setting Telegram webhook...
ssh %VPS% "BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN /opt/redacted-protocol/.env | cut -d= -f2) && curl -s -X POST https://api.telegram.org/bot$BOT_TOKEN/setWebhook -d url=https://api.redacted.bond/webhook/telegram"

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   DEPLOYMENT COMPLETE!                                    ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo   Dashboard:    https://app.redacted.bond
echo   API:          https://api.redacted.bond
echo   Status:       https://status.redacted.bond
echo   Telegram Bot: https://t.me/theredacted_bot
echo.
echo   Monitor: ssh root@69.62.116.165 'systemctl status redacted-bot'
echo.
pause
