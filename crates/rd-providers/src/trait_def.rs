use async_trait::async_trait;
use rd_types::{block::ContentBlock, event::StreamEvent, event::TokenUsage};

#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("HTTP error: {0}")] Http(#[from] reqwest::Error),
    #[error("API error: {code} — {message}")] Api { code: String, message: String },
    #[error("Serialization error: {0}")] Serialization(#[from] serde_json::Error),
    #[error("Provider not available: {0}")] NotAvailable(String),
}

#[derive(Debug, Clone)]
pub struct LlmRequest {
    pub system_prompt: String,
    pub messages: Vec<ProviderMessage>,
    pub max_tokens: u64,
    pub temperature: f64,
    pub stream: bool,
    pub tools: Vec<ToolDefinition>,
}

#[derive(Debug, Clone)]
pub struct ProviderMessage {
    pub role: String,
    pub content: Vec<ProviderContentBlock>,
}

#[derive(Debug, Clone)]
pub enum ProviderContentBlock {
    Text(String),
    ToolUse { id: String, name: String, input: serde_json::Value },
    ToolResult { tool_use_id: String, output: String, is_error: bool },
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct LlmResponse {
    pub blocks: Vec<ContentBlock>,
    pub usage: Option<TokenUsage>,
    pub stop_reason: StopReason,
}

#[derive(Debug, Clone, PartialEq)]
pub enum StopReason { EndTurn, ToolUse, MaxTokens, Error(String) }

#[async_trait]
pub trait Provider: Send + Sync {
    async fn send(&self, request: LlmRequest) -> Result<LlmResponse, ProviderError>;
    async fn stream(&self, request: LlmRequest) -> Result<Box<dyn futures::Stream<Item = Result<StreamEvent, ProviderError>> + Unpin + Send>, ProviderError>;
    fn kind(&self) -> rd_types::provider::ProviderKind;
}

#[async_trait]
impl Provider for Box<dyn Provider> {
    async fn send(&self, request: LlmRequest) -> Result<LlmResponse, ProviderError> {
        self.as_ref().send(request).await
    }
    async fn stream(&self, request: LlmRequest) -> Result<Box<dyn futures::Stream<Item = Result<StreamEvent, ProviderError>> + Unpin + Send>, ProviderError> {
        self.as_ref().stream(request).await
    }
    fn kind(&self) -> rd_types::provider::ProviderKind {
        self.as_ref().kind()
    }
}
