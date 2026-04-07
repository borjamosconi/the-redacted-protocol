# 🚀 Token Launch Checklist

## Pre-Launch (DO THESE FIRST)

### 1. Create the SPL Token
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create token (9 decimals)
spl-token create-token --decimals 9

# Create token account for your wallet
spl-token create-account <TOKEN_MINT>

# Mint initial supply (1B RDX)
spl-token mint <TOKEN_MINT> 1000000000

# ⚠️ Copy the TOKEN_MINT address — you'll need it everywhere!
```

### 2. Update Token Mint Address
Replace `REPLACEME_TOKEN_MINT_ADDRESS` in:
- `contracts/programs/rd-token/src/token_config.rs`
- `crates/rd-tools/src/token_config.rs`
- `scripts/launch-token.sh`

### 3. Fund Your Wallet
```bash
# Devnet airdrop
solana airdrop 10 --url devnet

# Or mainnet (you need real SOL)
```

---

## Phase 1: Deploy Contracts

```bash
# Build all contracts
cd contracts
anchor build

# Deploy to devnet first
anchor deploy --provider.cluster devnet

# Test everything works

# Then deploy to mainnet
anchor deploy --provider.cluster mainnet
```

### Contracts to Deploy (in order):
| # | Program | ID | Purpose |
|---|---------|---|---------|
| 1 | rd-fragment | `RDfrag...` | Fragment anchoring |
| 2 | rd-archive | `RDarch...` | Archivo 0 registry |
| 3 | rd-staking | `RDstk...` | Stake RDX → earn fees |
| 4 | rd-rewards | `RDrew...` | Distribute rewards |
| 5 | rd-treasury | `RDtr...` | Fee collection + governance |

---

## Phase 2: Liquidity (Raydium)

```bash
# Go to https://raydium.io/liquidity-pools/
# Create new pool: RDX/SOL
# Add initial liquidity:
#   - RDX: 200,000,000 tokens (20% of supply)
#   - SOL: $500-$2000 worth

# ⚠️ IMPORTANT: Lock or burn LP tokens
# Burn: Send LP tokens to dead address
# Lock: Use a vesting contract
```

---

## Phase 3: Airdrop Distribution

1. Export airdrop recipients from Telegram bot database
2. Collect Solana wallet addresses from users
3. Batch transfer:
```bash
# For each recipient
spl-token transfer <TOKEN_MINT> <AMOUNT> <RECIPIENT_WALLET>
```

### Airdrop amounts:
| Category | Amount per user | Est. users | Total |
|----------|----------------|------------|-------|
| Telegram users | 1,000 RDX | TBD | TBD |
| Document submitters | +100 RDX | TBD | TBD |
| Fragment verifiers | +50 RDX | TBD | TBD |
| Referrals | +50 RDX | TBD | TBD |

---

## Phase 4: Post-Launch

### Immediate (Day 1):
- [ ] Announce on Twitter with token address
- [ ] Post in Telegram channel
- [ ] Update DexScreener info (logo, socials, website)
- [ ] Submit to CoinGecko: https://www.coingecko.com/en/form/new-crypto-asset
- [ ] Submit to CoinMarketCap: https://coinmarketcap.com/self-service/coin/add-coin
- [ ] Post on Solana community channels

### Week 1:
- [ ] Activate staking rewards
- [ ] Enable fee collection
- [ ] Start Archivo 0 NFT minting
- [ ] Engage with community on Twitter/Telegram

### Week 2-4:
- [ ] Launch premium API
- [ ] Partner with journalists/researchers
- [ ] First governance vote
- [ ] Community events

---

## ⚠️ Security Checklist

- [ ] Revoke mint authority (after distribution)
- [ ] Revoke freeze authority
- [ ] Burn LP tokens (or lock in contract)
- [ ] Multi-sig for treasury (Squads Protocol)
- [ ] Audit contracts (OtterSec or Neodyme)
- [ ] Bug bounty program

---

## 🔗 Useful Links

- **Token Explorer**: https://solscan.io/token/<TOKEN_MINT>
- **Raydium Pool**: https://raydium.io/liquidity-pools/
- **DexScreener**: https://dexscreener.com/solana/<PAIR_ADDRESS>
- **CoinGecko**: https://www.coingecko.com/
- **Squads Multi-sig**: https://squads.so/
