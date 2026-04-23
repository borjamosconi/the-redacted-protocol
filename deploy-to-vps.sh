#!/bin/bash
# ============================================================
# deploy-to-vps.sh — Deploy Redacted Protocol to VPS
# Automates: build, upload, configure, start bot
# ============================================================

set -e

VPS_HOST="root@69.62.116.165"
REMOTE_DIR="/root/the_redacted_protocol"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "════════════════════════════════════════════════════════"
echo "   REDACTED PROTOCOL — VPS Deployment Script"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  Target: ${VPS_HOST}"
echo "  Remote: ${REMOTE_DIR}"
echo ""

# ─── Check SSH access ───
echo "📡 Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $VPS_HOST "echo OK" 2>/dev/null; then
    echo "⚠️  SSH key not configured. You'll need to enter password."
    echo "   Tip: ssh-copy-id ${VPS_HOST} to skip passwords in future"
    echo ""
    USE_SSHPASS=""
    if command -v sshpass &>/dev/null; then
        USE_SSHPASS="yes"
    fi
else
    echo "✅ SSH connection OK"
fi

echo ""
echo "📦 Building project locally..."
cd "$PROJECT_DIR"
cargo build --release 2>&1 | tail -5
echo "✅ Build complete"

echo ""
echo "📤 Uploading to VPS..."

# Create remote directory
ssh $VPS_HOST "mkdir -p ${REMOTE_DIR}"

# Upload binary
scp target/release/rd $VPS_HOST:${REMOTE_DIR}/rd 2>&1 | tail -3

# Upload .env
scp .env $VPS_HOST:${REMOTE_DIR}/.env 2>&1 | tail -3

# Upload start script
scp start-autonomous.sh $VPS_HOST:${REMOTE_DIR}/start-autonomous.sh 2>&1 | tail -3

# Upload contracts directory (if exists)
if [ -d "contracts" ]; then
    echo "📤 Uploading Solana contracts..."
    ssh $VPS_HOST "mkdir -p ${REMOTE_DIR}/contracts"
    scp -r contracts/* $VPS_HOST:${REMOTE_DIR}/contracts/ 2>&1 | tail -3
fi

# Upload Anchor setup script
scp setup-vps-anchor.sh $VPS_HOST:${REMOTE_DIR}/setup-vps-anchor.sh 2>&1 | tail -3

echo "✅ Upload complete"

echo ""
echo "🔧 Configuring on VPS..."
ssh $VPS_HOST << 'REMOTE_SCRIPT'
cd /root/the_redacted_protocol

# Make executable
chmod +x rd
chmod +x start-autonomous.sh

# Check if .env has API keys
if grep -q "ROTATE_THIS_KEY" .env 2>/dev/null; then
    echo "⚠️  WARNING: .env contains placeholder keys!"
    echo "   Edit .env on VPS: nano /root/the_redacted_protocol/.env"
else
    echo "✅ .env looks configured"
fi

# Check if bot is already running
if pgrep -f "rd.*--telegram" > /dev/null 2>&1; then
    echo "⚠️  Bot already running. Restarting..."
    pkill -f "rd.*--telegram" || true
    sleep 2
fi

# Kill any old instances
pkill -f "rd --telegram" 2>/dev/null || true
pkill -f "rd --release" 2>/dev/null || true

echo ""
echo "🤖 Starting bot..."
nohup ./rd --telegram > bot.log 2>&1 &
BOT_PID=$!

sleep 3
if kill -0 $BOT_PID 2>/dev/null; then
    echo "✅ Bot started successfully (PID: $BOT_PID)"
    echo ""
    echo "📋 Last 20 lines of bot.log:"
    tail -20 bot.log
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "   DEPLOYMENT COMPLETE"
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "   Bot PID:  $BOT_PID"
    echo "   Log file: /root/the_redacted_protocol/bot.log"
    echo ""
    echo "   Monitor:  tail -f /root/the_redacted_protocol/bot.log"
    echo "   Stop:     kill $BOT_PID"
    echo "   Restart:  /root/the_redacted_protocol/start-autonomous.sh"
    echo "════════════════════════════════════════════════════════"
else
    echo "❌ Bot failed to start. Check bot.log:"
    echo "   cat /root/the_redacted_protocol/bot.log"
fi
REMOTE_SCRIPT
