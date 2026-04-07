//! # RDX Token Configuration
//!
//! All token parameters defined here.
//! When you create the SPL token, update TOKEN_MINT with the actual address.
//!
//! ┌──────────────────────────────────────────────────────┐
//! │          $RDX Tokenomics                            │
//! │                                                      │
//! │  Total Supply:    1,000,000,000 $RDX (1B)           │
//! │  Decimals:        9                                 │
//! │  Mint Authority:  YOUR_WALLET                       │
//! │  Freeze Auth:     REVOQUED after distribution       │
//! │                                                      │
//! │  Distribution:                                      │
//! │  ├─ Community/Airdrop    40%   400,000,000 $RDX     │
//! │  ├─ Liquidity Pool       20%   200,000,000 $RDX     │
//! │  ├─ Staking Rewards      15%   150,000,000 $RDX     │
//! │  ├─ Team (vested)        15%   150,000,000 $RDX     │
//! │  ├─ Treasury/DAO         10%   100,000,000 $RDX     │
//! │                                                      │
//! │  Vesting Schedule:                                  │
//! │  ├─ Community:   Immediate (airdrop)                 │
//! │  ├─ Liquidity:   Immediate + LP burn                 │
//! │  ├─ Staking:     Linear over 24 months               │
//! │  ├─ Team:        6mo cliff, 18mo vest                │
//! │  └─ Treasury:    As voted by DAO                     │
//! │                                                      │
//! │  Utility:                                           │
//! │  ├─ Pay for document processing (0.1 $RDX)          │
//! │  ├─ Earn rewards for submitting redacted docs       │
//! │  ├─ Stake to earn % of protocol fees                 │
//! │  ├─ Vote on governance proposals                     │
//! │  ├─ Mint rare fragments as Archivo 0 NFTs           │
//! │  └─ Access premium search API                        │
//! └──────────────────────────────────────────────────────┘

/// ⚠️ UPDATE THIS after creating the token with:
/// spl-token create-token --decimals 9
pub const TOKEN_MINT: &str = "REPLACEME_TOKEN_MINT_ADDRESS";

/// Total supply: 1 billion RDX (with 9 decimals)
pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000_000; // 1B * 10^9

/// Decimals
pub const DECIMALS: u8 = 9;

/// Distribution percentages (basis points: 10000 = 100%)
pub mod distribution {
    pub const COMMUNITY_AIRDROP_BPS: u64 = 4000;  // 40%
    pub const LIQUIDITY_POOL_BPS: u64 = 2000;      // 20%
    pub const STAKING_REWARDS_BPS: u64 = 1500;     // 15%
    pub const TEAM_VESTED_BPS: u64 = 1500;          // 15%
    pub const TREASURY_DAO_BPS: u64 = 1000;         // 10%
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
    pub fn team_vested() -> u64 {
        TOTAL_SUPPLY * TEAM_VESTED_BPS / 10000
    }
    pub fn treasury_dao() -> u64 {
        TOTAL_SUPPLY * TREASURY_DAO_BPS / 10000
    }
}

/// Fee configuration
pub mod fees {
    /// Fee per document processing (in lamports of RDX = 10^-9)
    pub const PROCESS_FEE: u64 = 100_000_000; // 0.1 RDX

    /// Fee distribution on protocol revenue
    pub const STAKERS_PCT: u64 = 70;    // 70% to stakers
    pub const TREASURY_PCT: u64 = 20;   // 20% to treasury
    pub const BURN_PCT: u64 = 10;       // 10% burned
}

/// Staking parameters
pub mod staking {
    /// Minimum stake amount (10 RDX)
    pub const MIN_STAKE: u64 = 10_000_000_000;

    /// Lock period for unstaking (7 days in seconds)
    pub const UNLOCK_PERIOD_SECS: i64 = 7 * 24 * 3600;

    /// APY basis points (5000 = 50% APY)
    pub const APY_BPS: u64 = 5000;

    /// Early unstake penalty (10%)
    pub const EARLY_UNSTAKE_PENALTY_BPS: u64 = 1000;
}

/// Airdrop configuration
pub mod airdrop {
    /// Initial airdrop per Telegram user (1000 RDX)
    pub const TELEGRAM_USER_AMOUNT: u64 = 1_000_000_000_000;

    /// Reward per submitted document (100 RDX)
    pub const DOCUMENT_SUBMIT_REWARD: u64 = 100_000_000_000;

    /// Reward per verified fragment (50 RDX)
    pub const FRAGMENT_VERIFY_REWARD: u64 = 50_000_000_000;

    /// Reward per published fragment (25 RDX)
    pub const FRAGMENT_PUBLISH_REWARD: u64 = 25_000_000_000;

    /// Referral reward (50 RDX per referred user)
    pub const REFERRAL_REWARD: u64 = 50_000_000_000;
}
