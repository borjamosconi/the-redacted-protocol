use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    Text { text: String },
    ToolUse { id: String, name: String, input: serde_json::Value },
    ToolResult { tool_use_id: String, tool_name: String, output: String, is_error: bool },
}

impl ContentBlock {
    pub fn text(text: impl Into<String>) -> Self { Self::Text { text: text.into() } }
    pub fn tool_use(id: impl Into<String>, name: impl Into<String>, input: serde_json::Value) -> Self {
        Self::ToolUse { id: id.into(), name: name.into(), input }
    }
    pub fn tool_result(tool_use_id: impl Into<String>, tool_name: impl Into<String>, output: impl Into<String>, is_error: bool) -> Self {
        Self::ToolResult { tool_use_id: tool_use_id.into(), tool_name: tool_name.into(), output: output.into(), is_error }
    }
    pub fn is_tool_use(&self) -> bool { matches!(self, Self::ToolUse { .. }) }
    pub fn is_tool_result(&self) -> bool { matches!(self, Self::ToolResult { .. }) }
    pub fn as_text(&self) -> Option<&str> { match self { Self::Text { text } => Some(text), _ => None } }
}
