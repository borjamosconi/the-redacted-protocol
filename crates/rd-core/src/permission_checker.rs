use rd_types::permission::{PermissionContext, PermissionLevel};
use rd_tools::ToolRegistry;

#[derive(Debug, Clone, PartialEq)]
pub enum PermissionDecision { Allow, Deny { reason: String } }

pub struct PermissionChecker { current_level: PermissionLevel, context: PermissionContext }

impl PermissionChecker {
    pub fn new(level: PermissionLevel, ctx: PermissionContext) -> Self { Self { current_level: level, context: ctx } }
    pub fn authorize(&self, tool_name: &str, registry: &ToolRegistry) -> PermissionDecision {
        if self.context.blocks(tool_name) { return PermissionDecision::Deny { reason: format!("Tool '{}' blocked by context", tool_name) }; }
        if let Some(spec) = registry.get_spec(tool_name) {
            if !self.current_level.allows(spec.required_permission) {
                return PermissionDecision::Deny { reason: format!("Tool '{}' requires {:?}, current is {:?}", tool_name, spec.required_permission, self.current_level) };
            }
        }
        PermissionDecision::Allow
    }
    pub fn set_level(&mut self, level: PermissionLevel) { self.current_level = level; }
    pub fn level(&self) -> PermissionLevel { self.current_level }
}
