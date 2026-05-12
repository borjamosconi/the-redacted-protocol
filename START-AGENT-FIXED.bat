@echo off
REM ═══════════════════════════════════════════════════════════════
REM  START-AGENT-FIXED.bat — Local agent runner (correct binary path)
REM ═══════════════════════════════════════════════════════════════

title REDACTED PROTOCOL AGENT
cd /d "%~dp0"

:RESTART_LOOP
echo [%DATE% %TIME%] Starting Redacted Protocol Agent...

REM Load .env variables
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" .env ^| findstr /v "^$"`) do (
    set "%%a=%%b"
)

echo.
echo === REDACTED PROTOCOL AGENT (local 24/7) ===
echo Binary: target\release\rd.exe
echo Network: %SOLANA_NETWORK%
echo.

"%~dp0target\release\rd.exe" --telegram

echo.
echo [%DATE% %TIME%] Agent exited. Restarting in 10s...
timeout /t 10 /nobreak >nul
goto RESTART_LOOP
