use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use sha2::{Sha256, Digest};
use hex;
use crate::confidence::ConfidenceScore;

pub type FragmentId = Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fragment {
    pub id: FragmentId,
    pub content_hash: String,
    pub redacted_content: String,
    pub source: SourceMetadata,
    pub reconstruction: Option<DeclassifiedResult>,
    pub confidence: Option<ConfidenceScore>,
    pub on_chain_tx: Option<String>,
    pub arweave_tx: Option<String>,
    pub topic_tags: Vec<String>,
    pub status: FragmentStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub attempts: u32,
}

impl Fragment {
    pub fn new(redacted_content: String, source: SourceMetadata) -> Self {
        let content_hash = Self::compute_hash(&redacted_content);
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            content_hash,
            redacted_content,
            source,
            reconstruction: None,
            confidence: None,
            on_chain_tx: None,
            arweave_tx: None,
            topic_tags: Vec::new(),
            status: FragmentStatus::Pending,
            created_at: now,
            updated_at: now,
            attempts: 0,
        }
    }

    pub fn compute_hash(content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        hex::encode(hasher.finalize())
    }

    pub fn mark_processing(&mut self) {
        self.status = FragmentStatus::Processing;
        self.attempts += 1;
        self.updated_at = Utc::now();
    }

    pub fn mark_declassified(&mut self, result: DeclassifiedResult, confidence: ConfidenceScore) {
        self.reconstruction = Some(result);
        self.confidence = Some(confidence);
        self.status = FragmentStatus::Declassified;
        self.updated_at = Utc::now();
    }

    pub fn mark_anchored(&mut self, tx_sig: String, arweave_tx: String) {
        self.on_chain_tx = Some(tx_sig);
        self.arweave_tx = Some(arweave_tx);
        self.status = FragmentStatus::Anchored;
        self.updated_at = Utc::now();
    }

    pub fn mark_failed(&mut self, error: String) {
        self.status = FragmentStatus::Failed { error };
        self.updated_at = Utc::now();
    }

    pub fn is_ready_for_publication(&self) -> bool {
        matches!(self.status, FragmentStatus::Declassified | FragmentStatus::Anchored)
            && self.confidence.as_ref().is_some_and(|c| c.is_above_threshold(0.85))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceMetadata {
    pub url_hash: String,
    pub source_type: SourceType,
    pub redaction_zones: u32,
    pub coordinates: Option<(f64, f64)>,
    pub classification_level: Option<String>,
    pub source_timestamp: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SourceType {
    Image, Pdf, Text, Video, Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FragmentStatus {
    Pending,
    Processing,
    Declassified,
    Anchored,
    Failed { error: String },
    FlaggedForReview,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeclassifiedResult {
    pub text: String,
    pub model: String,
    pub reconstruction_time_ms: u64,
    pub reasoning_summary: String,
}
