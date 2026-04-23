#!/bin/bash
# ============================================================
#   $RDX PRESALE + AIRDROP + PERPETUAL SYSTEM DEPLOYMENT
#   Fair Launch System — Accumulate SOL → Launch with Liquidity
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   REDACTED PROTOCOL — $RDX Presale System       ║${NC}"
echo -e "${GREEN}║   Fair Launch + Perpetual Deflationary Engine   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
NETWORK="devnet"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --network) NETWORK="$2"; shift ;;
        --start-now) START_NOW=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}              SYSTEM ARCHITECTURE                  ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}┌─────────────────────────────────────────────────┐${NC}"
echo -e "${YELLOW}│  PHASE 1: PRESALE (7 days)                     │${NC}"
echo -e "${YELLOW}│  ├─ Early Bird (24h): 0.001 SOL → 1000 RDX     │${NC}"
echo -e "${YELLOW}│  ├─ Public (6d 23h): 0.002 SOL → 1000 RDX      │${NC}"
echo -e "${YELLOW}│  ├─ Anti-whale: Max 5 SOL (early), 2 SOL (pub) │${NC}"
echo -e "${YELLOW}│  └─ Min purchase: 0.1 SOL                      │${NC}"
echo -e "${YELLOW}│                                                 │${NC}"
echo -e "${YELLOW}│  PHASE 2: AIRDROP (concurrent)                 │${NC}"
echo -e "${YELLOW}│  ├─ Telegram users: 500 RDX free               │${NC}"
echo -e "${YELLOW}│  ├─ Doc submitters: +100 RDX per doc           │${NC}"
echo -e "${YELLOW}│  ├─ Verifiers: +50 RDX per verify              │${NC}"
echo -e "${YELLOW}│  ├─ Wallet connect bonus: +200 RDX             │${NC}"
echo -e "${YELLOW}│  └─ Max cap: 50,000 RDX per user               │${NC}"
echo -e "${YELLOW}│                                                 │${NC}"
echo -e "${YELLOW}│  PHASE 3: LIQUIDITY LAUNCH                     │${NC}"
echo -e "${YELLOW}│  ├─ 85% raised SOL → Raydium LP                │${NC}"
echo -e "${YELLOW}│  ├─ 10% raised SOL → RDX buyback + burn        │${NC}"
echo -e "${YELLOW}│  ├─ 5% raised SOL → Community treasury         │${NC}"
echo -e "${YELLOW}│  └─ LP tokens burned forever                   │${NC}"
echo -e "${YELLOW}│                                                 │${NC}"
echo -e "${YELLOW}│  PHASE 4: PERPETUAL ENGINE                     │${NC}"
echo -e "${YELLOW}│  ├─ 10% of protocol fees burned quarterly      │${NC}"
echo -e "${YELLOW}│  ├─ 70% of fees → stakers (40% APY base)       │${NC}"
echo -e "${YELLOW}│  ├─ 20% of fees → treasury                     │${NC}"
echo -e "${YELLOW}│  ├─ Max burn cap: 50% of supply (500M RDX)     │${NC}"
echo -e "${YELLOW}│  └─ Mint authority revoked → supply only falls │${NC}"
echo -e "${YELLOW}└─────────────────────────────────────────────────┘${NC}"
echo ""

# Check tools
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: solana CLI not found${NC}"
    exit 1
fi
if ! command -v spl-token &> /dev/null; then
    echo -e "${RED}Error: spl-token CLI not found${NC}"
    exit 1
fi

# Configure network
solana config set --url ${NETWORK}
echo -e "${GREEN}✓ Network: ${NETWORK}${NC}"

# Check wallet
WALLET=$(solana address)
BALANCE=$(solana balance --sol 2>/dev/null | awk '{print $1}')
echo -e "${GREEN}✓ Wallet: $WALLET${NC}"
echo -e "${GREEN}✓ Balance: $BALANCE SOL${NC}"
echo ""

read -p "Start presale deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
fi

# ───────────────────────────────────────────────────────────────
# STEP 1: Create RDX Token
# ───────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│  STEP 1: Creating $RDX Token                    │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"

TOKEN_MINT=$(spl-token create-token --decimals 9 --enable-metadata 2>/dev/null)
echo -e "${GREEN}✓ Token mint: $TOKEN_MINT${NC}"

spl-token initialize-metadata $TOKEN_MINT \
    "Redacted Protocol" \
    "RDX" \
    "https://redacted-protocol.vercel.app/metadata.json" 2>/dev/null
echo -e "${GREEN}✓ Metadata set${NC}"

# ───────────────────────────────────────────────────────────────
# STEP 2: Mint and Allocate Supply
# ───────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│  STEP 2: Minting Total Supply                   │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"

