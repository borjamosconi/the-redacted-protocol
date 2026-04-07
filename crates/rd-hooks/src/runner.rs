use std::process::Stdio;
use tokio::process::Command;
use tracing::{warn, info, debug};
use crate::hook_types::*;
use rd_config::RuntimeSettings;

#[derive(Debug, Clone)]
pub struct HookCommand { pub command: String, pub args: Vec<String> }
impl HookCommand {
    pub fn new(command: impl Into<String>) -> Self { Self { command: command.into(), args: Vec::new() } }
    pub fn with_args(mut self, args: Vec<String>) -> Self { self.args = args; self }
}

pub struct HookRunner { pre_tool_use: Vec<HookCommand>, post_tool_use: Vec<HookCommand> }

impl HookRunner {
    pub fn new(pre: Vec<HookCommand>, post: Vec<HookCommand>) -> Self { Self { pre_tool_use: pre, post_tool_use: post } }
    pub fn from_settings(settings: &RuntimeSettings) -> Self {
        let pre = settings.pre_tool_hooks.iter().map(|c| HookCommand::new(c)).collect();
        let post = settings.post_tool_hooks.iter().map(|c| HookCommand::new(c)).collect();
        Self::new(pre, post)
    }
    pub fn empty() -> Self { Self { pre_tool_use: Vec::new(), post_tool_use: Vec::new() } }

    pub async fn run_pre_tool_use(&self, tool_name: &str, tool_input: &serde_json::Value) -> HookResult {
        let payload = HookPayload { phase: HookPhase::PreToolUse, tool_name: tool_name.into(), tool_input: Some(tool_input.clone()), tool_output: None, tool_is_error: None };
        self.run_hooks(&self.pre_tool_use, &payload).await
    }
    pub async fn run_post_tool_use(&self, tool_name: &str, output: &str, is_error: bool) -> HookResult {
        let payload = HookPayload { phase: HookPhase::PostToolUse, tool_name: tool_name.into(), tool_input: None, tool_output: Some(output.into()), tool_is_error: Some(is_error) };
        self.run_hooks(&self.post_tool_use, &payload).await
    }

    async fn run_hooks(&self, hooks: &[HookCommand], payload: &HookPayload) -> HookResult {
        let phase_str = match payload.phase { HookPhase::PreToolUse => "pre_tool_use", HookPhase::PostToolUse => "post_tool_use" };
        for hook in hooks {
            debug!("Running {} hook: {}", phase_str, hook.command);
            let mut cmd = Command::new(&hook.command);
            cmd.args(&hook.args);
            cmd.env("RD_HOOK_PHASE", phase_str);
            cmd.env("RD_HOOK_TOOL_NAME", &payload.tool_name);
            if let Some(ref input) = payload.tool_input { if let Ok(s) = serde_json::to_string(input) { cmd.env("RD_HOOK_TOOL_INPUT", s); } }
            if let Some(ref output) = payload.tool_output { cmd.env("RD_HOOK_TOOL_OUTPUT", output); }
            if let Some(is_err) = payload.tool_is_error { cmd.env("RD_HOOK_TOOL_IS_ERROR", is_err.to_string()); }
            cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
            let child = match cmd.spawn() { Ok(c) => c, Err(e) => { warn!("Hook spawn failed: {}", e); continue; } };
            let output = match child.wait_with_output().await { Ok(o) => o, Err(e) => { warn!("Hook wait failed: {}", e); continue; } };
            let code = output.status.code().unwrap_or(-1);
            let stdout = String::from_utf8_lossy(&output.stdout);
            let result = interpret_exit(code, &stdout);
            info!("Hook {} → {:?} (exit={})", hook.command, result, code);
            match &result {
                HookResult::Deny { reason } => return HookResult::Deny { reason: format!("Hook '{}' denied: {}", hook.command, reason) },
                HookResult::Warn { message } => return HookResult::Warn { message: format!("Hook '{}' warned: {}", hook.command, message) },
                _ => {}
            }
        }
        HookResult::Allow { message: None }
    }
}

fn interpret_exit(code: i32, stdout: &str) -> HookResult {
    let trimmed = stdout.trim();
    let msg = if trimmed.is_empty() { None } else { Some(trimmed.to_string()) };
    if code == exit_codes::ALLOW { HookResult::Allow { message: msg } }
    else if code == exit_codes::DENY { HookResult::Deny { reason: msg.unwrap_or_else(|| "denied".into()) } }
    else { HookResult::Warn { message: msg.unwrap_or_else(|| format!("exit code {}", code)) } }
}

pub fn merge_hook_feedback(tool_result: &str, hook_result: &HookResult) -> String {
    match hook_result {
        HookResult::Allow { message: Some(m) } => format!("{}\n\n[Hook feedback]\n{}", tool_result, m),
        HookResult::Deny { reason } => format!("[Hook denied] {}", reason),
        HookResult::Warn { message } => format!("{}\n\n[Hook warning]\n{}", tool_result, message),
        _ => tool_result.to_string(),
    }
}
