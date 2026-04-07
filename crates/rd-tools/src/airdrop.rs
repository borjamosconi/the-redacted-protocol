//! Airdrop tracking — tracks Telegram users eligible for $RDX airdrops.
//!
//! When the token is created, these users will receive their allocation.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Airdrop recipient record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AirdropRecipient {
    pub telegram_user_id: i64,
    pub telegram_username: String,
    pub solana_wallet: Option<String>, // Will be filled later
    pub amount: u64,                  // In base units (10^9 = 1 RDX)
    pub claimed: bool,
    pub claimed_at: Option<DateTime<Utc>>,
    pub registered_at: DateTime<Utc>,
    pub source: AirdropSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AirdropSource {
    TelegramUser,        // Early bot user
    DocumentSubmitter,   // Submitted a redacted document
    FragmentVerifier,    // Verified a reconstruction
    Referral,            // Referred another user
}

/// Airdrop registry — tracks all eligible recipients.
pub struct AirdropRegistry {
    recipients: std::collections::HashMap<i64, AirdropRecipient>,
    total_allocated: u64,
    total_claimed: u64,
}

impl AirdropRegistry {
    pub fn new() -> Self {
        Self {
            recipients: std::collections::HashMap::new(),
            total_allocated: 0,
            total_claimed: 0,
        }
    }

    /// Register a Telegram user for airdrop (1000 RDX).
    pub fn register_telegram_user(&mut self, user_id: i64, username: &str) {
        if self.recipients.contains_key(&user_id) { return; } // Already registered

        let amount = crate::token_config::airdrop::TELEGRAM_USER_AMOUNT;
        self.recipients.insert(user_id, AirdropRecipient {
            telegram_user_id: user_id,
            telegram_username: username.to_string(),
            solana_wallet: None,
            amount,
            claimed: false,
            claimed_at: None,
            registered_at: Utc::now(),
            source: AirdropSource::TelegramUser,
        });
        self.total_allocated = self.total_allocated.saturating_add(amount);
    }

    /// Register a document submitter reward (100 RDX).
    pub fn reward_submission(&mut self, user_id: i64, username: &str) {
        let amount = crate::token_config::airdrop::DOCUMENT_SUBMIT_REWARD;
        self.add_reward(user_id, username, amount, AirdropSource::DocumentSubmitter);
    }

    /// Register a fragment verification reward (50 RDX).
    pub fn reward_verification(&mut self, user_id: i64, username: &str) {
        let amount = crate::token_config::airdrop::FRAGMENT_VERIFY_REWARD;
        self.add_reward(user_id, username, amount, AirdropSource::FragmentVerifier);
    }

    fn add_reward(&mut self, user_id: i64, username: &str, amount: u64, source: AirdropSource) {
        if let Some(recipient) = self.recipients.get_mut(&user_id) {
            recipient.amount += amount;
        } else {
            self.recipients.insert(user_id, AirdropRecipient {
                telegram_user_id: user_id,
                telegram_username: username.to_string(),
                solana_wallet: None,
                amount,
                claimed: false,
                claimed_at: None,
                registered_at: Utc::now(),
                source,
            });
        }
        self.total_allocated += amount;
    }

    /// Mark wallet as connected for airdrop.
    pub fn connect_wallet(&mut self, telegram_id: i64, wallet: &str) {
        if let Some(r) = self.recipients.get_mut(&telegram_id) {
            r.solana_wallet = Some(wallet.to_string());
        }
    }

    /// Get total airdrop amount for a user.
    pub fn get_amount(&self, user_id: i64) -> u64 {
        self.recipients.get(&user_id).map(|r| r.amount).unwrap_or(0)
    }

    /// Get total allocated (saturated).
    pub fn total_allocated(&self) -> u128 {
        self.recipients.values().map(|r| r.amount as u128).sum()
    }

    /// Check if user is eligible.
    pub fn is_eligible(&self, user_id: i64) -> bool {
        self.recipients.contains_key(&user_id)
    }

    /// Get all recipients.
    pub fn all_recipients(&self) -> Vec<&AirdropRecipient> {
        self.recipients.values().collect()
    }

    /// Get stats.
    pub fn stats(&self) -> AirdropStats {
        AirdropStats {
            total_recipients: self.recipients.len(),
            total_allocated: self.total_allocated,
            total_claimed: self.total_claimed,
            unclaimed: self.total_allocated - self.total_claimed,
        }
    }
}

#[derive(Debug, Clone)]
pub struct AirdropStats {
    pub total_recipients: usize,
    pub total_allocated: u64,
    pub total_claimed: u64,
    pub unclaimed: u64,
}
