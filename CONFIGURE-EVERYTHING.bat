@echo off
REM ═══════════════════════════════════════════════════════════════
REM  CONFIGURE-EVERYTHING.bat — Master Setup Script
REM  This will:
REM  1. Copy SSH key to VPS (requires password once)
REM  2. Deploy project to VPS
REM  3. Start bot on VPS
REM  4. Setup Anchor on VPS
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0the_redacted_protocol"

call load-creds.bat
if errorlevel 1 exit /b 1

set VPS=%VPS_USER%@%VPS_HOST%

echo.
echo ════════════════════════════════════════════════════════
echo    REDACTED PROTOCOL — Master Configuration
echo ════════════════════════════════════════════════════════
echo.
echo  Step 1: Build agent locally...
echo ════════════════════════════════════════════════════════
echo.

cargo build --release

echo.
echo ════════════════════════════════════════════════════════
echo  Step 2: Configure SSH to VPS...
echo ════════════════════════════════════════════════════════
echo.
echo  You will be asked for the VPS password.
echo.
echo  Press any key to continue...
pause >nul

type "%USERPROFILE%\.ssh\id_ed25519.pub" | ssh %VPS% "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && echo SSH_KEY_OK"

echo.
echo ════════════════════════════════════════════════════════
echo  Step 3: Deploy to VPS...
echo ════════════════════════════════════════════════════════
echo.

ssh %VPS% "mkdir -p /root/the_redacted_protocol/contracts"
scp target\release\rd.exe %VPS%:/root/the_redacted_protocol/rd
scp .env %VPS%:/root/the_redacted_protocol/.env
scp start-autonomous.sh %VPS%:/root/the_redacted_protocol/start-autonomous.sh
scp setup-vps-anchor.sh %VPS%:/root/the_redacted_protocol/setup-vps-anchor.sh
scp -r contracts\* %VPS%:/root/the_redacted_protocol/contracts/

echo.
echo ════════════════════════════════════════════════════════
echo  Step 4: Start bot on VPS...
echo ════════════════════════════════════════════════════════
echo.

ssh %VPS% "cd /root/the_redacted_protocol && chmod +x rd start-autonomous.sh setup-vps-anchor.sh && pkill -f 'rd.*--telegram' 2>/dev/null; sleep 1; nohup ./rd --telegram > bot.log 2>&1 & echo BOT_STARTED && sleep 3 && tail -20 bot.log"

echo.
echo ════════════════════════════════════════════════════════
echo  CONFIGURATION COMPLETE!
echo ════════════════════════════════════════════════════════
echo.
echo  Check VPS status:
echo    ssh root@69.62.116.165 'tail -f /root/the_redacted_protocol/bot.log'
echo.
echo  For Anchor contracts on VPS:
echo    ssh root@69.62.116.165
echo    cd /root/the_redacted_protocol
echo    bash setup-vps-anchor.sh
echo    cd contracts ^&^& anchor build
echo.
pause
