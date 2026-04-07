use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HookPhase { PreToolUse, PostToolUse }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HookResult {
    Allow { message: Option<String> },
    Deny { reason: String },
    Warn { message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookPayload {
    pub phase: HookPhase,
    pub tool_name: String,
    pub tool_input: Option<serde_json::Value>,
    pub tool_output: Option<String>,
    pub tool_is_error: Option<bool>,
}

pub mod exit_codes {
    pub const ALLOW: i32 = 0;
    pub const DENY: i32 = 2;
}
