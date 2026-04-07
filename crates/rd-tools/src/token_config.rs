//! RDX Token Configuration — all tokenomics constants.
//!
//! ⚠️ UPDATE TOKEN_MINT after creating the token!

/// ⚠️ REPLACE with actual mint address after: spl-token create-token --decimals 9
pub const TOKEN_MINT: &str = "REPLACEME_TOKEN_MINT_ADDRESS";

/// Total supply: 1B RDX with 9 decimals
pub const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000_000;
pub const DECIMALS: u8 = 9;

/// Distribution (basis points: 10000 = 100%)
pub mod distribution {
    pub const COMMUNITY_AIRDROP: u64 = 4000;
    pub const LIQUIDITY_POOL: u64 = 2000;
    pub const STAKING_REWARDS: u64 = 1500;
    pub const TEAM_VESTED: u64 = 1500;
    pub const TREASURY_DAO: u64 = 1000;
}

pub mod amounts {
    use super::*;
    pub fn community() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::COMMUNITY_AIRDROP }
    pub fn liquidity() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::LIQUIDITY_POOL }
    pub fn staking() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::STAKING_REWARDS }
    pub fn team() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::TEAM_VESTED }
    pub fn treasury() -> u64 { (TOTAL_SUPPLY / 10000) * distribution::TREASURY_DAO }
}

/// Protocol fees
pub mod fees {
    pub const PROCESS_FEE: u64 = 100_000_000; // 0.1 RDX
    pub const STAKERS_PCT: u64 = 70;
    pub const TREASURY_PCT: u64 = 20;
    pub const BURN_PCT: u64 = 10;
}

/// Staking params
pub mod staking {
    pub const MIN_STAKE: u64 = 10_000_000_000; // 10 RDX
    pub const UNLOCK_PERIOD_SECS: i64 = 7 * 24 * 3600; // 7 days
    pub const APY_BPS: u64 = 5000; // 50% APY
    pub const EARLY_PENALTY_BPS: u64 = 1000; // 10%
}

/// Airdrop rewards
pub mod airdrop {
    pub const TELEGRAM_USER_AMOUNT: u64 = 1_000_000_000_000; // 1000 RDX
    pub const DOCUMENT_SUBMIT_REWARD: u64 = 100_000_000_000; // 100 RDX
    pub const FRAGMENT_VERIFY_REWARD: u64 = 50_000_000_000; // 50 RDX
    pub const FRAGMENT_PUBLISH_REWARD: u64 = 25_000_000_000; // 25 RDX
    pub const REFERRAL_REWARD: u64 = 50_000_000_000; // 50 RDX
}
