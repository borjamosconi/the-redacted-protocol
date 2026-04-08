#!/bin/bash
# Redacted Protocol Agent - Setup Script
# This script sets up the complete agent environment

set -e

echo "🔴 Redacted Protocol Agent Setup"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+ first."
    exit 1
fi

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust not found. Please install Rust first."
    echo "   Run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git not found. Please install Git first."
    exit 1
fi

echo "✅ All dependencies found"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env and set your API keys:"
    echo "   - OPENROUTER_API_KEY (get free key at https://openrouter.ai)"
    echo "   - TELEGRAM_BOT_TOKEN (your bot token)"
    echo ""
fi

# Install dashboard dependencies
echo "📦 Installing dashboard dependencies..."
cd dashboard
npm install
cd ..

# Build the agent
echo "🔨 Building Rust agent..."
cargo build --release

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the agent:"
echo "   1. Edit .env and set your API keys"
echo "   2. Run: cargo run --release -- --telegram"
echo ""
echo "📱 Telegram bot commands:"
echo "   /start - Initialize connection"
echo "   /scan_news <url> - Scan article for redactions"
echo "   /status - System status"
echo "   /airdrop - Check $RDX eligibility"
echo "   /help - Show all commands"
echo ""
echo "🌐 Dashboard:"
echo "   cd dashboard && npm run dev"
echo "   Open http://localhost:3000"
echo ""
echo "🔴 The file is breathing."
