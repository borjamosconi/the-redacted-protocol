mod repl;
mod commands;
mod display;

use clap::{Parser, Subcommand};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[derive(Parser)]
#[command(name = "rd", about = "Redacted Protocol Agent", version)]
struct Cli {
    #[command(subcommand)] command: Option<Command>,
    #[arg(short = 'p', long)] prompt: Option<String>,
    #[arg(long)] resume: bool,
    #[arg(long)] resume_session: Option<String>,
    #[arg(short = 'm', long, default_value = "sonnet")] model: String,
    #[arg(short = 'P', long, default_value = "reconstructor")] permission: String,
    #[arg(long)] json: bool,
    #[arg(short = 'C', long)] cwd: Option<String>,
}

#[derive(Subcommand)]
enum Command { Repl, Prompt { text: String }, Commands, Status, Init, SystemPrompt, Export { session_id: Option<String> } }

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry().with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("rd_core=info,rd_tools=info,rd_hooks=info,rd_providers=info"))).with(tracing_subscriber::fmt::layer()).init();
    let cli = Cli::parse();
    let cwd = if let Some(ref d) = cli.cwd { std::path::PathBuf::from(d) } else { std::env::current_dir()? };
    let action = if let Some(ref cmd) = cli.command {
        match cmd { Command::Repl => Action::Repl, Command::Prompt { text } => Action::OneShot(text.clone()), Command::Commands => Action::Cmd("commands"), Command::Status => Action::Cmd("status"), Command::Init => Action::Cmd("init"), Command::SystemPrompt => Action::Cmd("system_prompt"), Command::Export { session_id } => Action::Cmd(&format!("export:{}", session_id.clone().unwrap_or_default())) }
    } else if let Some(ref p) = cli.prompt { Action::OneShot(p.clone()) }
    else if cli.resume || cli.resume_session.is_some() { Action::Resume(cli.resume_session.as_deref()) }
    else { Action::Repl };
    action.run(&cwd).await
}

enum Action<'a> { Repl, OneShot(String), Resume(Option<&'a str>), Cmd(&'a str) }

impl<'a> Action<'a> {
    async fn run(self, cwd: &std::path::Path) -> anyhow::Result<()> {
        match self {
            Action::Repl => repl::run(cwd).await,
            Action::OneShot(text) => oneshot::run(&text, cwd).await,
            Action::Resume(sid) => { println!("Resume: {:?}", sid); Ok(()) }
            Action::Cmd(cmd) => { commands::run_command(cmd, cwd).await }
        }
    }
}

mod oneshot {
    use rd_config::ConfigLoader;
    use rd_tools::{ToolRegistry, builtins::register_builtins};
    use rd_hooks::HookRunner;
    use rd_providers;
    use rd_types::provider::ProviderKind;

    pub async fn run(prompt: &str, cwd: &std::path::Path) -> anyhow::Result<()> {
        let settings = load_settings(cwd).await;
        let mut tools = ToolRegistry::new(); register_builtins(&mut tools);
        let hooks = HookRunner::from_settings(&settings);
        let provider = setup_provider().await?;
        let mut orch = rd_core::Orchestrator::new(provider, tools, hooks, settings);
        orch.build_system_prompt(cwd, Vec::new()).await;
        let summary = orch.run_turn(prompt).await?;
        for block in &summary.assistant_blocks {
            if let rd_types::block::ContentBlock::Text { text } = block { println!("{}", text); }
        }
        if !summary.tool_results.is_empty() {
            println!("\n--- Tool Results ---");
            for r in &summary.tool_results { println!("\n[{}] {}", r.tool_name, r.output); }
        }
        println!("\n--- turn: {} iterations, {} tokens, {} ---", summary.iterations, summary.turn_usage.total(), if summary.completed { "complete" } else { "stopped" });
        Ok(())
    }

    async fn load_settings(cwd: &std::path::Path) -> rd_config::RuntimeSettings {
        let mut loader = ConfigLoader::new(); loader.set_cwd(cwd); loader.load().await
    }

    async fn setup_provider() -> anyhow::Result<Box<dyn rd_providers::Provider>> {
        let default = if std::env::var("ANTHROPIC_API_KEY").is_ok() { ProviderKind::Anthropic }
            else if std::env::var("OPENAI_API_KEY").is_ok() { ProviderKind::OpenAi }
            else if std::env::var("XAI_API_KEY").is_ok() { ProviderKind::Xai }
            else if std::env::var("OPENROUTER_API_KEY").is_ok() { ProviderKind::OpenRouter }
            else { anyhow::bail!("No LLM API key. Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, XAI_API_KEY, OPENROUTER_API_KEY"); };
        let router = rd_providers::from_env(default).map_err(|e| anyhow::anyhow!(e))?;
        Ok(Box::new(router))
    }
}
