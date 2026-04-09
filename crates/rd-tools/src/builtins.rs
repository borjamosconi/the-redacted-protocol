use std::collections::HashMap;
use async_trait::async_trait;
use tokio::fs;
use crate::registry::{ToolHandler, ToolError, ToolRegistry};
use crate::spec::*;
use rd_types::permission::PermissionLevel;

pub struct ReadFileTool;
#[async_trait]
impl ToolHandler for ReadFileTool {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError> {
        let path = input.get("path").and_then(|v| v.as_str()).ok_or_else(|| ToolError::InvalidInput("missing 'path'".into()))?;
        Ok(fs::read_to_string(path).await.map_err(|e| ToolError::ExecutionFailed(format!("read '{}': {}", path, e)))?)
    }
}

pub struct WriteFileTool;
#[async_trait]
impl ToolHandler for WriteFileTool {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError> {
        let path = input.get("path").and_then(|v| v.as_str()).ok_or_else(|| ToolError::InvalidInput("missing 'path'".into()))?;
        let content = input.get("content").and_then(|v| v.as_str()).unwrap_or("");
        fs::write(path, content).await.map_err(|e| ToolError::ExecutionFailed(format!("write '{}': {}", path, e)))?;
        Ok(format!("Written {} bytes to {}", content.len(), path))
    }
}

pub struct GrepTool;
#[async_trait]
impl ToolHandler for GrepTool {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError> {
        let query = input.get("query").and_then(|v| v.as_str()).ok_or_else(|| ToolError::InvalidInput("missing 'query'".into()))?;
        let path = input.get("path").and_then(|v| v.as_str()).unwrap_or(".");
        let mut results = Vec::new();
        let mut entries = fs::read_dir(path).await.map_err(|e| ToolError::ExecutionFailed(format!("read dir: {}", e)))?;
        while let Ok(Some(entry)) = entries.next_entry().await {
            let ep = entry.path();
            if ep.is_file() {
                if let Ok(content) = fs::read_to_string(&ep).await {
                    for (i, line) in content.lines().enumerate() {
                        if line.to_lowercase().contains(&query.to_lowercase()) {
                            results.push(format!("{}:{}: {}", ep.display(), i + 1, line.trim()));
                        }
                    }
                }
            }
        }
        if results.is_empty() { Ok(format!("No matches for '{}' in {}", query, path)) }
        else { Ok(results.join("\n")) }
    }
}

pub struct ShellTool;
#[async_trait]
impl ToolHandler for ShellTool {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError> {
        let command = input.get("command").and_then(|v| v.as_str()).ok_or_else(|| ToolError::InvalidInput("missing 'command'".into()))?;
        let workdir = input.get("workdir").and_then(|v| v.as_str()).unwrap_or(".");
        let (shell, flag) = if cfg!(windows) { ("cmd.exe", "/C") } else { ("sh", "-c") };
        let output = tokio::process::Command::new(shell).arg(flag).arg(command).current_dir(workdir).output().await
            .map_err(|e| ToolError::ExecutionFailed(format!("command failed: {}", e)))?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        if output.status.success() { Ok(stdout.to_string()) }
        else { Err(ToolError::ExecutionFailed(format!("exit {}: {}", output.status, stderr.trim()))) }
    }
}

pub struct InspectFragmentTool;
#[async_trait]
impl ToolHandler for InspectFragmentTool {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError> {
        let id = input.get("fragment_id").and_then(|v| v.as_str()).ok_or_else(|| ToolError::InvalidInput("missing 'fragment_id'".into()))?;
        Ok(format!("Fragment {} — status: pending (no store connected)", id))
    }
}

pub struct ReconstructTool;
#[async_trait]
impl ToolHandler for ReconstructTool {
    async fn execute(&self, _input: serde_json::Value) -> Result<String, ToolError> {
        Ok("Reconstruction delegated to LLM provider".to_string())
    }
}

pub struct TelegramPublishTool;
#[async_trait]
impl ToolHandler for TelegramPublishTool {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError> {
        let text = input.get("message").and_then(|v| v.as_str())
            .ok_or_else(|| ToolError::InvalidInput("missing 'message'".into()))?;
        let bot = crate::telegram::TelegramBot::from_env()
            .ok_or_else(|| ToolError::ExecutionFailed("TELEGRAM_BOT_TOKEN not set. Create a bot via @BotFather.".into()))?;
        bot.send_message(text).await
            .map_err(|e| ToolError::ExecutionFailed(format!("Telegram: {}", e)))?;
        Ok("Published to Telegram \u{2705}".into())
    }
}

pub struct TelegramStatusTool;
#[async_trait]
impl ToolHandler for TelegramStatusTool {
    async fn execute(&self, _input: serde_json::Value) -> Result<String, ToolError> {
        let bot = crate::telegram::TelegramBot::from_env()
            .ok_or_else(|| ToolError::ExecutionFailed("TELEGRAM_BOT_TOKEN not set".into()))?;
        let me = bot.get_me().await
            .map_err(|e| ToolError::ExecutionFailed(format!("Telegram: {}", e)))?;
        let username = me.get("result").and_then(|r| r.get("username")).and_then(|v| v.as_str()).unwrap_or("unknown");
        let name = me.get("result").and_then(|r| r.get("first_name")).and_then(|v| v.as_str()).unwrap_or("unknown");
        Ok(format!("Telegram connected: {} (@{})", name, username))
    }
}