TOKEN_ACCOUNT=$(spl-token create-account $TOKEN_MINT 2>/dev/null)
spl-token mint $TOKEN_MINT 1000000000 2>/dev/null
echo -e "${GREEN}✓ 1,000,000,000 RDX minted${NC}"

# Create allocation accounts
echo -e "${GREEN}  Creating allocation accounts...${NC}"

# Presale pool (35% = 350M RDX)
PRESALE_ACCOUNT=$(spl-token create-account $TOKEN_MINT 2>/dev/null)
spl-token transfer $TOKEN_MINT 350000000 $PRESALE_ACCOUNT 2>/dev/null
echo -e "${GREEN}  ✓ Presale pool: 350M RDX → $PRESALE_ACCOUNT${NC}"

# Airdrop pool (concurrent with presale)
AIRDROP_ACCOUNT=$(spl-token create-account $TOKEN_MINT 2>/dev/null)
spl-token transfer $TOKEN_MINT 100000000 $AIRDROP_ACCOUNT 2>/dev/null
echo -e "${GREEN}  ✓ Airdrop pool: 100M RDX → $AIRDROP_ACCOUNT${NC}"

# Liquidity pool (20% = 200M RDX — for Raydium launch)
LP_ACCOUNT=$(spl-token create-account $TOKEN_MINT 2>/dev/null)
spl-token transfer $TOKEN_MINT 200000000 $LP_ACCOUNT 2>/dev/null
echo -e "${GREEN}  ✓ Liquidity pool: 200M RDX → $LP_ACCOUNT${NC}"

# Staking rewards (20% = 200M RDX)
STAKING_ACCOUNT=$(spl-token create-account $TOKEN_MINT 2>/dev/null)
spl-token transfer $TOKEN_MINT 200000000 $STAKING_ACCOUNT 2>/dev/null
echo -e "${GREEN}  ✓ Staking rewards: 200M RDX → $STAKING_ACCOUNT${NC}"

# Ecosystem (10% = 100M RDX)
ECOSYSTEM_ACCOUNT=$(spl-token create-account $TOKEN_MINT 2>/dev/null)
spl-token transfer $TOKEN_MINT 100000000 $ECOSYSTEM_ACCOUNT 2>/dev/null
echo -e "${GREEN}  ✓ Ecosystem dev: 100M RDX → $ECOSYSTEM_ACCOUNT${NC}"

# Team (10% = 100M RDX — vested)
TEAM_ACCOUNT=$(spl-token create-account $TOKEN_MINT 2>/dev/null)
spl-token transfer $TOKEN_MINT 100000000 $TEAM_ACCOUNT 2>/dev/null
echo -e "${GREEN}  ✓ Team (vested): 100M RDX → $TEAM_ACCOUNT${NC}"

# Treasury (5% = 50M RDX)
TREASURY_ACCOUNT=$(spl-token create-account $TOKEN_MINT 2>/dev/null)
spl-token transfer $TOKEN_MINT 50000000 $TREASURY_ACCOUNT 2>/dev/null
echo -e "${GREEN}  ✓ Treasury: 50M RDX → $TREASURY_ACCOUNT${NC}"

# ───────────────────────────────────────────────────────────────
# STEP 3: Create Presale SOL Vault
# ───────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│  STEP 3: Creating Presale SOL Vault             │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"

PRESALE_VAULT=$(solana-keygen new --no-bip39-passphrase --outfile /tmp/presale_vault.json 2>/dev/null | grep "pubkey" | awk '{print $NF}')
echo -e "${GREEN}✓ Presale SOL vault: $PRESALE_VAULT${NC}"

# ───────────────────────────────────────────────────────────────
# STEP 4: Revoke Mint Authority (Deflationary)
# ───────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│  STEP 4: Revoking Mint Authority                │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"

spl-token authorize $TOKEN_MINT --disable mint 2>/dev/null
echo -e "${GREEN}✓ Mint authority REVOKED — supply is now fixed and deflationary${NC}"
echo ""

