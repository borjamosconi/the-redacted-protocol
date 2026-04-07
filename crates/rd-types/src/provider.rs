//! Provider types — abstraction over multiple LLM backends.

use serde::{Deserialize, Serialize};

/// Supported LLM provider kinds.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ProviderKind {
    /// Anthropic Claude (messages API).
    Anthropic,

    /// OpenAI-compatible API (gpt-4, gpt-3.5, etc.).
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
    /// User-facing alias (e.g., "sonnet", "opus").
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
            alias: "opus".into(),
            model_id: "claude-opus-20260101".into(),
            provider: ProviderKind::Anthropic,
        },
        ModelRef {
            alias: "sonnet".into(),
            model_id: "claude-sonnet-4-20260101".into(),
            provider: ProviderKind::Anthropic,
        },
        ModelRef {
            alias: "haiku".into(),
            model_id: "claude-haiku-20260101".into(),
            provider: ProviderKind::Anthropic,
        },
        ModelRef {
            alias: "grok".into(),
            model_id: "grok-3".into(),
            provider: ProviderKind::Xai,
        },
        ModelRef {
            alias: "gpt-4".into(),
            model_id: "gpt-4o".into(),
            provider: ProviderKind::OpenAi,
        },
        ModelRef {
            alias: "qwen".into(),
            model_id: "qwen-max".into(),
            provider: ProviderKind::DashScope,
        },
    ]
}

/// Resolve a model alias to an actual model ID.
pub fn resolve_model_alias(alias: &str) -> Option<&ModelRef> {
    known_models().iter().find(|m| m.alias == alias.to_lowercase())
}
