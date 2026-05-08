//! Provider types — abstraction over multiple Inference backends.

use serde::{Deserialize, Serialize};

/// Supported Inference provider kinds.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum ProviderKind {
    /// Anthropic Claude (messages API).
    Anthropic,

    /// OpenAI-compatible API (standard inference relay).
    OpenAi,

    /// xAI Grok API.
    Xai,

    /// DashScope Qwen API.
    DashScope,

    /// OpenRouter (aggregates multiple providers).
    OpenRouter,
}

/// Model alias with resolved actual model name.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelRef {
    /// User-facing alias (e.g., "deep-recon", "fast-recon").
    pub alias: String,
    /// Actual model identifier.
    pub model_id: String,
    /// Which provider serves this model.
    pub provider: ProviderKind,
}

/// Known model aliases.
pub fn known_models() -> Vec<ModelRef> {
    vec![
        ModelRef {
            alias: "deep-reconstructor".into(),
            model_id: "claude-3-5-opus-20260101".into(),
            provider: ProviderKind::Anthropic,
        },
        ModelRef {
            alias: "standard-reconstructor".into(),
            model_id: "claude-3-5-sonnet-20260101".into(),
            provider: ProviderKind::Anthropic,
        },
        ModelRef {
            alias: "fast-reconstructor".into(),
            model_id: "claude-3-5-haiku-20260101".into(),
            provider: ProviderKind::Anthropic,
        },
        ModelRef {
            alias: "autonomous-grok".into(),
            model_id: "grok-3".into(),
            provider: ProviderKind::Xai,
        },
        ModelRef {
            alias: "universal-core".into(),
            model_id: "gpt-4o".into(),
            provider: ProviderKind::OpenAi,
        },
        ModelRef {
            alias: "distributed-qwen".into(),
            model_id: "qwen-max".into(),
            provider: ProviderKind::DashScope,
        },
    ]
}

/// Resolve a model alias to an actual model ID.
pub fn resolve_model_alias(alias: &str) -> Option<ModelRef> {
    known_models().into_iter().find(|m| m.alias == alias.to_lowercase())
}