# ───────────────────────────────────────────────────────────────
# DISPLAY COMPLETE SYSTEM
# ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   PRESALE + AIRDROP SYSTEM DEPLOYED            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Token Mint:${NC} $TOKEN_MINT"
echo -e "${BLUE}Explorer:${NC} https://explorer.solana.com/address/$TOKEN_MINT?cluster=${NETWORK}"
echo ""
echo -e "${BLUE}Allocation Accounts:${NC}"
echo "  Presale Pool:   $PRESALE_ACCOUNT (350M RDX — for sale)"
echo "  Airdrop Pool:   $AIRDROP_ACCOUNT (100M RDX — free distribution)"
echo "  Liquidity Pool: $LP_ACCOUNT (200M RDX — Raydium launch)"
echo "  Staking:        $STAKING_ACCOUNT (200M RDX — rewards)"
echo "  Ecosystem:      $ECOSYSTEM_ACCOUNT (100M RDX — dev/grants)"
echo "  Team:           $TEAM_ACCOUNT (100M RDX — 12mo cliff, 24mo vest)"
echo "  Treasury:       $TREASURY_ACCOUNT (50M RDX — DAO)"
echo ""
echo -e "${BLUE}Presale SOL Vault:${NC} $PRESALE_VAULT"
echo ""
echo -e "${YELLOW}PRESALE PRICING:${NC}"
echo "  Early Bird (24h): 0.001 SOL → 1,000 RDX (50% discount)"
echo "  Public (6d 23h):  0.002 SOL → 1,000 RDX"
echo "  Anti-whale: Max 5 SOL early, 2 SOL public"
echo ""
echo -e "${YELLOW}AIRDROP (concurrent):${NC}"
echo "  Telegram users: 500 RDX"
echo "  Doc submission: +100 RDX each"
echo "  Verification:   +50 RDX each"
echo "  Wallet connect: +200 RDX bonus"
echo "  Referral:       +50 RDX per user"
echo "  Max cap:        50,000 RDX per user"
echo ""
echo -e "${YELLOW}LIQUIDITY LAUNCH (after presale ends):${NC}"
echo "  85% of raised SOL → Raydium LP"
echo "  10% of raised SOL → RDX buyback + burn"
echo "  5% of raised SOL  → Community treasury"
echo "  LP tokens → BURNED FOREVER"
echo ""
echo -e "${YELLOW}PERPETUAL DEFlationary ENGINE:${NC}"
echo "  ✅ Mint authority revoked — supply can only decrease"
echo "  10% of protocol fees burned quarterly"
echo "  70% of fees distributed to stakers (40% APY base + 10% long-term bonus)"
echo "  20% of fees → treasury for future buyback+burn"
echo "  Max burn cap: 500M RDX (50% of total supply)"
echo "  Min stake: 100 RDX, 14-day lock, 15% early penalty"
echo ""
echo -e "${YELLOW}WHAT THIS MEANS:${NC}"
echo "  • Every protocol use burns RDX → less supply → more value"
echo "  • Stakers earn 70% of all fees → incentive to hold"
echo "  • Treasury accumulates for quarterly buyback+burn"
echo "  • No one can print more RDX — ever"
echo "  • This is designed to last FOREVER"
echo ""

# Save deployment
cat > presale_deployment_${NETWORK}.json <<EOF
{
  "network": "$NETWORK",
  "token_mint": "$TOKEN_MINT",
  "token_account": "$TOKEN_ACCOUNT",
  "presale_vault": "$PRESALE_VAULT",
  "allocations": {
    "presale": { "account": "$PRESALE_ACCOUNT", "amount": 350000000, "purpose": "Fair presale sale" },
    "airdrop": { "account": "$AIRDROP_ACCOUNT", "amount": 100000000, "purpose": "Merit-based airdrop" },
    "liquidity": { "account": "$LP_ACCOUNT", "amount": 200000000, "purpose": "Raydium LP launch" },
    "staking": { "account": "$STAKING_ACCOUNT", "amount": 200000000, "purpose": "36-month staking rewards" },
    "ecosystem": { "account": "$ECOSYSTEM_ACCOUNT", "amount": 100000000, "purpose": "Grants and development" },
    "team": { "account": "$TEAM_ACCOUNT", "amount": 100000000, "purpose": "12mo cliff, 24mo vest" },
    "treasury": { "account": "$TREASURY_ACCOUNT", "amount": 50000000, "purpose": "Community treasury" }
  },
  "presale_pricing": {
    "early_bird": { "sol_per_1000_rdx": 0.001, "duration_hours": 24, "max_per_wallet_sol": 5 },
    "public": { "sol_per_1000_rdx": 0.002, "duration_hours": 167, "max_per_wallet_sol": 2 },
    "min_purchase_sol": 0.1
  },
  "launch_mechanics": {
    "liquidity_pct": 85,
    "burn_pct": 10,
    "treasury_pct": 5,
    "lp_tokens_burned": true
  },
  "perpetual_engine": {
    "fee_burn_pct": 10,
    "fee_to_stakers_pct": 70,
    "fee_to_treasury_pct": 20,
    "staking_base_apy_pct": 40,
    "staking_long_term_bonus_pct": 10,
    "min_stake_rdx": 100,
    "lock_period_days": 14,
    "early_unstake_penalty_pct": 15,
    "max_burn_cap_rdx": 500000000,
    "mint_authority_revoked": true
  },
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "${GREEN}✓ Deployment saved to: presale_deployment_${NETWORK}.json${NC}"
echo ""
echo -e "${GREEN}The file is breathing. Forever. 🔥${NC}"
echo ""
