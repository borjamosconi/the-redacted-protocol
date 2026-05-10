use std::path::Path;
use tracing::{info, debug, warn, error};
use rd_types::{block::ContentBlock, event::TokenUsage, permission::PermissionContext};
use rd_session::{Session, SessionStore};
use rd_providers::{Provider, InferenceRequest, ProviderMessage, ProviderContentBlock, ProviderError};
use rd_tools::{ToolRegistry, ToolError, RateLimiterSet};
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
    #[error("Rate limited: retry after {0:?}")] RateLimited(std::time::Duration),
    #[error("Ralph error: {0}")] Ralph(String),
}

/// Result of a Ralph verification cycle
#[derive(Debug, Clone)]
pub struct RalphResult {
    /// All summaries from each repair cycle
    pub cycles: Vec<TurnSummary>,
    /// Total verification attempts
    pub attempts: u32,
    /// Whether the work was ultimately verified
    pub verified: bool,
    /// Final verified response text
    pub final_output: String,
    /// Combined token usage across all cycles
    pub total_usage: TokenUsage,
}

impl RalphResult {
    pub fn success(cycles: Vec<TurnSummary>, final_output: String, total_usage: TokenUsage) -> Self {
        let attempts = cycles.len() as u32;
        Self { cycles, attempts, verified: true, final_output, total_usage }
    }

    pub fn failure(cycles: Vec<TurnSummary>, reason: String) -> Self {
        let attempts = cycles.len() as u32;
        let total_usage = cycles.iter().fold(TokenUsage { input_tokens: 0, output_tokens: 0 }, |acc, s| TokenUsage {
            input_tokens: acc.input_tokens + s.turn_usage.input_tokens,
            output_tokens: acc.output_tokens + s.turn_usage.output_tokens,
        });
        Self { cycles, attempts, verified: false, final_output: reason, total_usage }
    }
}

pub struct Orchestrator<P> {
    pub provider: P, pub tools: ToolRegistry, pub hooks: HookRunner, pub permission: PermissionChecker,
    pub session_store: Option<SessionStore>, pub session: Session, pub system_prompt: String, pub settings: RuntimeSettings,
    pub rate_limiter: RateLimiterSet,
}

