use std::path::Path;
use tracing::{info, debug, warn, error};
use rd_types::{block::ContentBlock, event::TokenUsage, permission::PermissionContext};
use rd_session::{Session, SessionStore};
use rd_providers::{Provider, LlmRequest, ProviderMessage, ProviderContentBlock, ProviderError};
use rd_tools::{ToolRegistry, ToolError};
use rd_hooks::{HookRunner, HookResult};
use rd_config::RuntimeSettings;
use crate::prompt_builder::{SystemPromptBuilder, git_project_context};
use crate::turn_summary::{TurnSummary, ToolResultEntry, StopCause};
use crate::permission_checker::{PermissionChecker, PermissionDecision};

#[derive(Debug, thiserror::Error)]
pub enum OrchestratorError {
    #[error("Provider error: {0}")] Provider(#[from] ProviderError),
    #[error("Tool error: {0}")] Tool(#[from] ToolError),
    #[error("Session error: {0}")] Session(String),
    #[error("Hook denied: {0}")] HookDenied(String),
    #[error("Max iterations")] MaxIterations,
}

pub struct Orchestrator<P> {
    pub provider: P, pub tools: ToolRegistry, pub hooks: HookRunner, pub permission: PermissionChecker,
    pub session_store: Option<SessionStore>, pub session: Session, pub system_prompt: String, pub settings: RuntimeSettings,
}

impl<P: Provider> Orchestrator<P> {
    pub fn new(provider: P, tools: ToolRegistry, hooks: HookRunner, settings: RuntimeSettings) -> Self {
        let permission = PermissionChecker::new(settings.permission_mode, PermissionContext::default());
        let session = Session::new(&settings.model);
        Self { provider, tools, hooks, permission, session_store: None, session, system_prompt: SystemPromptBuilder::new().build(), settings }
    }
    pub fn with_system_prompt(mut self, prompt: String) -> Self { self.system_prompt = prompt; self }
    pub async fn build_system_prompt(&mut self, cwd: &Path, instruction_files: Vec<(String, String)>) {
        let mut builder = SystemPromptBuilder::new();
        if let Some(gc) = git_project_context(cwd).await { builder = builder.project_context(gc); }
        let mut ai = String::new();
        for (path, content) in instruction_files { ai.push_str(&format!("### {}\n\n{}\n\n", path, content)); }
        builder = builder.instructions(ai);
        builder = builder.config_summary(format!("Model: {}\nPermission: {:?}\nMax iterations: {}\nThreshold: {}", self.settings.model, self.settings.permission_mode, self.settings.max_iterations, self.settings.confidence_threshold));
        self.system_prompt = builder.build();
    }
    pub fn with_session_store(mut self, store: SessionStore) -> Self { self.session_store = Some(store); self }
    pub async fn load_session(&mut self, session_id: &str) -> Result<(), OrchestratorError> {
        if let Some(ref store) = self.session_store {
            self.session = store.load(session_id).await.map_err(|e| OrchestratorError::Session(e.to_string()))?;
        } else { return Err(OrchestratorError::Session("No store".into())); }
        Ok(())
    }

