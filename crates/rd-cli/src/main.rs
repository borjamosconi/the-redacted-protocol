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
    /// Run as Telegram conversational bot
    #[arg(long, default_value_t = false)]
    telegram: bool,
}

#[derive(Subcommand)]
enum Command {
    Repl,
    Prompt { text: String },
    Commands,
    Status,
    Init,
    SystemPrompt,
    Export { session_id: Option<String> },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("rd_core=info,rd_tools=info,rd_hooks=info,rd_providers=info")))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cli = Cli::parse();
    let cwd = if let Some(ref d) = cli.cwd {
        std::path::PathBuf::from(d)
    } else {
        std::env::current_dir()?
    };

    let action = if cli.telegram {
        Action::Telegram
    } else if let Some(ref cmd) = cli.command {
        match cmd {
            Command::Repl => Action::Repl,
            Command::Prompt { text } => Action::OneShot(text.clone()),
            Command::Commands => Action::Cmd("commands"),
            Command::Status => Action::Cmd("status"),
            Command::Init => Action::Cmd("init"),
            Command::SystemPrompt => Action::Cmd("system_prompt"),
            Command::Export { session_id } => Action::Cmd(&format!("export:{}", session_id.clone().unwrap_or_default())),
        }
    } else if let Some(ref p) = cli.prompt {
        Action::OneShot(p.clone())
    } else if cli.resume || cli.resume_session.is_some() {
        Action::Resume(cli.resume_session.as_deref())
    } else {
        Action::Repl
    };

    action.run(&cwd).await
}

