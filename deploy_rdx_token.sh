#!/bin/bash
# deploy_rdx_token.sh - Deploy $RDX Token to Solana
# Strong Tokenomics v2.0 — Deflationary, Sybil-Resistant
# Usage: ./deploy_rdx_token.sh [--network devnet|mainnet-beta]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   REDACTED PROTOCOL — $RDX Token Deployment    ║${NC}"
echo -e "${GREEN}║   Strong Tokenomics v2.0                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
NETWORK="devnet"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --network) NETWORK="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${YELLOW}Network: ${NETWORK}${NC}"
echo ""

# Check dependencies
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: solana CLI not found. Install with:${NC}"
    echo "  sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.15/install)\""
    exit 1
fi

if ! command -v spl-token &> /dev/null; then
    echo -e "${RED}Error: spl-token CLI not found. Install with:${NC}"
    echo "  cargo install spl-token-cli"
    exit 1
fi

# Configure network
solana config set --url ${NETWORK}
echo -e "${GREEN}✓ Solana CLI configured for ${NETWORK}${NC}"

# Check wallet
WALLET_BALANCE=$(solana balance --lamports 2>/dev/null || echo "0")
if [ "$WALLET_BALANCE" = "0" ]; then
    echo -e "${YELLOW}Warning: Wallet balance is low.${NC}"
    if [ "$NETWORK" = "devnet" ]; then
        echo -e "${YELLOW}Requesting airdrop...${NC}"
        solana airdrop 2
        echo -e "${GREEN}✓ Airdrop completed${NC}"
    else
        echo -e "${RED}Cannot airdrop on mainnet. Please fund your wallet.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}              $RDX TOKENOMICS v2.0               ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Token Details:${NC}"
echo "  Name:        Redacted Protocol"
echo "  Symbol:      RDX"
echo "  Decimals:    9"
echo "  Total Supply: 1,000,000,000 RDX (1 Billion)"
echo ""
echo -e "${YELLOW}Distribution:${NC}"
echo "  ┌────────────────────────┬───────┬──────────────────┐"
echo "  │ Allocation             │  %    │ Amount (RDX)     │"
echo "  ├────────────────────────┼───────┼──────────────────┤"
echo "  │ Community & Airdrop    │ 35%   │ 350,000,000      │"
echo "  │ Liquidity Pool         │ 20%   │ 200,000,000      │"
echo "  │ Staking Rewards        │ 20%   │ 200,000,000      │"
echo "  │ Ecosystem Development  │ 10%   │ 100,000,000      │"
echo "  │ Team & Advisors        │ 10%   │ 100,000,000      │"
echo "  │ Treasury / DAO         │  5%   │  50,000,000      │"
echo "  └────────────────────────┴───────┴──────────────────┘"
echo ""
echo -e "${YELLOW}Vesting Schedule:${NC}"
echo "  Community/Airdrop:  Immediate"
echo "  Liquidity Pool:     Locked 6 months → LP burn"
echo "  Staking Rewards:    36 months linear release"
echo "  Ecosystem Dev:      3mo cliff, 18mo linear"
echo "  Team:               12mo cliff, 24mo linear"
echo "  Treasury:           DAO-governed"
echo ""
echo -e "${YELLOW}Deflationary Mechanics:${NC}"
echo "  • 10% of protocol fees burned forever"
echo "  • Quarterly buyback & burn (DAO-governed)"
echo "  • Max burn cap: 500M RDX (50% of supply)"
echo "  • Mint authority revoked after distribution"
echo ""
echo -e "${YELLOW}Staking:${NC}"
echo "  • Min stake: 100 RDX"
echo "  • Lock: 14 days"
echo "  • Base APY: 40% (+10% bonus for >90 days)"
echo "  • 70% of protocol fees to stakers"
echo "  • 15% early unstake penalty"
echo ""

read -p "Continue with token deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Step 1: Create token mint
echo ""
echo -e "${YELLOW}Step 1/6: Creating token mint (9 decimals)...${NC}"
TOKEN_MINT=$(spl-token create-token --decimals 9 --enable-metadata)
echo -e "${GREEN}✓ Token mint created: $TOKEN_MINT${NC}"

# Step 2: Initialize metadata
echo ""
echo -e "${YELLOW}Step 2/6: Initializing metadata...${NC}"
spl-token initialize-metadata $TOKEN_MINT \
    "Redacted Protocol" \
    "RDX" \
    "https://redacted-protocol.vercel.app/metadata.json"
echo -e "${GREEN}✓ Metadata initialized${NC}"

# Step 3: Create token accounts
echo ""
echo -e "${YELLOW}Step 3/6: Creating associated token account...${NC}"
TOKEN_ACCOUNT=$(spl-token create-account $TOKEN_MINT)
echo -e "${GREEN}✓ Token account created: $TOKEN_ACCOUNT${NC}"

# Step 4: Mint full supply
echo ""
echo -e "${YELLOW}Step 4/6: Minting total supply (1,000,000,000 RDX)...${NC}"
spl-token mint $TOKEN_MINT 1000000000
echo -e "${GREEN}✓ Total supply minted${NC}"

