//! Airdrop tracking — tracks Telegram users eligible for $RDX airdrops.
//!
//! When the token is created, these users will receive their allocation.
//! 
//! PERSISTENCE: Registry is saved to disk atomically on every mutation.
//! Data is stored in `.rdx-data/airdrop_registry.json`

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::PathBuf;

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
/// 
/// This version persists data to disk so it survives bot restarts.
pub struct AirdropRegistry {
    recipients: std::collections::HashMap<i64, AirdropRecipient>,
    total_allocated: u128,
    total_claimed: u64,
    data_dir: PathBuf,
    file_path: PathBuf,
}

impl AirdropRegistry {
    /// Create a new empty in-memory registry (useful for testing)
    pub fn new_in_memory() -> Self {
        Self {
            recipients: std::collections::HashMap::new(),
            total_allocated: 0,
            total_claimed: 0,
            data_dir: PathBuf::from("."),
            file_path: PathBuf::from("test_airdrop.json"),
        }
    }

    pub fn new() -> Self {
        let data_dir = std::env::current_dir()
            .unwrap_or_default()
            .join(".rdx-data");
        let file_path = data_dir.join("airdrop_registry.json");
        
        // Try to load from disk, or create new
        if file_path.exists() {
            match Self::load_from_disk(&file_path) {
                Ok(registry) => return registry,
                Err(e) => {
                    eprintln!("Warning: Failed to load airdrop registry from disk: {}", e);
                    eprintln!("Creating new empty registry.");
                }
            }
        }
        
        Self {
            recipients: std::collections::HashMap::new(),
            total_allocated: 0,
            total_claimed: 0,
            data_dir,
            file_path,
        }
    }

    /// Create registry with custom data directory
    pub fn with_data_dir(data_dir: PathBuf) -> Self {
        let file_path = data_dir.join("airdrop_registry.json");
        
        if file_path.exists() {
            match Self::load_from_disk(&file_path) {
                Ok(registry) => return registry,
                Err(e) => {
                    eprintln!("Warning: Failed to load airdrop registry: {}", e);
                }
            }
        }
        
        Self {
            recipients: std::collections::HashMap::new(),
            total_allocated: 0,
            total_claimed: 0,
            data_dir,
            file_path,
        }
    }

    /// Load registry from disk
    fn load_from_disk(file_path: &PathBuf) -> Result<Self, String> {
        let content = std::fs::read_to_string(file_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        let data: AirdropDiskData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        
        let mut recipients = std::collections::HashMap::new();
        let mut total_allocated = 0u128;
        
        for recipient in data.recipients {
            total_allocated = total_allocated.saturating_add(recipient.amount as u128);
            recipients.insert(recipient.telegram_user_id, recipient);
        }
        
        Ok(Self {
            recipients,
            total_allocated,
            total_claimed: data.total_claimed,
            data_dir: file_path.parent().unwrap_or(&PathBuf::from(".")).to_path_buf(),
            file_path: file_path.clone(),
        })
    }

    /// Save registry to disk atomically
    fn save_to_disk(&self) {
        // Ensure directory exists
        if let Err(e) = std::fs::create_dir_all(&self.data_dir) {
            eprintln!("Warning: Failed to create data directory: {}", e);
            return;
        }
        
        let data = AirdropDiskData {
            recipients: self.recipients.values().cloned().collect(),
            total_claimed: self.total_claimed,
            saved_at: Utc::now(),
        };
        
        let json = match serde_json::to_string_pretty(&data) {
            Ok(j) => j,
            Err(e) => {
                eprintln!("Warning: Failed to serialize registry: {}", e);
                return;
            }
        };
        
        // Write atomically: write to temp file, then rename
        let tmp_path = self.file_path.with_extension("json.tmp");
        if let Err(e) = std::fs::write(&tmp_path, &json) {
            eprintln!("Warning: Failed to write temp file: {}", e);
            return;
        }
        
        if let Err(e) = std::fs::rename(&tmp_path, &self.file_path) {
            eprintln!("Warning: Failed to persist registry: {}", e);
        }
    }

    /// Register a Telegram user for airdrop (500 RDX).
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
        self.total_allocated = self.total_allocated.saturating_add(amount.into());
        self.save_to_disk();
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
        let cap = crate::token_config::airdrop::MAX_PER_USER_CAP;
        
        if let Some(recipient) = self.recipients.get_mut(&user_id) {
            // Enforce per-user cap
            let actual_reward = amount.min(cap.saturating_sub(recipient.amount));
            if actual_reward == 0 { return; } // Already at cap
            recipient.amount = recipient.amount.saturating_add(actual_reward);
        } else {
            // New user — cap the initial reward
            let capped_amount = amount.min(cap);
            self.recipients.insert(user_id, AirdropRecipient {
                telegram_user_id: user_id,
                telegram_username: username.to_string(),
                solana_wallet: None,
                amount: capped_amount,
                claimed: false,
                claimed_at: None,
                registered_at: Utc::now(),
                source,
            });
        }
        self.total_allocated = self.total_allocated.saturating_add((amount.min(cap)).into());
        self.save_to_disk();
    }

