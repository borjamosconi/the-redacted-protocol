@echo off
REM Redacted Protocol Agent - Windows Startup Script
REM This script starts the agent with Telegram integration

echo 🔴 Redacted Protocol Agent Starting...
echo ==========================================

REM Check if .env exists
if not exist .env (
    echo ❌ .env file not found!
    echo Please copy .env.example to .env and set your API keys:
    echo   copy .env.example .env
    echo Then edit .env and set:
    echo   - OPENROUTER_API_KEY
    echo   - TELEGRAM_BOT_TOKEN
    pause
    exit /b 1
)

REM Load environment variables from .env
for /f "tokens=* delims=" %%a in (.env) do set %%a

REM Check required variables
if "%OPENROUTER_API_KEY%"=="" (
    echo ❌ OPENROUTER_API_KEY not set in .env
    pause
    exit /b 1
)

if "%TELEGRAM_BOT_TOKEN%"=="" (
    echo ❌ TELEGRAM_BOT_TOKEN not set in .env
    pause
    exit /b 1
)

echo ✅ Environment variables loaded
echo 🔑 OpenRouter API Key: %OPENROUTER_API_KEY:~0,10%...
echo 🤖 Telegram Bot: @theredacted_bot
echo.
echo 🚀 Starting agent with Telegram integration...
echo.

REM Start the agent
target\release\rd.exe --telegram

pause
