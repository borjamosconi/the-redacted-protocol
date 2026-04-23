@echo off
REM ═══════════════════════════════════════════════════════════════
REM  RUN-BOT-LOCAL.bat — Start Telegram Bot Locally
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0the_redacted_protocol"

echo.
echo ════════════════════════════════════════════════════════
echo    REDACTED PROTOCOL — Starting Telegram Bot
echo ════════════════════════════════════════════════════════
echo.
echo   Model: google/gemini-2.5-flash:free
echo   Network: Solana Devnet
echo   Chat ID: 469454645
echo.
echo   Press Ctrl+C to stop
echo.
echo ════════════════════════════════════════════════════════
echo.

cargo run --release -- --telegram

echo.
pause
