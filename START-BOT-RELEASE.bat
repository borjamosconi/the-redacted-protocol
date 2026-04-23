@echo off
cd /d "%~dp0the_redacted_protocol"

REM Set key vars manually from .env
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" .env ^| findstr /v "^$" ^| findstr /v "^[REM" ^| findstr /v "^OPENROUTER" ^| findstr /v "^SOLANA" ^| findstr /v "^ARWEAVE" ^| findstr /v "^AGENT" ^| findstr /v "^RECONSTRUCTION" ^| findstr /v "^PUBLICATION" ^| findstr /v "^RATE_LIMIT" ^| findstr /v "^LOG_LEVEL" ^| findstr /v "^RUST_LOG" ^| findstr /v "^NODE_ENV" ^| findstr /v "^DISCORD" ^| findstr /v "^SENTRY" ^| findstr /v "^HELIUS"`) do (
    set "%%a=%%b"
)

REM Set OpenRouter vars explicitly
for /f "usebackq tokens=1,* delims==" %%a in (`findstr /i "OPENROUTER" .env`) do set "%%a=%%b"

echo.
echo REDACTED PROTOCOL - Telegram Bot (RELEASE)
echo Bot: @theredacted_bot
echo Model: %OPENROUTER_MODEL%
echo.

target\release\rd.exe --telegram
pause
