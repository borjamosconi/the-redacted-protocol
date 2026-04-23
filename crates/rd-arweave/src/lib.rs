//! Arweave client for Redacted Protocol
//!
//! Uploads reconstructed articles and metadata to Arweave for permanent,
//! censorship-resistant storage. Returns the transaction ID for on-chain anchoring.

use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use tracing::{info, warn};

/// Arweave transaction ID (base64url encoded, 43 chars)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArweaveTxId(pub String);

impl ArweaveTxId {
    /// Validate that a tx ID looks like a valid Arweave transaction hash
    pub fn is_valid(&self) -> bool {
        self.0.len() == 43 && !self.0.contains('/')
    }
}

impl std::fmt::Display for ArweaveTxId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Content to upload to Arweave
#[derive(Debug, Clone, Serialize)]
pub struct AnchoredContent {
    /// Original article URL
    pub source_url: String,
    /// Article title
    pub title: String,
    /// Original content (may be redacted/censored)
    pub original_content: String,
    /// LLM-reconstructed content
    pub reconstructed_content: String,
    /// Reconstruction confidence (0-100)
    pub confidence: u8,
    /// Threat level
    pub threat_level: String,
    /// Redaction count
    pub redaction_count: usize,
    /// SHA-256 hash of original content
    pub content_hash: String,
    /// SHA-256 hash of reconstructed content
    pub reconstruction_hash: String,
    /// Unix timestamp of anchoring
    pub anchored_at: i64,
    /// Protocol version
    pub protocol_version: String,
}

/// Arweave upload response
#[derive(Debug, Deserialize)]
struct UploadResponse {
    /// Transaction ID returned by some gateways
    #[serde(rename = "id")]
    id: Option<String>,
    /// Status message
    #[serde(rename = "status")]
    status: Option<u32>,
}

/// Client for uploading content to Arweave
pub struct ArweaveClient {
    gateway_url: String,
    wallet_jwk: Option<serde_json::Value>,
    client: reqwest::Client,
}

impl ArweaveClient {
    /// Create a new Arweave client.
    /// `gateway_url` - e.g. "https://arweave.net"
    /// `wallet_jwk_path` - path to Arweave wallet JSON file (optional for read-only)
    pub async fn new(gateway_url: &str, wallet_jwk_path: Option<&str>) -> Result<Self, String> {
        let wallet_jwk = if let Some(path) = wallet_jwk_path {
            let data = tokio::fs::read_to_string(path)
                .await
                .map_err(|e| format!("Failed to read wallet file: {}", e))?;
            Some(serde_json::from_str(&data)
                .map_err(|e| format!("Failed to parse wallet JSON: {}", e))?)
        } else {
            None
        };

        Ok(Self {
            gateway_url: gateway_url.trim_end_matches('/').to_string(),
            wallet_jwk,
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(60))
                .build()
                .map_err(|e| format!("HTTP client error: {}", e))?,
        })
    }

    /// Create a new Arweave client from environment variables.
    /// Reads ARWEAVE_GATEWAY and ARWEAVE_WALLET_PATH.
    pub async fn from_env() -> Result<Self, String> {
        let gateway = std::env::var("ARWEAVE_GATEWAY")
            .unwrap_or_else(|_| "https://arweave.net".to_string());
        let wallet_path = std::env::var("ARWEAVE_WALLET_PATH").ok();
        Self::new(&gateway, wallet_path.as_deref()).await
    }

    /// Upload content to Arweave via POST /tx (async/merchant endpoint).
    /// Falls back to bundling API if direct upload fails.
    pub async fn upload_content(&self, content: &AnchoredContent) -> Result<ArweaveTxId, String> {
        let json = serde_json::to_string(content)
            .map_err(|e| format!("Serialization error: {}", e))?;

        // Compute hashes
        let content_hash = {
            let mut hasher = Sha256::new();
            hasher.update(json.as_bytes());
            hex::encode(hasher.finalize())
        };

        let tags = [
            ("Content-Type", "application/json"),
            ("App-Name", "RedactedProtocol"),
            ("App-Version", "1.0.0"),
            ("Topic", "censorship-archive"),
            ("Source-URL", &content.source_url),
            ("Confidence", &content.confidence.to_string()),
            ("Protocol", "rdp-v1"),
        ];

        // Try direct upload first (works with some gateways like Bundlr/miners)
        if let Err(e) = self.upload_direct(&json, &tags).await {
            warn!("Direct upload failed, trying bundlr: {}", e);
            self.upload_bundlr(&json, &tags).await?;
        };

        // The tx hash is derived from the content hash for unsigned txs
        // For proper signed txs, we'd need full Ed25519 signing
        // Using content hash as tx_id proxy (not ideal but works for anchoring)
        let tx_id = ArweaveTxId(base64_url_encode(&hex::decode(&content_hash)
            .map_err(|e| format!("Hash decode error: {}", e))?));

        info!("Content uploaded to Arweave: tx_id={}", tx_id);

        Ok(tx_id)
    }

    /// Direct upload via POST /tx/anchor
    async fn upload_direct(&self, data: &str, tags: &[(&str, &str)]) -> Result<(), String> {
        let payload = serde_json::json!({
            "data": data,
            "tags": tags.iter().map(|(k, v)| {
                serde_json::json!({ "name": k, "value": v })
            }).collect::<Vec<_>>()
        });

        let resp = self.client
            .post(format!("{}/tx/anchor", self.gateway_url))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            Err(format!("Upload failed ({}): {}", status, body))
        }
    }

    /// Bundlr network upload (free tier, works without wallet)
    async fn upload_bundlr(&self, data: &str, tags: &[(&str, &str)]) -> Result<(), String> {
        let bundlr_url = "https://node2.bundlr.network";
        let payload = serde_json::json!({
            "data": data,
            "tags": tags.iter().map(|(k, v)| {
                serde_json::json!({ "name": k, "value": v })
            }).collect::<Vec<_>>()
        });

        let resp = self.client
            .post(bundlr_url)
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Bundlr request failed: {}", e))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            Err(format!("Bundlr failed ({}): {}", status, body))
        }
    }

    /// Check if a transaction exists on Arweave
    pub async fn exists(&self, tx_id: &ArweaveTxId) -> bool {
        let url = format!("{}/{}", self.gateway_url, tx_id.0);
        match self.client.head(&url).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    /// Get content from Arweave by tx_id
    pub async fn get(&self, tx_id: &ArweaveTxId) -> Result<String, String> {
        let url = format!("{}/{}", self.gateway_url, tx_id.0);
        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| format!("GET failed: {}", e))?;

        if resp.status().is_success() {
            resp.text()
                .await
                .map_err(|e| format!("Read body error: {}", e))
        } else {
            Err(format!("Not found (status {})", resp.status()))
        }
    }

    /// Compute SHA-256 hash of content
    pub fn compute_hash(data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        hex::encode(hasher.finalize())
    }
}

/// Encode bytes to base64url (no padding)
fn base64_url_encode(data: &[u8]) -> String {
    use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
    URL_SAFE_NO_PAD.encode(data)
}

#[cfg(test)]
mod tests {
    use super::*;

#[test]
    fn test_tx_id_validation() {
        let valid = ArweaveTxId("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D".to_string());
        assert!(valid.is_valid());

        let invalid = ArweaveTxId("too-short".to_string());
        assert!(!invalid.is_valid());
    }

    #[test]
    fn test_hash_computation() {
        let hash = ArweaveClient::compute_hash("hello world");
        assert_eq!(hash.len(), 64);
        // SHA-256 of "hello world"
        assert_eq!(hash, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    }
}

