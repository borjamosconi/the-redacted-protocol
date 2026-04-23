//! Solana blockchain client for Redacted Protocol
//!
//! Handles on-chain interactions: submitting document fragments,
//! querying fragment status, and anchoring proofs to Solana devnet.

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use tracing::info;

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
    /// On-chain transaction signature
    pub tx_signature: TxSignature,
    /// Fragment account address (PDA)
    pub fragment_address: String,
    /// Content hash (SHA-256, hex)
    pub content_hash: String,
    /// Reconstruction hash (SHA-256, hex)
    pub reconstruction_hash: String,
    /// Arweave transaction ID
    pub arweave_tx_id: String,
    /// Confidence score (0-100)
    pub confidence: u8,
    /// Submission timestamp (unix)
    pub submitted_at: i64,
}

/// Solana RPC client for Anchor programs
pub struct SolanaClient {
    pub rpc_url: String,
    wallet_jwk: Option<serde_json::Value>,
    http: reqwest::Client,
}

impl SolanaClient {
    /// Create from explicit RPC URL and optional wallet path.
    pub async fn new(rpc_url: &str, wallet_path: Option<&str>) -> Result<Self, String> {
        let wallet_jwk = if let Some(path) = wallet_path {
            let data = tokio::fs::read_to_string(path)
                .await
                .map_err(|e| format!("Failed to read wallet: {}", e))?;
            Some(serde_json::from_str(&data)
                .map_err(|e| format!("Wallet parse error: {}", e))?)
        } else {
            None
        };

        Ok(Self {
            rpc_url: rpc_url.to_string(),
            wallet_jwk,
            http: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .map_err(|e| format!("HTTP client error: {}", e))?,
        })
    }

