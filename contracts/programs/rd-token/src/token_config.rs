//! # $RDX Token Configuration — Strong Tokenomics
//!
//! ┌──────────────────────────────────────────────────────────────────┐
//! │                    $RDX — REDACTED PROTOCOL                     │
//! │                        Tokenomics v2.0                          │
//! │                                                                 │
//! │  NETWORK:     Solana (SPL Token)                                │
//! │  TOTAL SUPPLY: 1,000,000,000 $RDX (1 Billion)                  │
//! │  DECIMALS:    9                                                 │
//! │  DEFlationary: ✅ Fee burns + quarterly buyback & burn          │
//! │  MINT AUTH:   Revoked after full distribution                   │
//! │  FREEZE AUTH: Revoked after distribution                        │
//! │                                                                 │
//! │  ═══════════════ DISTRIBUTION ═══════════════                   │
//! │                                                                 │
//! │  ┌────────────────────────┬───────┬──────────────────────────┐  │
//! │  │ Allocation             │  %    │ Amount (RDX)             │  │
//! │  ├────────────────────────┼───────┼──────────────────────────┤  │
//! │  │ Community & Airdrop    │ 35%   │ 350,000,000              │  │
//! │  │ Liquidity Pool (Rayd.) │ 20%   │ 200,000,000              │  │
//! │  │ Staking Rewards        │ 20%   │ 200,000,000              │  │
//! │  │ Ecosystem Development  │ 10%   │ 100,000,000              │  │
//! │  │ Team & Advisors        │ 10%   │ 100,000,000              │  │
//! │  │ Treasury / DAO         │  5%   │  50,000,000              │  │
//! │  └────────────────────────┴───────┴──────────────────────────┘  │
//! │                                                                 │
//! │  ═══════════════ VESTING SCHEDULE ═══════════════               │
//! │                                                                 │
//! │  Community/Airdrop:  Immediate                                 │
//! │  Liquidity Pool:     Locked 6 months, then LP burn             │
//! │  Staking Rewards:    Linear release over 36 months             │
//! │  Ecosystem:          3mo cliff, 18mo linear vest               │
//! │  Team:               12mo cliff, 24mo linear vest              │
//! │  Treasury:           DAO-governed release                      │
//! │                                                                 │
//! │  ═══════════════ TOKEN UTILITY ═══════════════                  │
//! │                                                                 │
//! │  1. Pay for AI document processing (0.1 RDX/doc)               │
//! │  2. Earn rewards for submitting redacted documents             │
//! │  3. Stake to earn 70% of protocol fees                         │
//! │  4. Vote on governance proposals                               │
//! │  5. Access premium API tier                                    │
//! │  6. Burn mechanic: 10% of all fees permanently destroyed       │
//! │                                                                 │
//! │  ═══════════════ DEFLATIONARY MECHANICS ═══════════════         │
//! │                                                                 │
//! │  • 10% of every protocol fee burned forever                    │
//! │  • Quarterly buyback & burn (DAO-governed)                     │
//! │  • Max burn cap: 500M RDX (50% of total supply)               │
//! │  • No mint after revocation — supply only decreases            │
//! │                                                                 │
//! │  ═══════════════ STAKING ═══════════════                        │
//! │                                                                 │
//! │  • Minimum stake: 100 RDX                                      │
//! │  • Lock period: 14 days (increased from 7 for stability)       │
//! │  • Base APY: 40% (sustainable, not inflated)                   │
//! │  • Bonus APY: +10% for staking >90 days                        │
//! │  • Early unstake penalty: 15% (redistributed to stakers)       │
//! │  • 70% of protocol fees distributed to stakers                 │
//! │                                                                 │
//! │  ═══════════════ AIRDROP ═══════════════                        │
//! │                                                                 │
//! │  • Telegram early user:     500 RDX                            │
//! │  • Document submitter:      100 RDX per doc                    │
//! │  • Fragment verifier:       50 RDX per verify                  │
//! │  • Fragment publisher:      25 RDX per publish                 │
//! │  • Referral:                50 RDX per referred user           │
//! │  • Dashboard wallet connect: 200 RDX (one-time)                │
//! │  • Max per user cap:        50,000 RDX                         │
//! │                                                                 │
//! └──────────────────────────────────────────────────────────────────┘