# Step 5: Create sub-accounts for each allocation
echo ""
echo -e "${YELLOW}Step 5/6: Creating allocation accounts...${NC}"

# Community/Airdrop (35%)
AIRDROP_ACCOUNT=$(spl-token create-account $TOKEN_MINT)
spl-token transfer $TOKEN_MINT 350000000 $AIRDROP_ACCOUNT
echo -e "${GREEN}  ✓ Airdrop: 350M RDX → $AIRDROP_ACCOUNT${NC}"

# Liquidity Pool (20%)
LP_ACCOUNT=$(spl-token create-account $TOKEN_MINT)
spl-token transfer $TOKEN_MINT 200000000 $LP_ACCOUNT
echo -e "${GREEN}  ✓ Liquidity Pool: 200M RDX → $LP_ACCOUNT${NC}"

# Staking Rewards (20%)
STAKING_ACCOUNT=$(spl-token create-account $TOKEN_MINT)
spl-token transfer $TOKEN_MINT 200000000 $STAKING_ACCOUNT
echo -e "${GREEN}  ✓ Staking Rewards: 200M RDX → $STAKING_ACCOUNT${NC}"

# Ecosystem Dev (10%)
ECOSYSTEM_ACCOUNT=$(spl-token create-account $TOKEN_MINT)
spl-token transfer $TOKEN_MINT 100000000 $ECOSYSTEM_ACCOUNT
echo -e "${GREEN}  ✓ Ecosystem Dev: 100M RDX → $ECOSYSTEM_ACCOUNT${NC}"

# Team (10%)
TEAM_ACCOUNT=$(spl-token create-account $TOKEN_MINT)
spl-token transfer $TOKEN_MINT 100000000 $TEAM_ACCOUNT
echo -e "${GREEN}  ✓ Team: 100M RDX → $TEAM_ACCOUNT${NC}"

# Treasury (5%)
TREASURY_ACCOUNT=$(spl-token create-account $TOKEN_MINT)
spl-token transfer $TOKEN_MINT 50000000 $TREASURY_ACCOUNT
echo -e "${GREEN}  ✓ Treasury: 50M RDX → $TREASURY_ACCOUNT${NC}"

# Step 6: Revoke mint authority
echo ""
echo -e "${YELLOW}Step 6/6: Revoking mint authority...${NC}"
spl-token authorize $TOKEN_MINT --disable mint
echo -e "${GREEN}✓ Mint authority revoked — supply is now fixed and deflationary${NC}"

# Display summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   $RDX TOKEN DEPLOYMENT COMPLETE                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Token Mint Address:${NC} $TOKEN_MINT"
echo -e "${BLUE}Explorer:${NC} https://explorer.solana.com/address/$TOKEN_MINT?cluster=${NETWORK}"
echo ""
echo -e "${BLUE}Allocation Accounts:${NC}"
echo "  Airdrop:    $AIRDROP_ACCOUNT (350M)"
echo "  Liquidity:  $LP_ACCOUNT (200M)"
echo "  Staking:    $STAKING_ACCOUNT (200M)"
echo "  Ecosystem:  $ECOSYSTEM_ACCOUNT (100M)"
echo "  Team:       $TEAM_ACCOUNT (100M)"
echo "  Treasury:   $TREASURY_ACCOUNT (50M)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update contracts/programs/rd-token/src/token_config.rs with TOKEN_MINT"
echo "2. Update crates/rd-tools/src/token_config.rs with TOKEN_MINT"
echo "3. Create Raydium liquidity pool (requires OpenBook market ID)"
echo "4. Deploy Anchor contracts to devnet"
echo "5. Configure staking program with STAKING_ACCOUNT"
echo "6. Launch airdrop distribution"
echo ""

# Save deployment info
DEPLOY_FILE="token_deployment_${NETWORK}.json"
cat > $DEPLOY_FILE <<EOF
{
  "network": "$NETWORK",
  "token_name": "Redacted Protocol",
  "token_symbol": "RDX",
  "token_mint": "$TOKEN_MINT",
  "decimals": 9,
  "total_supply": "1000000000",
  "mint_authority_revoked": true,
  "allocations": {
    "airdrop": { "account": "$AIRDROP_ACCOUNT", "amount": 350000000, "pct": 35 },
    "liquidity": { "account": "$LP_ACCOUNT", "amount": 200000000, "pct": 20 },
    "staking": { "account": "$STAKING_ACCOUNT", "amount": 200000000, "pct": 20 },
    "ecosystem": { "account": "$ECOSYSTEM_ACCOUNT", "amount": 100000000, "pct": 10 },
    "team": { "account": "$TEAM_ACCOUNT", "amount": 100000000, "pct": 10 },
    "treasury": { "account": "$TREASURY_ACCOUNT", "amount": 50000000, "pct": 5 }
  },
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo -e "${GREEN}✓ Deployment info saved to: $DEPLOY_FILE${NC}"
echo ""
echo -e "${GREEN}Token is live. The file is breathing...${NC}"