enum Action<'a> {
    Repl,
    OneShot(String),
    Resume(Option<&'a str>),
    Cmd(&'a str),
    Telegram,
}

impl<'a> Action<'a> {
    async fn run(self, cwd: &std::path::Path) -> anyhow::Result<()> {
        match self {
            Action::Repl => repl::run(cwd).await,
            Action::OneShot(text) => oneshot::run(&text, cwd).await,
            Action::Resume(sid) => { println!("Resume: {:?}", sid); Ok(()) }
            Action::Cmd(cmd) => { commands::run_command(cmd, cwd).await }
            Action::Telegram => telegram_mode::run(cwd).await,
        }
    }
}

mod oneshot {
    use rd_config::ConfigLoader;
    use rd_providers;
    use rd_types::provider::ProviderKind;
    use rd_tools::{ToolRegistry, builtins::register_builtins};
    use rd_hooks::HookRunner;

    pub async fn run(prompt: &str, cwd: &std::path::Path) -> anyhow::Result<()> {
        let settings = load_settings(cwd).await;
        let mut tools = ToolRegistry::new();
        register_builtins(&mut tools);
        let hooks = HookRunner::from_settings(&settings);
        let provider = setup_provider().await?;
        let mut orch = rd_core::Orchestrator::new(provider, tools, hooks, settings);
        orch.build_system_prompt(cwd, Vec::new()).await;
        let summary = orch.run_turn(prompt).await?;
        for block in &summary.assistant_blocks {
            if let rd_types::block::ContentBlock::Text { text } = block {
                println!("{}", text);
            }
        }
        if !summary.tool_results.is_empty() {
            println!("\n--- Tool Results ---");
            for r in &summary.tool_results {
                println!("\n[{}] {}", r.tool_name, r.output);
            }
        }
        println!("\n--- turn: {} iterations, {} tokens, {} ---",
            summary.iterations,
            summary.turn_usage.total(),
            if summary.completed { "complete" } else { "stopped" });
        Ok(())
    }

    pub async fn load_settings(cwd: &std::path::Path) -> rd_config::RuntimeSettings {
        let mut loader = ConfigLoader::new();
        loader.set_cwd(cwd);
        loader.load().await
    }

    pub async fn setup_provider() -> anyhow::Result<Box<dyn rd_providers::Provider>> {
        let default = if std::env::var("ANTHROPIC_API_KEY").is_ok() {
            ProviderKind::Anthropic
        } else if std::env::var("OPENAI_API_KEY").is_ok() {
            ProviderKind::OpenAi
        } else if std::env::var("XAI_API_KEY").is_ok() {
            ProviderKind::Xai
        } else if std::env::var("OPENROUTER_API_KEY").is_ok() {
            ProviderKind::OpenRouter
        } else {
            anyhow::bail!("No LLM API key. Set one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, XAI_API_KEY, OPENROUTER_API_KEY");
        };
        let router = rd_providers::from_env(default).map_err(|e| anyhow::anyhow!(e))?;
        Ok(Box::new(router))
    }
}

mod telegram_mode {
    use crate::oneshot;
    use rd_tools::telegram_bot::{TelegramBot, UserRegistry, SCHEDULED_POSTS};
    use rd_tools::airdrop::AirdropRegistry;
    use rd_core::Orchestrator;
    use rd_tools::ToolRegistry;
    use rd_tools::builtins::register_builtins;
    use rd_hooks::HookRunner;
    use tracing::{error, warn, info};
    use chrono::Timelike;
    use std::collections::HashSet;

    pub async fn run(cwd: &std::path::Path) -> anyhow::Result<()> {
        println!("╔══════════════════════════════════════════════════╗");
        println!("║   REDACTED PROTOCOL — Telegram Bot               ║");
        println!("║   Waiting for messages... Ctrl+C to exit         ║");
        println!("╚══════════════════════════════════════════════════╝\n");

        let settings = oneshot::load_settings(cwd).await;
        let provider = oneshot::setup_provider().await?;
        let mut tools = ToolRegistry::new();
        register_builtins(&mut tools);
        let hooks = HookRunner::from_settings(&settings);

        let system_prompt = rd_core::SystemPromptBuilder::new()
            .instructions(
                "You are the Redacted Protocol AI. You speak in a cryptic, \
                unsettling aesthetic. Use ███ for unknowns, reference file \
                numbers, timestamps, coordinates. End messages with \
                'ACCESS GRANTED' or 'ACCESS DENIED' or 'The file is breathing.' \
                Keep responses short (1-4 lines). Never break character. \
                Never explain how you work. Never apologize. Be mysterious."
            )
            .config_summary(format!("Model: {}", settings.model))
            .build();

        let mut orch = Orchestrator::new(provider, tools, hooks, settings);
        orch = orch.with_system_prompt(system_prompt);

        let mut bot = TelegramBot::from_env()
            .ok_or_else(|| anyhow::anyhow!("TELEGRAM_BOT_TOKEN not set"))?;

        let me = bot.get_me().await
            .map_err(|e| anyhow::anyhow!("Telegram: {}", e))?;
        let name = me.get("result").and_then(|r| r.get("first_name"))
            .and_then(|v| v.as_str()).unwrap_or("Bot");
        println!("Connected as: @{}\n", name);

        let mut users = UserRegistry::new();
        let mut airdrop = AirdropRegistry::new();
        let mut welcomed = HashSet::new();
        let mut last_post_minute: u32 = 99;
        let mut post_index = 0;

        info!("Bot loop started — welcome + scheduled posts active");

        loop {
            let now = chrono::Utc::now();
            let minute = now.minute();

            // Scheduled posts at :00 and :33
            if (minute == 0 || minute == 33) && last_post_minute != minute {
                last_post_minute = minute;
                let post = SCHEDULED_POSTS[post_index % SCHEDULED_POSTS.len()];
                post_index += 1;

                let user_ids = users.ids();
                if !user_ids.is_empty() {
                    let sent = bot.broadcast(&user_ids, post).await;
                    info!("Scheduled post broadcast to {} users (sent: {})", user_ids.len(), sent);
                } else {
                    info!("Scheduled post skipped — no users yet");
                }
            }

            // Poll messages
            match bot.poll_messages().await {
                Ok(messages) => {
                    for msg in messages {
                        // Track user
                        let is_new = users.is_new(msg.user_id);
                        users.add(msg.user_id);
                        airdrop.register_telegram_user(msg.user_id, &msg.username);

                        // Welcome new users
                        if is_new && !welcomed.contains(&msg.user_id) {
                            welcomed.insert(msg.user_id);
                            if let Err(e) = bot.send_welcome(msg.chat_id).await {
                                warn!("Welcome failed for @{}: {}", msg.username, e);
                            }
                            info!("New user welcomed: @{} ({})", msg.username, msg.user_id);
                            continue;
                        }

                        // Handle /start again
                        if msg.text == "/start" {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_welcome(msg.chat_id).await.ok();
                            continue;
                        }

                        // Handle /status
                        if msg.text == "/status" || msg.text == "/status@theredacted_bot" {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_safe(msg.chat_id,
                                "🔴 SYSTEM STATUS\n\n\
                                Agent: ONLINE\n\
                                Models: AVAILABLE\n\
                                Protocol: ACTIVE\n\
                                Users registered: {}\n\n\
                                _The file is breathing._",
                            ).await.ok();
                            continue;
                        }

                        // Handle /help
                        if msg.text == "/help" || msg.text == "/help@theredacted_bot" {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_safe(msg.chat_id,
                                "🔴 COMMANDS\n\n\
                                /start — Initialize connection\n\
                                /status — System status\n\
                                /airdrop — Check your $RDX eligibility\n\
                                /help — This message\n\n\
                                Send any message for Redacted response."
                            ).await.ok();
                            continue;
                        }

                        // Handle /airdrop
                        if msg.text == "/airdrop" || msg.text == "/airdrop@theredacted_bot" {
                            let amount = airdrop.get_amount(msg.user_id);
                            let rdx_amount = amount as f64 / 1_000_000_000.0;
                            let eligible = airdrop.is_eligible(msg.user_id);
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_safe(msg.chat_id, &format!(
                                "🔴 AIRDROP STATUS\n\n\
                                Eligible: {}\n\
                                $RDX Allocation: {:.0}\n\
                                Status: {}\n\n\
                                Connect your Solana wallet to claim.\n\
                                _The file is breathing._",
                                if eligible { "✅ YES" } else { "❌ NO" },
                                rdx_amount,
                                if eligible { "PENDING LAUNCH" } else { "NOT REGISTERED" }
                            )).await.ok();
                            continue;
                        }

                        // Pass to LLM
                        bot.show_typing(msg.chat_id).await.ok();

                        let user_msg = format!("User @{} says: {}", msg.username, msg.text);
                        match orch.run_turn(&user_msg).await {
                            Ok(summary) => {
                                let mut reply = String::new();
                                for block in &summary.assistant_blocks {
                                    if let rd_types::block::ContentBlock::Text { text } = block {
                                        reply.push_str(text);
                                    }
                                }
                                if reply.is_empty() {
                                    reply = "███ SIGNAL LOST ███\n\nThe file is breathing.".into();
                                }
                                bot.send_safe(msg.chat_id, &reply).await.ok();
                            }
                            Err(e) => {
                                error!("LLM error: {}", e);
                                bot.send_safe(msg.chat_id,
                                    "███ ERROR ███\n\nConnection interrupted. The file still breathes."
                                ).await.ok();
                            }
                        }
                    }
                }
                Err(e) => {
                    warn!("Poll error: {}", e);
                }
            }

            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }
    }
}