// ───────────────────────────────────────────────────────────────────
// CORE TOKEN CONSTANTS
// ───────────────────────────────────────────────────────────────────

/// ⚠️ UPDATE THIS after creating the token with:
/// spl-token create-token --decimals 9
pub const TOKEN_MINT: &str = "REPLACEME_TOKEN_MINT_ADDRESS";

/// Token program ID for the rd_token Anchor program
pub const TOKEN_PROGRAM_ID: &str = "RDtok1111111111111111111111111111111111111";

/// Total supply: 1 billion RDX (with 9 decimals)
pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000_000; // 1B * 10^9

/// Decimals
pub const DECIMALS: u8 = 9;

/// Max percentage of supply that can ever be burned (prevents over-burn)
pub const MAX_BURN_CAP_PCT_BPS: u64 = 5000; // 50%

// ───────────────────────────────────────────────────────────────────
// DISTRIBUTION (basis points: 10000 = 100%)
// ───────────────────────────────────────────────────────────────────

pub mod distribution {
    /// Community & Airdrop — 35%
    pub const COMMUNITY_AIRDROP_BPS: u64 = 3500;

    /// Liquidity Pool (Raydium) — 20%
    pub const LIQUIDITY_POOL_BPS: u64 = 2000;

    /// Staking Rewards — 20%
    pub const STAKING_REWARDS_BPS: u64 = 2000;

    /// Ecosystem Development (grants, partnerships, marketing) — 10%
    pub const ECOSYSTEM_DEV_BPS: u64 = 1000;

    /// Team & Advisors — 10% (12mo cliff, 24mo vest)
    pub const TEAM_VESTED_BPS: u64 = 1000;

    /// Treasury / DAO — 5%
    pub const TREASURY_DAO_BPS: u64 = 500;
}

/// Calculated amounts
pub mod amounts {
    use super::{TOTAL_SUPPLY, distribution::*};

    pub fn community_airdrop() -> u64 {
        TOTAL_SUPPLY * COMMUNITY_AIRDROP_BPS / 10000
    }
    pub fn liquidity_pool() -> u64 {
        TOTAL_SUPPLY * LIQUIDITY_POOL_BPS / 10000
    }
    pub fn staking_rewards() -> u64 {
        TOTAL_SUPPLY * STAKING_REWARDS_BPS / 10000
    }
    pub fn ecosystem_dev() -> u64 {
        TOTAL_SUPPLY * ECOSYSTEM_DEV_BPS / 10000
    }
    pub fn team_vested() -> u64 {
        TOTAL_SUPPLY * TEAM_VESTED_BPS / 10000
    }
    pub fn treasury_dao() -> u64 {
        TOTAL_SUPPLY * TREASURY_DAO_BPS / 10000
    }

    /// Verify distribution adds to exactly 100%
    pub fn verify_distribution() -> bool {
        let total_bps = COMMUNITY_AIRDROP_BPS
            + LIQUIDITY_POOL_BPS
            + STAKING_REWARDS_BPS
            + ECOSYSTEM_DEV_BPS
            + TEAM_VESTED_BPS
            + TREASURY_DAO_BPS;
        if total_bps != 10000 { return false; }

        let total = community_airdrop() + liquidity_pool() + staking_rewards()
            + ecosystem_dev() + team_vested() + treasury_dao();
        total == TOTAL_SUPPLY
    }
}

// ───────────────────────────────────────────────────────────────────
// FEE CONFIGURATION (Deflationary)
// ───────────────────────────────────────────────────────────────────

pub mod fees {
    /// Fee per document processing (in base units: 10^-9 = 1 RDX)
    pub const PROCESS_FEE: u64 = 100_000_000; // 0.1 RDX

    /// Fee distribution on protocol revenue
    pub const STAKERS_PCT: u64 = 70;    // 70% to stakers
    pub const TREASURY_PCT: u64 = 20;   // 20% to treasury
    pub const BURN_PCT: u64 = 10;       // 10% burned forever
}

// ───────────────────────────────────────────────────────────────────
// STAKING (Strengthened for long-term holders)
// ───────────────────────────────────────────────────────────────────

