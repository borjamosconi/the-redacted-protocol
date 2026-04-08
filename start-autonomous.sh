#!/bin/bash
# Redacted Protocol Agent - Autonomous Startup Script
# This script starts the agent with full autonomy

set -e

echo "🔴 Redacted Protocol Agent - Autonomous Mode"
echo "=============================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and set your API keys"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "❌ OPENROUTER_API_KEY not set in .env"
    exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN not set in .env"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "🔑 OpenRouter API Key: ${OPENROUTER_API_KEY:0:10}..."
echo "🤖 Telegram Bot: @theredacted_bot"
echo "🌐 Model: ${OPENROUTER_MODEL:-google/gemini-2.0-flash-exp:free}"
echo ""

# Check if binary exists
if [ ! -f "./target/release/rd" ]; then
    echo "🔨 Building agent..."
    cargo build --release
fi

echo "🚀 Starting agent in autonomous mode..."
echo "📱 Telegram commands:"
echo "   /start - Initialize"
echo "   /scan_news <url> - Scan for redactions"
echo "   /status - System status"
echo "   /help - Show commands"
echo ""
echo "🔴 The file is breathing."
echo ""

# Start the agent
exec ./target/release/rd --telegram