/// Tool: scan a news URL for conspiracy/censorship indicators.
pub struct ScanNewsTool {
    pub scanner: std::sync::Arc<tokio::sync::Mutex<rd_types::news::NewsScanner>>,
}

#[async_trait]
impl ToolHandler for ScanNewsTool {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError> {
        let url = input.get("url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ToolError::InvalidInput("missing 'url'".into()))?;

        let mut scanner = self.scanner.lock().await;

        if scanner.is_seen(url) {
            return Ok(format!("Already scanned: {}. No new flags.", url));
        }

        scanner.mark_seen(url);

        match scanner.scan_url(url).await {
            Ok(result) => {
                let output = result.detailed_report();
                // Drop back to scanner reference
                drop(scanner);
                Ok(output)
            }
            Err(e) => {
                drop(scanner);
                Err(ToolError::ExecutionFailed(format!("Scan error: {}", e)))
            }
        }
    }
}

pub fn register_builtins(registry: &mut ToolRegistry) {
    registry.register(ToolSpec::builtin("read_file", "Read a file.", file_schema(), PermissionLevel::Observer), Box::new(ReadFileTool));
    registry.register(ToolSpec::builtin("write_file", "Write a file.", write_schema(), PermissionLevel::Reconstructor), Box::new(WriteFileTool));
    registry.register(ToolSpec::builtin("grep_search", "Search files for a pattern.", search_schema(), PermissionLevel::Observer), Box::new(GrepTool));
    registry.register(ToolSpec::builtin("shell", "Run a shell command.", shell_schema(), PermissionLevel::Declassifier), Box::new(ShellTool));
    registry.register(ToolSpec::builtin("inspect_fragment", "View fragment details.", frag_schema(), PermissionLevel::Observer), Box::new(InspectFragmentTool));
    registry.register(ToolSpec::builtin("reconstruct", "Reconstruct redacted content.", frag_schema(), PermissionLevel::Reconstructor), Box::new(ReconstructTool));
    registry.register(ToolSpec::builtin("telegram_publish", "Publish a message to Telegram.", telegram_schema(), PermissionLevel::Declassifier), Box::new(TelegramPublishTool));
    registry.register(ToolSpec::builtin("telegram_status", "Check Telegram bot connection.", serde_json::json!({"type":"object","properties":{}}), PermissionLevel::Observer), Box::new(TelegramStatusTool));
}

/// Register news scanning tool (needs shared scanner).
pub fn register_news_tool(registry: &mut ToolRegistry, scanner: std::sync::Arc<tokio::sync::Mutex<rd_types::news::NewsScanner>>) {
    registry.register(
        ToolSpec::builtin("scan_news", "Scan a news URL for conspiracy/censorship indicators.", news_schema(), PermissionLevel::Observer),
        Box::new(ScanNewsTool { scanner }),
    );
}

fn news_schema() -> serde_json::Value {
    serde_json::json!({"type":"object","properties":{"url":{"type":"string","description":"URL of the news article to scan"}},"required":["url"]})
}

fn file_schema() -> serde_json::Value { serde_json::json!({"type":"object","properties":{"path":{"type":"string","description":"File path"}},"required":["path"]}) }
fn write_schema() -> serde_json::Value { serde_json::json!({"type":"object","properties":{"path":{"type":"string"},"content":{"type":"string"}},"required":["path","content"]}) }
fn search_schema() -> serde_json::Value { serde_json::json!({"type":"object","properties":{"query":{"type":"string"},"path":{"type":"string"}},"required":["query"]}) }
fn shell_schema() -> serde_json::Value { serde_json::json!({"type":"object","properties":{"command":{"type":"string"},"workdir":{"type":"string"}},"required":["command"]}) }
fn frag_schema() -> serde_json::Value { serde_json::json!({"type":"object","properties":{"fragment_id":{"type":"string"},"action":{"type":"string","enum":["reconstruct","verify","anchor","publish"]}},"required":["fragment_id","action"]}) }
fn telegram_schema() -> serde_json::Value { serde_json::json!({"type":"object","properties":{"message":{"type":"string","description":"Message to send"}},"required":["message"]}) }

pub fn tool_aliases() -> HashMap<String, String> {
    HashMap::from([
        ("read".into(),"read_file".into()),("write".into(),"write_file".into()),
        ("grep".into(),"grep_search".into()),("exec".into(),"shell".into()),
        ("run".into(),"shell".into()),("inspect".into(),"inspect_fragment".into()),
        ("tg".into(),"telegram_publish".into()),("tg_status".into(),"telegram_status".into()),
    ])
}
pub fn resolve_tool_name(name: &str) -> String {
    let n = normalize_tool_name(name);
    let aliases = tool_aliases();
    aliases.get(&n).cloned().unwrap_or(n)
}
