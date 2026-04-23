@echo off
REM ═══════════════════════════════════════════════════════════════
REM  DEPLOY-TO-VPS-NOW.bat — Deploy everything to redacted.bond
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0the_redacted_protocol"

call load-creds.bat
if errorlevel 1 exit /b 1

set VPS=%VPS_USER%@%VPS_HOST%

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   REDACTED PROTOCOL — Deploy to redacted.bond            ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo  You will be asked for the VPS password.
echo.
pause

echo.
echo [1/4] Uploading setup script...
type setup-vps-professional.sh | ssh %VPS% "cat > /root/setup.sh && chmod +x /root/setup.sh"

echo.
echo [2/4] Uploading project files...
ssh %VPS% "mkdir -p /root/the_redacted_protocol"
scp .env.professional %VPS%:/root/the_redacted_protocol/.env
scp -r dashboard %VPS%:/root/the_redacted_protocol/
scp -r contracts %VPS%:/root/the_redacted_protocol/
scp target\release\rd.exe %VPS%:/root/the_redacted_protocol/rd

echo.
echo [3/4] Running VPS setup...
ssh %VPS% "bash /root/setup.sh"

echo.
echo [4/4] Starting services...
ssh %VPS% "systemctl start redacted-bot 2>/dev/null; systemctl start redacted-dashboard 2>/dev/null; systemctl start nginx 2>/dev/null"

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   DEPLOY COMPLETE                                         ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo   https://api.redacted.bond
echo   https://app.redacted.bond
echo   https://status.redacted.bond
echo.
pause