pub mod staking {
    /// Minimum stake: 100 RDX (increased from 10 to filter sybil)
    pub const MIN_STAKE: u64 = 100_000_000_000;

    /// Lock period: 14 days (increased from 7 for stability)
    pub const UNLOCK_PERIOD_SECS: i64 = 14 * 24 * 3600;

    /// Base APY: 40% (sustainable, not inflated hype number)
    pub const APY_BPS: u64 = 4000;

    /// Bonus APY for staking >90 days: +10% (total 50%)
    pub const LONG_TERM_BONUS_BPS: u64 = 1000;
    pub const LONG_TERM_THRESHOLD_SECS: i64 = 90 * 24 * 3600;

    /// Early unstake penalty: 15% (redistributed to remaining stakers)
    pub const EARLY_UNSTAKE_PENALTY_BPS: u64 = 1500;

    /// Max staking rewards pool drawdown per epoch (prevents drain)
    pub const MAX_EPOCH_DRAWDOWN_PCT: u64 = 5; // 5% of remaining pool
}

// ───────────────────────────────────────────────────────────────────
// AIRDROP (Balanced — prevents farming, rewards real users)
// ───────────────────────────────────────────────────────────────────

pub mod airdrop {
    /// Telegram early user: 500 RDX (reduced from 1000 to prevent sybil)
    pub const TELEGRAM_USER_AMOUNT: u64 = 500_000_000_000;

    /// Dashboard wallet connect bonus: 200 RDX (one-time)
    pub const WALLET_CONNECT_BONUS: u64 = 200_000_000_000;

    /// Reward per submitted document: 100 RDX
    pub const DOCUMENT_SUBMIT_REWARD: u64 = 100_000_000_000;

    /// Reward per verified fragment: 50 RDX
    pub const FRAGMENT_VERIFY_REWARD: u64 = 50_000_000_000;

    /// Reward per published fragment: 25 RDX
    pub const FRAGMENT_PUBLISH_REWARD: u64 = 25_000_000_000;

    /// Referral reward: 50 RDX per referred user
    pub const REFERRAL_REWARD: u64 = 50_000_000_000;

    /// Max airdrop per user cap: 50,000 RDX (prevents whale farming)
    pub const MAX_PER_USER_CAP: u64 = 50_000_000_000_000;
}

// ───────────────────────────────────────────────────────────────────
// VESTING SCHEDULES (Team locked long-term)
// ───────────────────────────────────────────────────────────────────

pub mod vesting {
    /// Team cliff: 12 months (increased from 6 — shows commitment)
    pub const TEAM_CLIFF_SECS: i64 = 12 * 30 * 24 * 3600;

    /// Team vesting: 24 months linear after cliff
    pub const TEAM_VESTING_SECS: i64 = 24 * 30 * 24 * 3600;

    /// Ecosystem dev: 3mo cliff, 18mo vest
    pub const ECOSYSTEM_CLIFF_SECS: i64 = 3 * 30 * 24 * 3600;
    pub const ECOSYSTEM_VESTING_SECS: i64 = 18 * 30 * 24 * 3600;

    /// Staking rewards release: 36 months linear
    pub const STAKING_RELEASE_SECS: i64 = 36 * 30 * 24 * 3600;

    /// Liquidity lock: 6 months before LP tokens can be burned
    pub const LIQUIDITY_LOCK_SECS: i64 = 6 * 30 * 24 * 3600;
}

// ───────────────────────────────────────────────────────────────────
// BURN MECHANICS (Deflationary pressure)
// ───────────────────────────────────────────────────────────────────

pub mod burn {
    /// Percentage of protocol fees permanently burned
    pub const FEE_BURN_PCT: u64 = 10;

    /// Quarterly buyback & burn enabled (DAO-governed)
    pub const QUARTERLY_BURN_ENABLED: bool = true;

    /// Minimum buyback amount per quarter (10,000 RDX)
    pub const QUARTERLY_BUYBACK_MIN: u64 = 10_000_000_000_000;

    /// Max burn per single transaction (prevents accidental burns)
    pub const MAX_BURN_PER_TX: u64 = 1_000_000_000_000; // 1000 RDX

    /// Burn wallet address (solana burn address)
    pub const BURN_ADDRESS: &str = "1nc1nerator11111111111111111111111111111111";
}
