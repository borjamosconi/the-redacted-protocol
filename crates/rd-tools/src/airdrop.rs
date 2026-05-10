//! Airdrop tracking — tracks Telegram users eligible for $RDX airdrops.
//!
//! When the token is created, these users will receive their allocation.
//! 
//! HARDENING: Registry now supports Redis for centralized state sharing between
//! the Rust bot and the Next.js dashboard.
//! Fallback: Data is stored in `.rdx-data/airdrop_registry.json`

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::PathBuf;
use tracing::{info, warn, error};
use redis::AsyncCommands;

/// Airdrop recipient record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AirdropRecipient {
    pub telegram_user_id: i64,
    pub telegram_username: String,
    pub solana_wallet: Option<String>,
    pub amount: u64,                  // In base units (10^9 = 1 RDX)
    pub claimed: bool,
    pub claimed_at: Option<DateTime<Utc>>,
    pub registered_at: DateTime<Utc>,
    pub source: AirdropSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AirdropSource {
    TelegramUser,        
    DocumentSubmitter,   
    FragmentVerifier,    
    Referral,            
}

enum RegistryStrategy {
    Local {
        recipients: std::collections::HashMap<i64, AirdropRecipient>,
        file_path: PathBuf,
    },
    Redis {
        client: redis::Client,
        prefix: String,
    },
}

pub struct AirdropRegistry {
    strategy: RegistryStrategy,
    total_allocated: u128,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct RegistryStats {
    pub total_recipients: u64,
    pub total_allocated: u128,
    pub total_claimed: u64,
    pub unclaimed: u64,
}

impl AirdropRegistry {
    pub async fn from_env() -> Self {
        if let Ok(url) = std::env::var("REDIS_URL").or_else(|_| std::env::var("UPSTASH_REDIS_URL")) {
            match redis::Client::open(url) {
                Ok(client) => {
                    info!("AirdropRegistry: Using Redis-backed storage");
                    return Self {
                        strategy: RegistryStrategy::Redis { client, prefix: "user:".to_string() },
                        total_allocated: 0, // Will be calculated on-demand or cached
                    };
                }
                Err(e) => error!("Failed to connect to Redis for airdrop: {}", e),
            }
        }

        info!("AirdropRegistry: Falling back to local file storage");
        let data_dir = std::env::current_dir().unwrap_or_default().join(".rdx-data");
        let file_path = data_dir.join("airdrop_registry.json");
        
        let mut recipients = std::collections::HashMap::new();
        if file_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&file_path) {
                if let Ok(data) = serde_json::from_str::<AirdropDiskData>(&content) {
                    for r in data.recipients {
                        recipients.insert(r.telegram_user_id, r);
                    }
                }
            }
        }

