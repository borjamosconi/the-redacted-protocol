use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rd_types::{block::ContentBlock, event::TokenUsage};

pub const SESSION_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub version: u32,
    pub messages: Vec<SessionMessage>,
    pub total_usage: TokenUsage,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMessage {
    pub role: MessageRole,
    pub blocks: Vec<ContentBlock>,
    pub usage: Option<TokenUsage>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MessageRole {
    #[serde(rename = "system")] System,
    #[serde(rename = "user")] User,
    #[serde(rename = "assistant")] Assistant,
    #[serde(rename = "tool")] Tool,
}

impl Session {
    pub fn new(model: impl Into<String>) -> Self {
        let now = Utc::now();
        Self { id: format!("rd-{}", Uuid::new_v4().simple()), version: SESSION_VERSION, messages: Vec::new(), total_usage: TokenUsage { input_tokens: 0, output_tokens: 0 }, created_at: now, updated_at: now, model: model.into() }
    }
    pub fn add_user_text(&mut self, text: impl Into<String>) {
        self.messages.push(SessionMessage { role: MessageRole::User, blocks: vec![ContentBlock::text(text)], usage: None, timestamp: Utc::now() });
        self.updated_at = Utc::now();
    }
    pub fn add_system(&mut self, text: impl Into<String>) {
        self.messages.push(SessionMessage { role: MessageRole::System, blocks: vec![ContentBlock::text(text)], usage: None, timestamp: Utc::now() });
    }
    pub fn add_assistant(&mut self, blocks: Vec<ContentBlock>, usage: Option<TokenUsage>) {
        if let Some(u) = &usage { self.total_usage.input_tokens += u.input_tokens; self.total_usage.output_tokens += u.output_tokens; }
        self.messages.push(SessionMessage { role: MessageRole::Assistant, blocks, usage, timestamp: Utc::now() });
        self.updated_at = Utc::now();
    }
    pub fn add_tool_result(&mut self, tool_use_id: impl Into<String>, tool_name: impl Into<String>, output: impl Into<String>, is_error: bool) {
        self.messages.push(SessionMessage { role: MessageRole::Tool, blocks: vec![ContentBlock::tool_result(tool_use_id, tool_name, output, is_error)], usage: None, timestamp: Utc::now() });
        self.updated_at = Utc::now();
    }
    pub fn recent_messages(&self, n: usize) -> &[SessionMessage] {
        let start = self.messages.len().saturating_sub(n);
        &self.messages[start..]
    }
    pub fn estimated_tokens(&self) -> u64 {
        let total_chars: usize = self.messages.iter().flat_map(|m| m.blocks.iter()).filter_map(|b| b.as_text()).map(|t| t.len()).sum();
        (total_chars / 4) as u64
    }
    pub fn compact(&mut self, keep: usize) {
        if self.messages.is_empty() { return; }
        let system_msgs: Vec<_> = self.messages.iter().filter(|m| m.role == MessageRole::System).cloned().collect();
        let non_system: Vec<_> = self.messages.iter().filter(|m| m.role != MessageRole::System).cloned().collect();
        let tail_start = non_system.len().saturating_sub(keep);
        let mut compacted = system_msgs;
        if tail_start < non_system.len() { compacted.extend(non_system[tail_start..].to_vec()); }
        self.messages = compacted;
        self.updated_at = Utc::now();
    }
}
