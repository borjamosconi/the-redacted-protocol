//! $RDX Token Configuration — mirrors contracts/programs/rd-token/src/token_config.rs
//!
//! This is the runtime-side copy used by the agent and Telegram bot.

/// Total supply: 1 billion RDX
pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000_000;
pub const DECIMALS: u8 = 9;

pub mod distribution {
    pub const COMMUNITY_AIRDROP: u64 = 3500;  // 35%
    pub const LIQUIDITY_POOL: u64 = 2000;      // 20%
    pub const STAKING_REWARDS: u64 = 2000;     // 20%
    pub const ECOSYSTEM_DEV: u64 = 1000;       // 10%
    pub const TEAM_VESTED: u64 = 1000;          // 10%
    pub const TREASURY_DAO: u64 = 500;          // 5%
}

pub mod amounts {
    use super::*;
    pub fn community() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::COMMUNITY_AIRDROP }
    pub fn liquidity() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::LIQUIDITY_POOL }
    pub fn staking() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::STAKING_REWARDS }
    pub fn ecosystem() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::ECOSYSTEM_DEV }
    pub fn team() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::TEAM_VESTED }
    pub fn treasury() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::TREASURY_DAO }
    pub fn verify_distribution() -> bool {
        let total_bps = distribution::COMMUNITY_AIRDROP
            + distribution::LIQUIDITY_POOL
            + distribution::STAKING_REWARDS
            + distribution::ECOSYSTEM_DEV
            + distribution::TEAM_VESTED
            + distribution::TREASURY_DAO;
        if total_bps != 10000 { return false; }
        let total = community() + liquidity() + staking() + ecosystem() + team() + treasury();
        total == TOTAL_SUPPLY
    }
}

/// Fee config: 70/20/10 split (stakers/treasury/burn)
pub mod fees {
    pub const PROCESS_FEE: u64 = 100_000_000; // 0.1 RDX
    pub const STAKERS_PCT: u64 = 70;
    pub const TREASURY_PCT: u64 = 20;
    pub const BURN_PCT: u64 = 10;
}

/// Staking: 100 RDX min, 14d lock, 40% APY, +10% bonus >90d
pub mod staking {
    pub const MIN_STAKE: u64 = 100_000_000_000;
    pub const UNLOCK_PERIOD_SECS: i64 = 14 * 24 * 3600;
    pub const APY_BPS: u64 = 4000;
    pub const LONG_TERM_BONUS_BPS: u64 = 1000;
    pub const LONG_TERM_THRESHOLD_SECS: i64 = 90 * 24 * 3600;
    pub const EARLY_PENALTY_BPS: u64 = 1500;
    pub const MAX_EPOCH_DRAWDOWN_PCT: u64 = 5;
}

/// Airdrop: balanced, sybil-resistant
pub mod airdrop {
    pub const TELEGRAM_USER_AMOUNT: u64 = 500_000_000_000;   // 500 RDX
    pub const WALLET_CONNECT_BONUS: u64 = 200_000_000_000;   // 200 RDX
    pub const DOCUMENT_SUBMIT_REWARD: u64 = 100_000_000_000; // 100 RDX
    pub const FRAGMENT_VERIFY_REWARD: u64 = 50_000_000_000;  // 50 RDX
    pub const FRAGMENT_PUBLISH_REWARD: u64 = 25_000_000_000; // 25 RDX
    pub const REFERRAL_REWARD: u64 = 50_000_000_000;         // 50 RDX
    pub const MAX_PER_USER_CAP: u64 = 50_000_000_000_000;    // 50K RDX
}

/// Vesting: team 12mo cliff, 24mo vest
pub mod vesting {
    pub const TEAM_CLIFF_SECS: i64 = 12 * 30 * 24 * 3600;
    pub const TEAM_VESTING_SECS: i64 = 24 * 30 * 24 * 3600;
    pub const ECOSYSTEM_CLIFF_SECS: i64 = 3 * 30 * 24 * 3600;
    pub const ECOSYSTEM_VESTING_SECS: i64 = 18 * 30 * 24 * 3600;
    pub const STAKING_RELEASE_SECS: i64 = 36 * 30 * 24 * 3600;
    pub const LIQUIDITY_LOCK_SECS: i64 = 6 * 30 * 24 * 3600;
}

/// Burn mechanics
pub mod burn {
    pub const FEE_BURN_PCT: u64 = 10;
    pub const QUARTERLY_BURN_ENABLED: bool = true;
    pub const QUARTERLY_BUYBACK_MIN: u64 = 10_000_000_000_000;
    pub const MAX_BURN_PER_TX: u64 = 1_000_000_000_000;
    pub const BURN_ADDRESS: &str = "1nc1nerator11111111111111111111111111111111";
}
