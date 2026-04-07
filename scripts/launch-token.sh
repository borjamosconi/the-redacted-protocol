#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  RDX Token Launch Script
#  Run this AFTER you have:
#    1. Created the SPL token
#    2. Funded the wallets
#    3. Updated TOKEN_MINT in all contracts
# ═══════════════════════════════════════════════════════════════

set -e

echo "╔══════════════════════════════════════════════════════╗"
echo "║     REDACTED PROTOCOL — Token Launch Script          ║"
echo "╚══════════════════════════════════════════════════════╝"

# ── Configuration ────────────────────────────────────────────
CLUSTER=${1:-devnet}
echo "📡 Cluster: $CLUSTER"

# ⚠️ UPDATE THESE after creating the token
TOKEN_MINT="REPLACEME"
WALLET_PATH="${HOME}/.config/solana/id.json"

# ── Step 1: Build contracts ─────────────────────────────────
echo ""
echo "🔨 Building Anchor contracts..."
cd contracts
anchor build

# ── Step 2: Deploy contracts ────────────────────────────────
echo ""
echo "🚀 Deploying contracts to $CLUSTER..."

echo "  → rd-fragment..."
anchor deploy --provider.cluster $CLUSTER --program-name rd-fragment

echo "  → rd-archive..."
anchor deploy --provider.cluster $CLUSTER --program-name rd-archive

echo "  → rd-staking..."
anchor deploy --provider.cluster $CLUSTER --program-name rd-staking

echo "  → rd-rewards..."
anchor deploy --provider.cluster $CLUSTER --program-name rd-rewards

echo "  → rd-treasury..."
anchor deploy --provider.cluster $CLUSTER --program-name rd-treasury

# ── Step 3: Initialize programs ─────────────────────────────
echo ""
echo "⚙️  Initializing programs..."

# These need actual transaction calls via anchor test or custom scripts
echo "  → Initialize staking pool..."
echo "  → Initialize rewards config..."
echo "  → Initialize treasury..."

# ── Step 4: Create liquidity pool (Raydium) ─────────────────
echo ""
echo "💧 Creating Raydium liquidity pool..."
echo "  → Add RDX/SOL to Raydium"
echo "  → Lock LP tokens (or burn)"

# ── Step 5: Distribute airdrops ─────────────────────────────
echo ""
echo "🎁 Distributing airdrops..."
echo "  → Run airdrop distribution script"

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Launch Complete! ✅                              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "📋 Post-launch checklist:"
echo "  □ Apply to CoinGecko"
echo "  □ Apply to CoinMarketCap"
echo "  □ Update DexScreener info"
echo "  □ Announce on Twitter/Telegram"
echo "  □ Submit to Solana ecosystem lists"
echo ""
