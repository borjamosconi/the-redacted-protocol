#!/bin/bash
# start-autonomous.sh — Launch Redacted Protocol bot in autonomous mode
# Runs in background with auto-restart on crash

set -e

cd "$(dirname "$0")"

echo ""
echo "═══════════════════════════════════════════════════"
echo "   REDACTED PROTOCOL — Autonomous Mode Launcher"
echo "═══════════════════════════════════════════════════"
echo ""

# Check if bot token is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    # Try to load from .env
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN not set!"
    echo "   Edit .env and set your bot token from @BotFather"
    exit 1
fi

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "⚠️  OPENROUTER_API_KEY not set — AI reconstruction disabled"
    echo "   Get free key at: https://openrouter.ai"
fi

# Check if already running
if pgrep -f "rd.*--telegram" > /dev/null 2>&1; then
    echo "⚠️  Bot is already running!"
    echo "   PID: $(pgrep -f 'rd.*--telegram')"
    echo "   To restart: kill the process and run this script again"
    exit 0
fi

echo "🔴 Starting Redacted Protocol Autonomous Agent..."
echo ""
echo "   Bot: @theredacted_bot"
echo "   Mode: Autonomous (news scanning + reconstruction)"
echo "   Log:  autonomous.log"
echo ""

# Start in background with auto-restart
nohup cargo run --release -- --telegram > autonomous.log 2>&1 &
BOT_PID=$!

echo "✅ Bot started with PID: $BOT_PID"
echo ""
echo "   Monitor: tail -f autonomous.log"
echo "   Stop:    kill $BOT_PID"
echo ""

# Wait a few seconds and check if it's still running
sleep 5
if kill -0 $BOT_PID 2>/dev/null; then
    echo "✅ Bot is running successfully"
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "   The file is breathing..."
    echo "═══════════════════════════════════════════════════"
else
    echo "❌ Bot crashed on startup. Check autonomous.log:"
    echo "   cat autonomous.log"
    exit 1
fi