    /// Create from environment variables.
    /// Reads SOLANA_RPC_URL and SOLANA_WALLET_PATH.
    pub async fn from_env() -> Result<Self, String> {
        let rpc = std::env::var("SOLANA_RPC_URL")
            .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());
        let wallet = std::env::var("SOLANA_WALLET_PATH").ok();
        Self::new(&rpc, wallet.as_deref()).await
    }

    /// Get the wallet's public key.
    pub async fn wallet_pubkey(&self) -> Result<String, String> {
        if let Some(ref jwk) = self.wallet_jwk {
            jwk.get("pubkey")
                .and_then(|k| k.as_str())
                .map(String::from)
                .ok_or_else(|| "Wallet missing pubkey field".to_string())
        } else {
            Err("No wallet configured — set SOLANA_WALLET_PATH".to_string())
        }
    }

    /// Compute content hash as hex string
    pub fn content_hash_hex(data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Convert 32-byte hash (hex) to [u8; 32]
    pub fn hash_to_array(hex_str: &str) -> Result<[u8; 32], String> {
        let bytes = hex::decode(hex_str)
            .map_err(|e| format!("Hex decode error: {}", e))?;
        if bytes.len() != 32 {
            return Err(format!("Expected 32 bytes, got {}", bytes.len()));
        }
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes);
        Ok(arr)
    }

    /// Submit a fragment to the rd-fragment program on Solana.
    ///
    /// Creates an on-chain anchor account storing:
    /// - content_hash: SHA-256 of the original (possibly redacted) article
    /// - reconstruction_hash: SHA-256 of the LLM-reconstructed text
    /// - arweave_tx_id: pointer to full content on Arweave
    /// - confidence: reconstruction confidence score (0-100)
    /// - topic_tags: auto-detected topics
    ///
    /// The fragment PDA is derived from: ["fragment", content_hash]
    pub async fn submit_fragment(
        &self,
        content_hex: &str,
        reconstruction_hex: &str,
        arweave_tx_id: &str,
        confidence: u8,
        topic_tags: Vec<String>,
    ) -> Result<FragmentSubmitResult, String> {
        let wallet = self.wallet_pubkey().await?;

        let content_hash = Self::hash_to_array(content_hex)?;
        let reconstruction_hash = Self::hash_to_array(reconstruction_hex)?;

        // Fragment program ID (placeholder — replace after anchor deploy)
        let program_id = std::env::var("FRAGMENT_PROGRAM_ID")
            .unwrap_or_else(|_| "RDfrag11111111111111111111111111111111111111".to_string());

        // Derive fragment PDA: seeds = ["fragment", content_hash]
        let fragment_pda = self.derive_pda(&program_id, &["fragment", content_hex]).await?;

        // Get recent blockhash for transaction fees
        let recent_blockhash = self.get_recent_blockhash().await?;

        // Build instruction data matching Anchor IDL
        let instruction_data = self.build_submit_instruction(
            content_hash,
            reconstruction_hash,
            arweave_tx_id,
            confidence,
            &topic_tags,
        )?;

        // Build keys list
        let keys = serde_json::json!([
            { "pubkey": fragment_pda, "isSigner": false, "isWritable": true },
            { "pubkey": wallet, "isSigner": true, "isWritable": true },
            { "pubkey": "11111111111111111111111111111111", "isSigner": false, "isWritable": false }
        ]);

        // Build and send transaction
        let tx_payload = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "sendTransaction",
            "params": [
                {
                    "feePayer": wallet,
                    "recentBlockhash": recent_blockhash,
                    "instructions": [{
                        "programId": program_id,
                        "data": bs58::encode(&instruction_data).into_string(),
                        "keys": keys
                    }]
                },
                { "encoding": "base58" }
            ]
        });

        // Sign and send
        let signed_tx = if let Some(ref jwk) = self.wallet_jwk {
            self.sign_transaction_jwk(&tx_payload, jwk).await?
        } else {
            return Err("No wallet configured — fragments cannot be anchored on-chain. \
                Set SOLANA_WALLET_PATH with a keypair file.".to_string());
        };

        let tx_sig = self.send_raw_transaction(&signed_tx).await?;
        info!("Fragment anchored on Solana: tx={}, fragment={}", tx_sig.0, fragment_pda);

        Ok(FragmentSubmitResult {
            tx_signature: tx_sig,
            fragment_address: fragment_pda,
            content_hash: content_hex.to_string(),
            reconstruction_hash: reconstruction_hex.to_string(),
            arweave_tx_id: arweave_tx_id.to_string(),
            confidence,
            submitted_at: chrono::Utc::now().timestamp(),
        })
    }

    /// Derive a PDA using getProgramAddress (simulated)
    async fn derive_pda(&self, _program_id: &str, seeds: &[&str]) -> Result<String, String> {
        // Simulated PDA — in production use solana_program::pubkey::find_program_address
        // For now, derive a plausible-looking address
        let combined = seeds.join(":");
        let hash = Self::content_hash_hex(&combined);
        Ok(format!("{}{}", &hash[..32], "111111111111111111111111111"))
    }

    /// Get recent blockhash for transaction fees
    async fn get_recent_blockhash(&self) -> Result<String, String> {
        #[derive(Deserialize)]
        struct BlockhashResult { blockhash: String }
        #[derive(Deserialize)]
        struct RpcResult { result: BlockhashResult }
        let payload = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getRecentBlockhash",
            "params": [{ "commitment": "confirmed" }]
        });

        let resp = self.http.post(&self.rpc_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("RPC: {}", e))?;

        let reply: RpcResult = resp.json().await
            .map_err(|e| format!("Parse: {}", e))?;
        Ok(reply.result.blockhash)
    }

    /// Build instruction data for rd-fragment::submit_fragment
    /// Discriminator: sha256("global:submit_fragment")[:8]
    fn build_submit_instruction(
        &self,
        content_hash: [u8; 32],
        reconstruction_hash: [u8; 32],
        arweave_tx_id: &str,
        confidence: u8,
        topic_tags: &[String],
    ) -> Result<Vec<u8>, String> {
        // Anchor discriminator for submit_fragment: 8 bytes
        let discriminator: [u8; 8] = [99, 48, 163, 162, 60, 234, 133, 24];

        let mut data = Vec::with_capacity(200);
        data.extend_from_slice(&discriminator);
        data.extend_from_slice(&content_hash);
        data.extend_from_slice(&reconstruction_hash);
        data.push(confidence);

        // Arweave TX ID (43 bytes, null-padded)
        let mut aw_bytes = arweave_tx_id.as_bytes().to_vec();
        aw_bytes.resize(43, 0);
        data.extend_from_slice(&aw_bytes[..43]);

        // Tags: u32 length + each tag
        let mut tags_data = Vec::new();
        for tag in topic_tags {
            let tag_bytes = tag.as_bytes();
            tags_data.extend_from_slice(&(tag_bytes.len() as u32).to_le_bytes());
            tags_data.extend_from_slice(tag_bytes);
        }
        data.extend_from_slice(&(tags_data.len() as u32).to_le_bytes());
        data.extend_from_slice(&tags_data);

        Ok(data)
    }

    /// Sign transaction with JWK (ed25519)
    async fn sign_transaction_jwk(&self, _tx: &serde_json::Value, _jwk: &serde_json::Value) -> Result<String, String> {
        // Real implementation would use ed25519-dalek or ring for JWK signing
        // For production: use solana-sdk or @solana/web3.js on the frontend
        // Here we serialize the unsigned tx for demonstration
        Err("JWK signing not yet implemented. Use Solana CLI wallet for production. \
            The fragment data is ready and will be submitted when wallet signing is connected.".to_string())
    }

    /// Send a raw signed transaction
    async fn send_raw_transaction(&self, signed_tx: &str) -> Result<TxSignature, String> {
        #[derive(Serialize)]
        struct Params<'a> { tx: &'a str }
        #[derive(Serialize)]
        struct Request<'a> {
            jsonrpc: &'a str,
            id: u32,
            method: &'a str,
            params: Params<'a>,
        }

        let req = Request {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: Params { tx: signed_tx },
        };

        #[derive(Deserialize)]
        struct RpcResult { result: String }

        let resp = self.http.post(&self.rpc_url)
            .json(&req)
            .send()
            .await
            .map_err(|e| format!("Send error: {}", e))?;

        let reply: RpcResult = resp.json().await
            .map_err(|e| format!("Parse: {}", e))?;

        Ok(TxSignature(reply.result))
    }

    /// Check if a fragment exists on-chain
    pub async fn get_fragment(&self, fragment_pda: &str) -> Result<Option<FragmentOnChain>, String> {
        #[derive(Serialize)]
        struct Params<'a> { account: &'a str, opts: serde_json::Value }
        #[derive(Serialize)]
        struct Request<'a> { jsonrpc: &'a str, id: u32, method: &'a str, params: Params<'a> }

        let req = Request {
            jsonrpc: "2.0",
            id: 1,
            method: "getAccountInfo",
            params: Params {
                account: fragment_pda,
                opts: serde_json::json!({ "encoding": "jsonParsed", "commitment": "confirmed" })
            }
        };

        #[derive(Deserialize)]
        struct RpcResult { result: Option<serde_json::Value> }

        let resp = self.http.post(&self.rpc_url)
            .json(&req)
            .send()
            .await
            .map_err(|e| format!("RPC error: {}", e))?;

        let reply: RpcResult = resp.json().await
            .map_err(|e| format!("Parse error: {}", e))?;

        if let Some(val) = reply.result {
            let data = val.get("data")
                .and_then(|d| d.get("parsed"))
                .and_then(|p| p.get("info"));

            if let Some(info) = data {
                Ok(Some(FragmentOnChain {
                    content_hash: info.get("contentHash").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    reconstruction_hash: info.get("reconstructionHash").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    confidence: info.get("confidence").and_then(|v| v.as_u64()).unwrap_or(0) as u8,
                    is_verified: info.get("isVerified").and_then(|v| v.as_bool()).unwrap_or(false),
                    arweave_tx_id: info.get("arweaveTxId").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    submitter: info.get("submitter").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    timestamp: info.get("timestamp").and_then(|v| v.as_i64()).unwrap_or(0),
                }))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }
}

/// Fragment data as stored on Solana
#[derive(Debug, Clone, Deserialize)]
pub struct FragmentOnChain {
    pub content_hash: String,
    pub reconstruction_hash: String,
    pub confidence: u8,
    pub is_verified: bool,
    pub arweave_tx_id: String,
    pub submitter: String,
    pub timestamp: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_hash() {
        let hash = SolanaClient::content_hash_hex("hello world");
        assert_eq!(hash.len(), 64);
        // SHA-256 of "hello world"
        assert_eq!(hash, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    }

    #[tokio::test]
    async fn test_hash_to_array() {
        let hash = SolanaClient::content_hash_hex("test");
        let arr = SolanaClient::hash_to_array(&hash).unwrap();
        assert_eq!(arr.len(), 32);
    }
}
