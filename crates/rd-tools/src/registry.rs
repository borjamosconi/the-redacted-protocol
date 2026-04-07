use std::collections::HashMap;
use async_trait::async_trait;
use tracing::{warn, debug};
use crate::spec::*;
use rd_types::permission::{PermissionContext, PermissionLevel};

#[derive(Debug, thiserror::Error)]
pub enum ToolError {
    #[error("Tool not found: {0}")] NotFound(String),
    #[error("Permission denied: {0} requires {1:?}")] PermissionDenied(String, PermissionLevel),
    #[error("Execution failed: {0}")] ExecutionFailed(String),
    #[error("Invalid input: {0}")] InvalidInput(String),
}

#[async_trait]
pub trait ToolHandler: Send + Sync {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError>;
}

pub struct ToolRegistry { specs: HashMap<String, ToolSpec>, handlers: HashMap<String, Box<dyn ToolHandler>> }

impl ToolRegistry {
    pub fn new() -> Self { Self { specs: HashMap::new(), handlers: HashMap::new() } }
    pub fn register(&mut self, spec: ToolSpec, handler: Box<dyn ToolHandler>) {
        let name = normalize_tool_name(&spec.name);
        if self.specs.contains_key(&name) { warn!("Tool '{}' already registered", name); }
        self.specs.insert(name.clone(), spec);
        self.handlers.insert(name, handler);
    }
    pub fn get_spec(&self, name: &str) -> Option<&ToolSpec> { self.specs.get(&normalize_tool_name(name)) }
    pub fn list_specs(&self) -> Vec<&ToolSpec> { self.specs.values().collect() }
    pub fn provider_tool_defs(&self) -> Vec<rd_providers::ToolDefinition> { self.specs.values().map(|s| s.to_provider_def()).collect() }
    pub async fn execute_tool(&self, name: &str, input: serde_json::Value, perm: PermissionLevel, ctx: &PermissionContext) -> Result<String, ToolError> {
        let n = normalize_tool_name(name);
        if ctx.blocks(&n) { return Err(ToolError::PermissionDenied(n, PermissionLevel::Observer)); }
        let spec = self.specs.get(&n).ok_or_else(|| ToolError::NotFound(n.clone()))?;
        if !perm.allows(spec.required_permission) { return Err(ToolError::PermissionDenied(n, spec.required_permission)); }
        let handler = self.handlers.get(&n).ok_or_else(|| ToolError::NotFound(n.clone()))?;
        debug!("Executing tool: {}", n);
        handler.execute(input).await
    }
    pub fn exists(&self, name: &str) -> bool { self.specs.contains_key(&normalize_tool_name(name)) }
    pub fn len(&self) -> usize { self.specs.len() }
    pub fn is_empty(&self) -> bool { self.specs.is_empty() }
}

impl Default for ToolRegistry { fn default() -> Self { Self::new() } }
