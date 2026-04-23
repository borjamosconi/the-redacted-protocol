@echo off
REM ═══════════════════════════════════════════════════════════════
REM  START-BOT.bat — Load .env and start Telegram Bot
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0the_redacted_protocol"

REM Load .env variables (skip comments and empty lines)
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" .env ^| findstr /v "^$" ^| findstr /v "^[REM"`) do (
    set "%%a=%%b"
)

echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║   REDACTED PROTOCOL — Telegram Bot                   ║
echo ║   Press Ctrl+C to stop                               ║
echo ╚═══════════════════════════════════════════════════════╝
echo.
echo   Bot: @theredacted_bot
echo   Chat ID: %TELEGRAM_CHAT_ID%
echo   Model: %OPENROUTER_MODEL%
echo   Network: Solana Devnet
echo.
echo   Abre Telegram y envia /start a @theredacted_bot
echo.
echo ════════════════════════════════════════════════════════
echo.

target\release\rd.exe --telegram

echo.
echo Bot stopped.
pause