        Self {
            strategy: RegistryStrategy::Local { recipients, file_path },
            total_allocated: 0,
        }
    }

    pub fn new_in_memory() -> Self {
        Self {
            strategy: RegistryStrategy::Local {
                recipients: std::collections::HashMap::new(),
                file_path: PathBuf::from("memory.json"),
            },
            total_allocated: 0,
        }
    }

    pub fn stats(&self) -> RegistryStats {
        match &self.strategy {
            RegistryStrategy::Local { recipients, .. } => {
                let total_recipients = recipients.len() as u64;
                let total_allocated = recipients.values().map(|r| r.amount as u128).sum();
                let total_claimed = recipients.values().filter(|r| r.claimed).map(|r| r.amount as u64).sum();
                RegistryStats {
                    total_recipients,
                    total_allocated,
                    total_claimed,
                    unclaimed: (total_allocated as u64).saturating_sub(total_claimed),
                }
            }
            RegistryStrategy::Redis { .. } => {
                // Redis stats would require a full scan, return empty for now
                RegistryStats::default()
            }
        }
    }

    pub fn all_recipients(&self) -> Vec<AirdropRecipient> {
        match &self.strategy {
            RegistryStrategy::Local { recipients, .. } => recipients.values().cloned().collect(),
            RegistryStrategy::Redis { .. } => Vec::new(), // Not implemented for Redis
        }
    }

    pub fn get_by_telegram(&self, user_id: i64) -> Option<AirdropRecipient> {
        match &self.strategy {
            RegistryStrategy::Local { recipients, .. } => recipients.get(&user_id).cloned(),
            RegistryStrategy::Redis { .. } => None, // Async required for Redis
        }
    }

    pub fn total_allocated(&self) -> u128 {
        match &self.strategy {
            RegistryStrategy::Local { recipients, .. } => recipients.values().map(|r| r.amount as u128).sum(),
            RegistryStrategy::Redis { .. } => 0,
        }
    }

    /// Register a Telegram user for airdrop.
    pub async fn register_telegram_user(&mut self, user_id: i64, username: &str) -> Result<(), String> {
        if self.is_eligible(user_id).await {
            return Ok(());
        }
        let amount = crate::token_config::airdrop::TELEGRAM_USER_AMOUNT;
        self.add_reward(user_id, username, amount, AirdropSource::TelegramUser).await
    }

    pub async fn reward_submission(&mut self, user_id: i64, username: &str) -> Result<(), String> {
        let amount = crate::token_config::airdrop::DOCUMENT_SUBMIT_REWARD;
        self.add_reward(user_id, username, amount, AirdropSource::DocumentSubmitter).await
    }

    pub async fn reward_verification(&mut self, user_id: i64, username: &str) -> Result<(), String> {
        let amount = crate::token_config::airdrop::FRAGMENT_VERIFY_REWARD;
        self.add_reward(user_id, username, amount, AirdropSource::FragmentVerifier).await
    }

    async fn add_reward(&mut self, user_id: i64, username: &str, amount: u64, source: AirdropSource) -> Result<(), String> {
        match &mut self.strategy {
            RegistryStrategy::Local { recipients, file_path } => {
                let recipient = recipients.entry(user_id).or_insert_with(|| AirdropRecipient {
                    telegram_user_id: user_id,
                    telegram_username: username.to_string(),
                    solana_wallet: None,
                    amount: 0,
                    claimed: false,
                    claimed_at: None,
                    registered_at: Utc::now(),
                    source,
                });
                recipient.amount = recipient.amount.saturating_add(amount);
                
                // Persist
                let data = AirdropDiskData {
                    recipients: recipients.values().cloned().collect(),
                    total_claimed: 0,
                    saved_at: Utc::now(),
                };
                let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
                std::fs::write(file_path, json).map_err(|e| e.to_string())?;
                Ok(())
            }
            RegistryStrategy::Redis { client, prefix: _ } => {
                let mut conn = client.get_async_connection().await.map_err(|e| e.to_string())?;
                
                // In Redis, we store by telegram_id as a secondary index or just search
                // For "Hardening", we search all users:index members
                let keys: Vec<String> = conn.smembers("users:index").await.map_err(|e| e.to_string())?;
                
                for key in keys {
                    let user_json: Option<String> = conn.get(&key).await.map_err(|e| e.to_string())?;
                    if let Some(json) = user_json {
                        let mut user: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
                        if user["telegramId"] == user_id.to_string() {
                            // Update existing user
                            let current_xp = user["xp"].as_u64().unwrap_or(0);
                            let current_airdrop = user["airdropAmount"].as_u64().unwrap_or(0);
                            
                            user["xp"] = serde_json::json!(current_xp + (amount / 1_000_000)); // XP is scaled
                            user["airdropAmount"] = serde_json::json!(current_airdrop + amount);
                            
                            conn.set::<_, _, ()>(&key, serde_json::to_string(&user).unwrap()).await.map_err(|e| e.to_string())?;
                            return Ok(());
                        }
                    }
                }
                
                warn!("Airdrop: user {} not found in Redis index. Reward pending.", user_id);
                Ok(())
            }
        }
    }

    /// Mark wallet as connected for airdrop. Awards WALLET_CONNECT_BONUS on first connect.
    pub async fn connect_wallet(&mut self, user_id: i64, wallet: &str) -> Result<(), String> {
        match &mut self.strategy {
            RegistryStrategy::Local { recipients, file_path } => {
                if let Some(r) = recipients.get_mut(&user_id) {
                    if r.solana_wallet.is_none() {
                        let bonus = crate::token_config::airdrop::WALLET_CONNECT_BONUS;
                        r.amount = r.amount.saturating_add(bonus);
                    }
                    r.solana_wallet = Some(wallet.to_string());
                } else {
                    let base = crate::token_config::airdrop::TELEGRAM_USER_AMOUNT;
                    let bonus = crate::token_config::airdrop::WALLET_CONNECT_BONUS;
                    recipients.insert(user_id, AirdropRecipient {
                        telegram_user_id: user_id,
                        telegram_username: "dashboard_user".to_string(),
                        solana_wallet: Some(wallet.to_string()),
                        amount: base + bonus,
                        claimed: false,
                        claimed_at: None,
                        registered_at: Utc::now(),
                        source: AirdropSource::TelegramUser,
                    });
                }
                
                let data = AirdropDiskData {
                    recipients: recipients.values().cloned().collect(),
                    total_claimed: 0,
                    saved_at: Utc::now(),
                };
                let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
                std::fs::write(file_path, json).map_err(|e| e.to_string())?;
                Ok(())
            }
            RegistryStrategy::Redis { client, .. } => {
                let mut conn = client.get_async_connection().await.map_err(|e| e.to_string())?;
                let keys: Vec<String> = conn.smembers("users:index").await.map_err(|e| e.to_string())?;
                
                for key in keys {
                    let user_json: Option<String> = conn.get(&key).await.map_err(|e| e.to_string())?;
                    if let Some(json) = user_json {
                        let mut user: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
                        if user["telegramId"] == user_id.to_string() {
                            // Link wallet and award bonus if not linked
                            if user["walletAddress"].as_str().is_none() || user["walletAddress"].as_str() == Some("") {
                                let bonus = crate::token_config::airdrop::WALLET_CONNECT_BONUS;
                                let current_xp = user["xp"].as_u64().unwrap_or(0);
                                let current_airdrop = user["airdropAmount"].as_u64().unwrap_or(0);
                                user["xp"] = serde_json::json!(current_xp + (bonus / 1_000_000));
                                user["airdropAmount"] = serde_json::json!(current_airdrop + bonus);
                                user["walletAddress"] = serde_json::json!(wallet);
                                conn.set::<_, _, ()>(&key, serde_json::to_string(&user).unwrap()).await.map_err(|e| e.to_string())?;
                            }
                            return Ok(())
                        }
                    }
                }
                Ok(())
            }
        }
    }

    pub async fn get_amount(&self, user_id: i64) -> u64 {
        match &self.strategy {
            RegistryStrategy::Local { recipients, .. } => {
                recipients.get(&user_id).map(|r| r.amount).unwrap_or(0)
            }
            RegistryStrategy::Redis { client, .. } => {
                if let Ok(mut conn) = client.get_async_connection().await {
                    let keys: Vec<String> = conn.smembers("users:index").await.unwrap_or_default();
                    for key in keys {
                        if let Ok(Some(json)) = conn.get::<_, Option<String>>(&key).await {
                            if let Ok(user) = serde_json::from_str::<serde_json::Value>(&json) {
                                if user["telegramId"] == user_id.to_string() {
                                    return user["airdropAmount"].as_u64().unwrap_or(0);
                                }
                            }
                        }
                    }
                }
                0
            }
        }
    }

    pub async fn is_eligible(&self, user_id: i64) -> bool {
        self.get_amount(user_id).await > 0
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct AirdropDiskData {
    recipients: Vec<AirdropRecipient>,
    total_claimed: u64,
    saved_at: DateTime<Utc>,
}
