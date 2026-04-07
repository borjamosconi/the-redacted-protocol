use rd_types::{event::TokenUsage, block::ContentBlock};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct TurnSummary {
    pub assistant_blocks: Vec<ContentBlock>,
    pub tool_results: Vec<ToolResultEntry>,
    pub iterations: u32,
    pub turn_usage: TokenUsage,
    pub completed: bool,
    pub stop_reason: StopCause,
    pub finished_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ToolResultEntry {
    pub tool_name: String, pub output: String, pub is_error: bool, pub hook_feedback: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum StopCause {
    Complete, MaxIterations, PermissionDenied { tool_name: String },
    HookDenied { tool_name: String, reason: String }, ProviderError { message: String },
    ToolFailed { tool_name: String, error: String },
}

impl TurnSummary {
    pub fn complete(ab: Vec<ContentBlock>, tr: Vec<ToolResultEntry>, it: u32, tu: TokenUsage) -> Self {
        Self { assistant_blocks: ab, tool_results: tr, iterations: it, turn_usage: tu, completed: true, stop_reason: StopCause::Complete, finished_at: Utc::now() }
    }
    pub fn stopped(ab: Vec<ContentBlock>, tr: Vec<ToolResultEntry>, it: u32, tu: TokenUsage, sr: StopCause) -> Self {
        Self { assistant_blocks: ab, tool_results: tr, iterations: it, turn_usage: tu, completed: false, stop_reason: sr, finished_at: Utc::now() }
    }
}
