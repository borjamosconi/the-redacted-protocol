use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StreamEvent {
    TextDelta { delta: String },
    ToolUseStart { id: String, name: String },
    ToolInputDelta { id: String, delta: String },
    ToolInputEnd { id: String },
    MessageEnd,
    Usage { input_tokens: u64, output_tokens: u64 },
    Error { message: String, code: String },
}

#[derive(Debug, Clone)]
pub struct AssistantMessage {
    pub blocks: Vec<crate::block::ContentBlock>,
    pub usage: Option<TokenUsage>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct TokenUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
}

impl TokenUsage {
    pub fn total(&self) -> u64 { self.input_tokens + self.output_tokens }
}
