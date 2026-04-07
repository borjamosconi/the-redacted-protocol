use serde::{Deserialize, Serialize};
use rd_types::permission::PermissionLevel;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSpec {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    pub required_permission: PermissionLevel,
    pub source: ToolSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ToolSource { Builtin, Plugin { plugin_id: String }, Manifest { path: String } }

impl ToolSpec {
    pub fn builtin(name: impl Into<String>, desc: impl Into<String>, schema: serde_json::Value, perm: PermissionLevel) -> Self {
        Self { name: name.into(), description: desc.into(), input_schema: schema, required_permission: perm, source: ToolSource::Builtin }
    }
    pub fn to_provider_def(&self) -> rd_providers::ToolDefinition {
        rd_providers::ToolDefinition { name: self.name.clone(), description: self.description.clone(), input_schema: self.input_schema.clone() }
    }
}

pub fn normalize_tool_name(name: &str) -> String { name.to_lowercase().replace('-', "_") }
