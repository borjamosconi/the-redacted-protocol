use std::io::{self, Write};
use std::path::Path;
use rd_tools::{ToolRegistry, builtins::register_builtins};
use rd_hooks::HookRunner;
use rd_types::provider::ProviderKind;
use rd_session::{Session, SessionStore};
use crate::commands::handle_slash_command;
use crate::display::format_assistant_response;

pub async fn run(cwd: &Path) -> anyhow::Result<()> {
    println!("========================================");
    println!("  REDACTED PROTOCOL AGENT -- Interactive REPL");
    println!("  Type /help for commands. Ctrl+C to exit.");
    println!("========================================\n");
    let settings = load_settings(cwd).await;
    let mut tools = ToolRegistry::new(); register_builtins(&mut tools);
    let hooks = HookRunner::from_settings(&settings);
    let provider = setup_provider().await?;
    let mut orch = rd_core::Orchestrator::new(provider, tools, hooks, settings);
    orch.build_system_prompt(cwd, Vec::new()).await;
    run_repl_loop(orch, cwd).await
}

/// Run REPL with a pre-loaded session (for session resume)
pub async fn run_with_session(cwd: &Path, session: Session, store: SessionStore) -> anyhow::Result<()> {
    let settings = load_settings(cwd).await;
    let mut tools = ToolRegistry::new(); register_builtins(&mut tools);
    let hooks = HookRunner::from_settings(&settings);
    let provider = setup_provider().await?;
    let mut orch = rd_core::Orchestrator::new(provider, tools, hooks, settings);
    orch.build_system_prompt(cwd, Vec::new()).await;
    
    // Attach session store and restore session state
    orch = orch.with_session_store(store);
    // Manually restore session messages into orchestrator
    orch.session = session;
    
    println!("Session restored successfully. Continuing conversation.");
    run_repl_loop(orch, cwd).await
}

async fn run_repl_loop(mut orch: rd_core::Orchestrator<Box<dyn rd_providers::Provider>>, _cwd: &Path) -> anyhow::Result<()> {
    let mut line = String::new();
    loop {
        print!("\n> "); io::stdout().flush()?; line.clear();
        match io::stdin().read_line(&mut line) { Ok(0) => break, Ok(_) => {}, Err(e) => { eprintln!("Error: {}", e); continue; } }
        let trimmed = line.trim(); if trimmed.is_empty() { continue; }
        if trimmed.starts_with('/') {
            match handle_slash_command(trimmed, &mut orch).await { Ok(o) => { if !o.is_empty() { println!("{}", o); } } Err(e) => eprintln!("Error: {}", e) }
            continue;
        }
        match orch.run_turn(trimmed).await {
            Ok(summary) => {
                for block in &summary.assistant_blocks { format_assistant_response(block); }
                if !summary.tool_results.is_empty() {
                    println!("\n--- Tool Results ---");
                    for r in &summary.tool_results {
                        let s = if r.is_error { "X" } else { "OK" };
                        println!("\n[{}] {} {}", s, r.tool_name, r.output.chars().take(200).collect::<String>());
                    }
                }
                println!("\n[Turn: {} iterations, {} tokens, {}]", summary.iterations, summary.turn_usage.total(), if summary.completed { "complete" } else { "stopped" });
            }
            Err(e) => eprintln!("Error: {}", e),
        }
    }
    println!("\nFarewell. The file is breathing.");
    Ok(())
}

async fn load_settings(cwd: &std::path::Path) -> rd_config::RuntimeSettings {
    let mut l = rd_config::ConfigLoader::new(); l.set_cwd(cwd); l.load().await
}

async fn setup_provider() -> anyhow::Result<Box<dyn rd_providers::Provider>> {
    let default = if std::env::var("ANTHROPIC_API_KEY").is_ok() { ProviderKind::Anthropic }
        else if std::env::var("OPENAI_API_KEY").is_ok() { ProviderKind::OpenAi }
        else if std::env::var("XAI_API_KEY").is_ok() { ProviderKind::Xai }
        else if std::env::var("OPENROUTER_API_KEY").is_ok() { ProviderKind::OpenRouter }
        else { anyhow::bail!("No LLM API key found"); };
    let router = rd_providers::from_env(default).map_err(|e| anyhow::anyhow!(e))?;
    Ok(Box::new(router))
}
