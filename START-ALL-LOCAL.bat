@echo off
REM ═══════════════════════════════════════════════════════════════
REM  START-ALL-LOCAL.bat — Start Bot + Dashboard locally
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0the_redacted_protocol"

echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║   REDACTED PROTOCOL — Starting ALL Services Local    ║
echo ╚═══════════════════════════════════════════════════════╝
echo.

echo [1/2] Starting Dashboard (http://localhost:3000)...
echo.
start "Redacted Dashboard" cmd /k "cd dashboard && npm run dev"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Telegram Bot...
echo.
echo   Abre Telegram y envia /start a @theredacted_bot
echo.
start "Redacted Bot" cmd /k "target\release\rd.exe --telegram"

echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║   ALL SERVICES STARTED!                              ║
echo ╚═══════════════════════════════════════════════════════╝
echo.
echo   Dashboard: http://localhost:3000
echo   Telegram:  @theredacted_bot
echo.
echo   Para detener: Cierra las ventanas de "Redacted Dashboard" y "Redacted Bot"
echo.
pause