impl<P: Provider> Orchestrator<P> {
    pub fn new(provider: P, tools: ToolRegistry, hooks: HookRunner, settings: RuntimeSettings) -> Self {
        let permission = PermissionChecker::new(settings.permission_mode, PermissionContext::default());
        let session = Session::new(&settings.model);
        let rate_limiter = RateLimiterSet::from_env();
        Self { provider, tools, hooks, permission, session_store: None, session, system_prompt: SystemPromptBuilder::new().build(), settings, rate_limiter }
    }
    pub fn with_system_prompt(mut self, prompt: String) -> Self { self.system_prompt = prompt; self }
    pub async fn build_system_prompt(&mut self, cwd: &Path, instruction_files: Vec<(String, String)>) {
        let mut builder = SystemPromptBuilder::new();
        if let Some(gc) = git_project_context(cwd).await { builder = builder.project_context(gc); }
        let mut system_instructions = String::new();
        for (path, content) in instruction_files { system_instructions.push_str(&format!("### {}\n\n{}\n\n", path, content)); }
        builder = builder.instructions(system_instructions);
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
        
        // Check rate limit before making inference call
        if !self.rate_limiter.try_acquire_inference().await {
            let retry_after = self.rate_limiter.inference_retry_after().await;
            warn!("Inference rate limit exceeded, retry after: {:?}", retry_after);
            return Err(OrchestratorError::RateLimited(retry_after));
        }
        
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
            
            // Collect blocks for the turn summary and session history
            assistant_blocks.extend(response.blocks.clone());
            self.session.add_assistant(response.blocks.clone(), response.usage.clone());

            // Collect all tool use blocks
            let tool_calls: Vec<_> = response.blocks.iter().filter_map(|b| {
                if let ContentBlock::ToolUse { id, name, input } = b {
                    Some((id.clone(), name.clone(), input.clone()))
                } else {
                    None
                }
            }).collect();

            if tool_calls.is_empty() {
                info!("Turn complete: {} iterations, {} tokens", iterations, total_usage.total());
                self.save_session().await;
                return Ok(TurnSummary::complete(assistant_blocks, tool_results, iterations, total_usage));
            }

            // Execute all tool calls in parallel
            let mut futures = Vec::new();
            for (id, name, input) in tool_calls {
                let tools = &self.tools;
                let permission = &self.permission;
                let hooks = &self.hooks;

                futures.push(async move {
                    debug!("Processing tool call: {} ({})", name, id);
                    
                    // Authorize
                    match permission.authorize(&name, tools) {
                        PermissionDecision::Allow => {}
                        PermissionDecision::Deny { reason } => {
                            warn!("Permission denied: {} — {}", name, reason);
                            return (id, name, format!("DENIED: {}", reason), true, Some(reason));
                        }
                    }

                    // Pre-hook
                    match hooks.run_pre_tool_use(&name, &input).await {
                        HookResult::Allow { .. } => {}
                        HookResult::Deny { reason } => {
                            warn!("Hook denied: {} — {}", name, reason);
                            return (id, name, format!("HOOK DENIED: {}", reason), true, Some(reason));
                        }
                        HookResult::Warn { message } => { debug!("Hook warn: {} — {}", name, message); }
                    }

                    // Execute
                    let result = tools.execute_tool(&name, input, permission.level(), &PermissionContext::default()).await;
                    let (output, is_error) = match result {
                        Ok(o) => (o, false),
                        Err(e) => { error!("Tool {} failed: {}", name, e); (format!("ERROR: {}", e), true) }
                    };

                    // Post-hook
                    let hook_feedback = match hooks.run_post_tool_use(&name, &output, is_error).await {
                        HookResult::Allow { message } => message,
                        HookResult::Deny { reason } => Some(format!("Post-hook denied: {}", reason)),
                        HookResult::Warn { message } => Some(message),
                    };

                    (id, name, output, is_error, hook_feedback)
                });
            }

            let results = futures::future::join_all(futures).await;

            // Process results and add to session/summary
            for (id, name, output, is_error, hook_feedback) in results {
                self.session.add_tool_result(&id, &name, &output, is_error);
                tool_results.push(ToolResultEntry { 
                    tool_name: name, 
                    output, 
                    is_error, 
                    hook_feedback 
                });
            }
        }
    }

    pub async fn process_fragment(&mut self, fragment: &rd_types::Fragment) -> Result<TurnSummary, OrchestratorError> {
        let prompt = format!("Process this redacted fragment:\n\n=== FRAGMENT {} ===\nContent Hash: {}\nSource Type: {:?}\nRedaction Zones: {}\n\n```\n{}\n```\n\nReconstruct the redacted content and provide a confidence score.",
            fragment.id, fragment.content_hash, fragment.source.source_type, fragment.source.redaction_zones, fragment.redacted_content);
        self.run_turn(&prompt).await
    }

    /// Recursive Verification Mode: Execute task, verify result, repair if needed, repeat until verified.
    ///
    /// This implements the "never give up" loop for deterministic declassification.
    /// The orchestrator will:
    /// 1. Execute the original task
    /// 2. Run a verification pass to check completeness and correctness
    /// 3. If issues found, repair them and re-verify
    /// 4. Repeat until verified or max_ralph_cycles reached
    pub async fn run_ralph(&mut self, user_input: &str, max_cycles: u32) -> Result<RalphResult, OrchestratorError> {
        const VERIFICATION_PROMPT: &str = "Review the work above critically. Check for:\n\
            - Completeness: All requirements addressed?\n\
            - Correctness: No bugs, errors, or logical flaws?\n\
            - Edge cases: Handled boundary conditions?\n\
            - Quality: Clean, maintainable, well-structured?\n\n\
            If PERFECT and COMPLETE, respond with ONLY: PROTOCOL_VERIFIED\n\
            If ANY issues exist, list each specific issue with file/line references.\n\
            Be strict. Do not approve substandard work.";

        let mut cycles = Vec::new();
        let mut total_usage = TokenUsage { input_tokens: 0, output_tokens: 0 };

        for cycle in 0..max_cycles {
            info!("Ralph cycle {}/{} — executing task", cycle + 1, max_cycles);

            // Execute the task (or repair)
            let summary = self.run_turn(user_input).await?;
            total_usage.input_tokens += summary.turn_usage.input_tokens;
            total_usage.output_tokens += summary.turn_usage.output_tokens;
            cycles.push(summary);

            // Verify the result
            if !self.rate_limiter.try_acquire_inference().await {
                let retry_after = self.rate_limiter.inference_retry_after().await;
                warn!("Ralph: rate limited during verification, retry after {:?}", retry_after);
                return Err(OrchestratorError::RateLimited(retry_after));
            }

            let verification_request = self.build_request_with_system(VERIFICATION_PROMPT);
            let verification_response = match self.provider.send(verification_request).await {
                Ok(r) => r,
                Err(e) => {
                    error!("Ralph verification failed: {}", e);
                    return Ok(RalphResult::failure(cycles, format!("Verification provider error: {}", e)));
                }
            };

            if let Some(u) = &verification_response.usage {
                total_usage.input_tokens += u.input_tokens;
                total_usage.output_tokens += u.output_tokens;
            }

            // Extract text from verification response
            let verification_text: Vec<String> = verification_response.blocks.iter()
                .filter_map(|b| {
                    if let ContentBlock::Text { text } = b { Some(text.clone()) } else { None }
                })
                .collect();

            let combined = verification_text.join("\n");
            info!("Ralph verification result: {} chars", combined.len());

            // Check if verified
            if combined.trim().contains("PROTOCOL_VERIFIED") {
                info!("Protocol: VERIFIED after {} cycle(s)", cycle + 1);

                // Extract the final output from the last cycle
                let final_output: Vec<String> = cycles.last()
                    .ok_or(OrchestratorError::Ralph("No cycles recorded".into()))?
                    .assistant_blocks.iter()
                    .filter_map(|b| {
                        if let ContentBlock::Text { text } = b { Some(text.clone()) } else { None }
                    })
                    .collect();

                self.save_session().await;
                return Ok(RalphResult::success(cycles, final_output.join("\n"), total_usage));
            }

            // Not verified — prepare repair prompt
            let issues = combined;
            let repair_prompt = format!(
                "The previous work was reviewed and found to have issues.\n\n\
                 ISSUES TO FIX:\n{}\n\n\
                 Fix ALL issues listed above. Be thorough. Ensure every single issue is resolved.\n\
                 After fixing, produce the complete corrected output.",
                issues
            );

            warn!("Ralph: {} issues found, entering repair cycle", issues.lines().take(5).collect::<Vec<_>>().join(", "));

            // Update user_input for next cycle to include repair instructions
            // We append repair instructions to the session so next run_turn sees them
            self.session.add_user_text(&repair_prompt);
        }

        // Max cycles reached without verification
        warn!("Ralph: max cycles ({}) reached without verification", max_cycles);
        Ok(RalphResult::failure(cycles, format!(
            "Work could not be verified after {} cycles. Review the issues in the cycle history.",
            max_cycles
        )))
    }

    fn build_request(&self) -> InferenceRequest {
        self.build_request_with_system(&self.system_prompt)
    }

    fn build_request_with_system(&self, system_prompt: &str) -> InferenceRequest {
        // Session context window management: prevent unbounded token costs
        // Keep system prompt + last N messages + summary of earlier context
        const MAX_MESSAGES: usize = 50; // Keep last 50 messages (~10-15K tokens)

        let total_messages = self.session.messages.len();

        let messages: Vec<_> = if total_messages <= MAX_MESSAGES {
            // All messages fit within window
            self.session.messages.iter().map(|m| Self::to_provider_message(m)).collect()
        } else {
            // Truncate: keep system + first message + last N-2 messages
            let skip = total_messages - MAX_MESSAGES + 1;
            let truncated: Vec<_> = self.session.messages.iter().skip(skip).collect();
            truncated.iter().map(|m| Self::to_provider_message(m)).collect()
        };

        InferenceRequest { system_prompt: system_prompt.to_string(), messages, max_tokens: self.settings.max_tokens_per_turn, temperature: self.settings.temperature, stream: false, tools: self.tools.provider_tool_defs() }
    }

    fn to_provider_message(m: &rd_session::SessionMessage) -> ProviderMessage {
        ProviderMessage {
            role: match m.role {
                rd_session::MessageRole::System => "system".into(),
                rd_session::MessageRole::User => "user".into(),
                rd_session::MessageRole::Assistant => "assistant".into(),
                rd_session::MessageRole::Tool => "tool".into(),
            },
            content: m.blocks.iter().map(|b| match b {
                ContentBlock::Text { text } => ProviderContentBlock::Text(text.clone()),
                ContentBlock::ToolUse { id, name, input } => ProviderContentBlock::ToolUse { id: id.clone(), name: name.clone(), input: input.clone() },
                ContentBlock::ToolResult { tool_use_id, tool_name: _, output, is_error } => ProviderContentBlock::ToolResult { tool_use_id: tool_use_id.clone(), output: output.clone(), is_error: is_error.clone() },
            }).collect(),
        }
    }

    async fn save_session(&self) {
        if let Some(ref store) = self.session_store {
            if let Err(e) = store.save(&self.session).await { warn!("Failed to save session: {}", e); }
        }
    }
}