    /// Mark wallet as connected for airdrop. Awards WALLET_CONNECT_BONUS on first connect.
    pub fn connect_wallet(&mut self, telegram_id: i64, wallet: &str) {
        if let Some(r) = self.recipients.get_mut(&telegram_id) {
            // Only award bonus on first wallet connect
            if r.solana_wallet.is_none() {
                let bonus = crate::token_config::airdrop::WALLET_CONNECT_BONUS;
                let cap = crate::token_config::airdrop::MAX_PER_USER_CAP;
                let actual_bonus = bonus.min(cap.saturating_sub(r.amount));
                r.amount = r.amount.saturating_add(actual_bonus);
                self.total_allocated = self.total_allocated.saturating_add(actual_bonus.into());
            }
            r.solana_wallet = Some(wallet.to_string());
            self.save_to_disk();
        } else {
            // User not registered yet — create with wallet + base + bonus
            let base = crate::token_config::airdrop::TELEGRAM_USER_AMOUNT;
            let bonus = crate::token_config::airdrop::WALLET_CONNECT_BONUS;
            let cap = crate::token_config::airdrop::MAX_PER_USER_CAP;
            let total = (base.saturating_add(bonus)).min(cap);
            
            self.recipients.insert(telegram_id, AirdropRecipient {
                telegram_user_id: telegram_id,
                telegram_username: "dashboard_user".to_string(),
                solana_wallet: Some(wallet.to_string()),
                amount: total,
                claimed: false,
                claimed_at: None,
                registered_at: Utc::now(),
                source: AirdropSource::TelegramUser,
            });
            self.total_allocated = self.total_allocated.saturating_add(total.into());
            self.save_to_disk();
        }
    }

    /// Get total airdrop amount for a user.
    pub fn get_amount(&self, user_id: i64) -> u64 {
        self.recipients.get(&user_id).map(|r| r.amount).unwrap_or(0)
    }

    /// Get total allocated across all recipients (u128 to prevent overflow)
    pub fn total_allocated(&self) -> u128 {
        self.total_allocated
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
            unclaimed: self.total_allocated.saturating_sub(self.total_claimed as u128),
        }
    }
    
    /// Get recipient by Solana wallet address
    pub fn get_by_wallet(&self, wallet_address: &str) -> Option<&AirdropRecipient> {
        self.recipients.values().find(|r| {
            r.solana_wallet.as_deref() == Some(wallet_address)
        })
    }
    
    /// Get recipient by Telegram ID
    pub fn get_by_telegram(&self, telegram_id: i64) -> Option<&AirdropRecipient> {
        self.recipients.get(&telegram_id)
    }

    /// Reward for publishing a declassified fragment (25 RDX)
    pub fn reward_publish(&mut self, user_id: i64, username: &str) {
        let amount = crate::token_config::airdrop::FRAGMENT_PUBLISH_REWARD;
        self.add_reward(user_id, username, amount, AirdropSource::FragmentVerifier);
    }

    /// Reward for referring another user (50 RDX)
    pub fn reward_referral(&mut self, referrer_id: i64, referrer_username: &str) {
        let amount = crate::token_config::airdrop::REFERRAL_REWARD;
        self.add_reward(referrer_id, referrer_username, amount, AirdropSource::Referral);
    }
}

/// Disk representation of the registry data
#[derive(Debug, Serialize, Deserialize)]
struct AirdropDiskData {
    recipients: Vec<AirdropRecipient>,
    total_claimed: u64,
    saved_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct AirdropStats {
    pub total_recipients: usize,
    pub total_allocated: u128,
    pub total_claimed: u64,
    pub unclaimed: u128,
}