    pub async fn run_turn(&mut self, user_input: &str) -> Result<TurnSummary, OrchestratorError> {
        self.session.add_user_text(user_input);
        let mut iterations = 0u32;
        let mut total_usage = TokenUsage { input_tokens: 0, output_tokens: 0 };
        let mut assistant_blocks = Vec::new();
        let mut tool_results = Vec::new();

        loop {
            if iterations >= self.settings.max_iterations as u32 {
                return Ok(TurnSummary::stopped(assistant_blocks.clone(), tool_results.clone(), iterations, total_usage, StopCause::MaxIterations));
            }
            iterations += 1;
            let request = self.build_request();
            let response = match self.provider.send(request).await {
                Ok(r) => r,
                Err(e) => { error!("Provider error: {}", e); return Ok(TurnSummary::stopped(assistant_blocks.clone(), tool_results.clone(), iterations, total_usage, StopCause::ProviderError { message: e.to_string() })); }
            };
            if let Some(u) = &response.usage { total_usage.input_tokens += u.input_tokens; total_usage.output_tokens += u.output_tokens; }
            let has_tool_calls = response.blocks.iter().any(|b| b.is_tool_use());
            for b in &response.blocks { assistant_blocks.push(b.clone()); }
            self.session.add_assistant(response.blocks.clone(), response.usage);
            if !has_tool_calls {
                info!("Turn complete: {} iterations, {} tokens", iterations, total_usage.total());
                self.save_session().await;
                return Ok(TurnSummary::complete(assistant_blocks, tool_results, iterations, total_usage));
            }
            for block in &response.blocks {
                if let ContentBlock::ToolUse { id, name, input } = block {
                    debug!("Tool call: {} ({})", name, id);
                    match self.permission.authorize(name, &self.tools) {
                        PermissionDecision::Allow => {}
                        PermissionDecision::Deny { reason } => {
                            warn!("Permission denied: {} — {}", name, reason);
                            self.session.add_tool_result(id, name, format!("DENIED: {}", reason), true);
                            tool_results.push(ToolResultEntry { tool_name: name.clone(), output: format!("DENIED: {}", reason), is_error: true, hook_feedback: None });
                            continue;
                        }
                    }
                    match self.hooks.run_pre_tool_use(name, input).await {
                        HookResult::Allow { .. } => {}
                        HookResult::Deny { reason } => {
                            warn!("Hook denied: {} — {}", name, reason);
                            self.session.add_tool_result(id, name, format!("HOOK DENIED: {}", reason), true);
                            tool_results.push(ToolResultEntry { tool_name: name.clone(), output: format!("HOOK DENIED: {}", reason), is_error: true, hook_feedback: Some(reason.clone()) });
                            continue;
                        }
                        HookResult::Warn { message } => { debug!("Hook warn: {} — {}", name, message); }
                    }
                    let result = self.tools.execute_tool(name, input.clone(), self.permission.level(), &PermissionContext::default()).await;
                    let (output, is_error) = match result {
                        Ok(o) => (o, false),
                        Err(e) => { error!("Tool {} failed: {}", name, e); (format!("ERROR: {}", e), true) }
                    };
                    let hook_feedback = match self.hooks.run_post_tool_use(name, &output, is_error).await {
                        HookResult::Allow { message } => message,
                        HookResult::Deny { reason } => Some(format!("Post-hook denied: {}", reason)),
                        HookResult::Warn { message } => Some(message),
                    };
                    self.session.add_tool_result(id, name, &output, is_error);
                    tool_results.push(ToolResultEntry { tool_name: name.clone(), output, is_error, hook_feedback });
                }
            }
        }
    }

    pub async fn process_fragment(&mut self, fragment: &rd_types::Fragment) -> Result<TurnSummary, OrchestratorError> {
        let prompt = format!("Process this redacted fragment:\n\n=== FRAGMENT {} ===\nContent Hash: {}\nSource Type: {:?}\nRedaction Zones: {}\n\n```\n{}\n```\n\nReconstruct the redacted content and provide a confidence score.",
            fragment.id, fragment.content_hash, fragment.source.source_type, fragment.source.redaction_zones, fragment.redacted_content);
        self.run_turn(&prompt).await
    }

    fn build_request(&self) -> LlmRequest {
        let messages: Vec<_> = self.session.messages.iter().map(|m| {
            ProviderMessage {
                role: match m.role { rd_session::MessageRole::System => "system".into(), rd_session::MessageRole::User => "user".into(), rd_session::MessageRole::Assistant => "assistant".into(), rd_session::MessageRole::Tool => "tool".into() },
                content: m.blocks.iter().map(|b| match b {
                    ContentBlock::Text { text } => ProviderContentBlock::Text(text.clone()),
                    ContentBlock::ToolUse { id, name, input } => ProviderContentBlock::ToolUse { id: id.clone(), name: name.clone(), input: input.clone() },
                    ContentBlock::ToolResult { tool_use_id, tool_name, output, is_error } => ProviderContentBlock::ToolResult { tool_use_id: tool_use_id.clone(), output: output.clone(), is_error: *is_error },
                }).collect(),
            }
        }).collect();
        LlmRequest { system_prompt: self.system_prompt.clone(), messages, max_tokens: self.settings.max_tokens_per_turn, temperature: self.settings.temperature, stream: false, tools: self.tools.provider_tool_defs() }
    }

    async fn save_session(&self) {
        if let Some(ref store) = self.session_store {
            if let Err(e) = store.save(&self.session).await { warn!("Failed to save session: {}", e); }
        }
    }
}
