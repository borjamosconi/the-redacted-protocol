//! Solana blockchain client for Redacted Protocol
//!
//! Handles on-chain interactions: submitting document fragments,
//! querying fragment status, and anchoring proofs to Solana.

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use tracing::{info, error};
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
    instruction::{AccountMeta, Instruction},
    system_program,
};
use solana_client::rpc_client::RpcClient;
use std::str::FromStr;

/// Solana transaction signature (base58)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TxSignature(pub String);

impl std::fmt::Display for TxSignature {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Fragment submission result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FragmentSubmitResult {
    pub tx_signature: TxSignature,
    pub fragment_address: String,
    pub content_hash: String,
    pub reconstruction_hash: String,
    pub arweave_tx_id: String,
    pub confidence: u8,
    pub submitted_at: i64,
}

/// Solana RPC client for Redacted Protocol
pub struct SolanaClient {
    pub rpc: RpcClient,
    pub rpc_url: String,
    payer: Option<Keypair>,
}

impl SolanaClient {
    /// Create from explicit RPC URL and optional wallet path.
    pub async fn new(rpc_url: &str, wallet_path: Option<&str>) -> Result<Self, String> {
        let payer = if let Some(path) = wallet_path {
            let data = tokio::fs::read_to_string(path)
                .await
                .map_err(|e| format!("Failed to read wallet: {}", e))?;
            
            // Handle standard Solana keypair JSON [1,2,3...]
            let bytes: Vec<u8> = serde_json::from_str(&data)
                .map_err(|e| format!("Wallet parse error: {}", e))?;
            
            Some(Keypair::from_bytes(&bytes)
                .map_err(|e| format!("Invalid keypair: {}", e))?)
        } else {
            None
        };

        Ok(Self {
            rpc: RpcClient::new(rpc_url.to_string()),
            rpc_url: rpc_url.to_string(),
            payer,
        })
    }

    /// Create from environment variables.
    pub async fn from_env() -> Result<Self, String> {
        let rpc = std::env::var("SOLANA_RPC_URL")
            .unwrap_or_else(|_| "https://api.mainnet-beta.solana.com".to_string());
        let wallet = std::env::var("SOLANA_WALLET_PATH").ok();
        Self::new(&rpc, wallet.as_deref()).await
    }

    /// Get the wallet's public key.
    pub fn wallet_pubkey(&self) -> Result<Pubkey, String> {
        self.payer.as_ref()
            .map(|k| k.pubkey())
            .ok_or_else(|| "No wallet configured — set SOLANA_WALLET_PATH".to_string())
    }

    /// Submit a fragment to the rd-fragment program on Solana.
    pub async fn submit_fragment(
        &self,
        content_hex: &str,
        reconstruction_hex: &str,
        arweave_tx_id: &str,
        confidence: u8,
        topic_tags: Vec<String>,
    ) -> Result<FragmentSubmitResult, String> {
        let payer = self.payer.as_ref()
            .ok_or_else(|| "Payer wallet required for fragment submission".to_string())?;

        let program_id = Pubkey::from_str(
            &std::env::var("FRAGMENT_PROGRAM_ID")
                .unwrap_or_else(|_| "5CLiUA3yqHNoKAdPeHjeNkipDjjYFPwTpnEFfuR9JxWd".to_string())
        ).map_err(|e| format!("Invalid program ID: {}", e))?;

        let content_hash = Self::hash_to_array(content_hex)?;
        let reconstruction_hash = Self::hash_to_array(reconstruction_hex)?;

        // Derive PDA: ["fragment", content_hash]
        let (fragment_pda, _bump) = Pubkey::find_program_address(
            &[b"fragment", &content_hash],
            &program_id,
        );

        // Build instruction data (Anchor discriminator + fields)
        let mut data = vec![99, 48, 163, 162, 60, 234, 133, 24]; // submit_fragment discriminator
        data.extend_from_slice(&content_hash);
        data.extend_from_slice(&reconstruction_hash);
        data.push(confidence);

        let mut aw_bytes = arweave_tx_id.as_bytes().to_vec();
        aw_bytes.resize(43, 0);
        data.extend_from_slice(&aw_bytes[..43]);

        // Tags serialization (simplified for example)
        data.extend_from_slice(&(topic_tags.len() as u32).to_le_bytes());
        for tag in topic_tags {
            let b = tag.as_bytes();
            data.extend_from_slice(&(b.len() as u32).to_le_bytes());
            data.extend_from_slice(b);
        }

        let accounts = vec![
            AccountMeta::new(fragment_pda, false),
            AccountMeta::new(payer.pubkey(), true),
            AccountMeta::new_readonly(system_program::ID, false),
        ];

        let instruction = Instruction::new_with_bytes(program_id, &data, accounts);
        let recent_blockhash = self.rpc.get_latest_blockhash()
            .map_err(|e| format!("Failed to get blockhash: {}", e))?;

        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&payer.pubkey()),
            &[payer],
            recent_blockhash,
        );

        let signature = self.rpc.send_and_confirm_transaction(&tx)
            .map_err(|e| format!("Transaction failed: {}", e))?;

        Ok(FragmentSubmitResult {
            tx_signature: TxSignature(signature.to_string()),
            fragment_address: fragment_pda.to_string(),
            content_hash: content_hex.to_string(),
            reconstruction_hash: reconstruction_hex.to_string(),
            arweave_tx_id: arweave_tx_id.to_string(),
            confidence,
            submitted_at: chrono::Utc::now().timestamp(),
        })
    }

    /// Helper: Content hash to [u8; 32]
    pub fn hash_to_array(hex_str: &str) -> Result<[u8; 32], String> {
        let bytes = hex::decode(hex_str).map_err(|e| e.to_string())?;
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes[..32]);
        Ok(arr)
    }

    pub fn content_hash_hex(data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        hex::encode(hasher.finalize())
    }
}
