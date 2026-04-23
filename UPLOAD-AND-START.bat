@echo off
cd /d "%~dp0the_redacted_protocol"
call load-creds.bat
if errorlevel 1 exit /b 1
set VPS=%VPS_USER%@%VPS_HOST%

echo ============================================================
echo   UPLOAD AND START REDACTED BOT ON VPS
echo ============================================================
echo.
echo   This will upload the bot and start it on %VPS_HOST%
echo.
pause

echo [1/2] Uploading binary...
scp "target\release\rd.exe" %VPS%:/opt/redacted-protocol/rd
if %ERRORLEVEL% NEQ 0 (
    echo UPLOAD FAILED
    pause
    exit /b
)

echo [2/2] Uploading .env...
scp ".env" root@69.62.116.165:/opt/redacted-protocol/.env

echo.
echo Starting bot on VPS...
ssh root@69.62.116.165 "cd /opt/redacted-protocol && pkill -f 'rd --telegram' 2>/dev/null; sleep 1; chmod +x rd; nohup ./rd --telegram > bot.log 2>&1 & echo BOT STARTED"

echo.
echo ============================================================
echo   DONE! BOT IS NOW RUNNING ON VPS
echo ============================================================
pause
