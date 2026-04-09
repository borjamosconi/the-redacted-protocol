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

    // Set up graceful shutdown handler
    let shutdown_signal = setup_shutdown_signal();

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

    let result = tokio::select! {
        res = action.run(&cwd) => res,
        _ = shutdown_signal => {
            tracing::info!("Shutdown signal received, exiting gracefully");
            Ok(())
        }
    };

    result
}

/// Set up graceful shutdown on SIGINT/SIGTERM
async fn setup_shutdown_signal() -> () {
    use tokio::signal;

    #[cfg(unix)]
    {
        let mut term = signal::unix::signal(signal::unix::SignalKind::terminate()).unwrap();
        let mut int = signal::unix::signal(signal::unix::SignalKind::interrupt()).unwrap();

        tokio::select! {
            _ = term.recv() => {
                tracing::info!("Received SIGTERM");
            }
            _ = int.recv() => {
                tracing::info!("Received SIGINT");
            }
        }
    }

    #[cfg(not(unix))]
    {
        signal::ctrl_c().await.expect("Failed to listen for Ctrl+C");
        tracing::info!("Received Ctrl+C");
    }
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
            Action::Resume(sid) => {
                println!("Resume session: {:?}", sid);
                // Session resume delegated to session store
                println!("Session resume feature — use /load command in REPL");
                Ok(())
            }
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
    use rd_tools::TgMessage;
    use rd_core::Orchestrator;
    use rd_tools::ToolRegistry;
    use rd_tools::builtins::register_builtins;
    use rd_hooks::HookRunner;
    use tracing::{error, warn, info};
    use chrono::Timelike;
    use std::collections::HashSet;
    use std::sync::Arc;
    use tokio::sync::Mutex;

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

        // News intelligence
        let news_scanner = Arc::new(Mutex::new(rd_types::news::NewsScanner::new()));
        let mut last_news_poll = std::time::Instant::now() - std::time::Duration::from_secs(1800);
        let news_poll_interval = std::time::Duration::from_secs(1800); // 30 minutes

        // Track URLs already offered inline keyboards for
        let mut offered_scans: HashSet<(i64, String)> = HashSet::new();

        info!("Bot loop started — welcome + scheduled posts + news intelligence active");

        loop {
            let now = chrono::Utc::now();
            let minute = now.minute();

            // Scheduled posts at :00 and :33
            if (minute == 0 || minute == 33) && last_post_minute != minute {
                last_post_minute = minute;
                let (post_text, image_style) = SCHEDULED_POSTS[post_index % SCHEDULED_POSTS.len()];
                post_index += 1;

                let user_ids = users.ids();
                if !user_ids.is_empty() {
                    // Try to send with image first, fallback to text only
                    let image_url = format!("https://redacted-protocol.vercel.app/api/image?style={}", image_style);
                    let mut sent_with_image = 0;
                    for &uid in &user_ids {
                        if bot.send_photo(uid, &image_url, post_text).await.is_ok() {
                            sent_with_image += 1;
                        } else {
                            bot.send_safe(uid, post_text).await.ok();
                        }
                    }
                    info!("Scheduled post broadcast to {} users ({} with images)", user_ids.len(), sent_with_image);
                } else {
                    info!("Scheduled post skipped — no users yet");
                }
            }

            // Background news intelligence polling (every 30 min)
            if last_news_poll.elapsed() >= news_poll_interval {
                last_news_poll = std::time::Instant::now();
                info!("Polling news sources for intelligence...");

                let sample_urls_list = [
                    "https://www.reuters.com/world/",
                    "https://apnews.com/",
                    "https://www.aljazeera.com/",
                ];

                let user_ids = users.ids();

                // Lock scanner, check URLs, fetch and analyze outside lock
                let mut unseen_urls = Vec::new();
                {
                    let scanner = news_scanner.lock().await;
                    for url in sample_urls_list {
                        if !scanner.is_seen(url) {
                            unseen_urls.push(url.to_string());
                        }
                    }
                }

                for url in unseen_urls {
                    {
                        let mut scanner = news_scanner.lock().await;
                        scanner.mark_seen(&url);
                    }

                    let scanner = news_scanner.lock().await;
                    if let Ok((title, content)) = scanner.fetch_article(&url).await {
                        let flags = scanner.analyze(&title, &content).await;
                        let threat = rd_types::news::NewsScanner::calculate_threat(&flags);

                        if threat == rd_types::news::ThreatLevel::Flagged
                            || threat == rd_types::news::ThreatLevel::Critical
                        {
                            let alert = format!(
                                "🚨 INTELLIGENCE ALERT\n\n\
                                Source: {}\n\
                                Threat: {:?}\n\
                                Flags: {}\n\n\
                                {}",
                                url,
                                threat,
                                flags.len(),
                                if flags.is_empty() {
                                    "No indicators.".to_string()
                                } else {
                                    flags.iter()
                                        .map(|f| format!("• {} ({:.0}%)", f.description, f.confidence * 100.0))
                                        .collect::<Vec<_>>()
                                        .join("\n")
                                }
                            );

                            for &uid in &user_ids {
                                bot.send_safe(uid, &alert).await.ok();
                            }
                            info!("Intelligence alert sent to {} users", user_ids.len());
                        }
                    }
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

                        // Handle callback queries from inline keyboards
                        if msg.is_callback {
                            handle_callback(&mut bot, &msg, &airdrop, &users, &news_scanner).await;
                            continue;
                        }

                        // Handle /start
                        if msg.text == "/start" {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_welcome(msg.chat_id).await.ok();
                            continue;
                        }

                        // Handle /status
                        if msg.text == "/status" || msg.text.starts_with("/status@") {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_system_status(msg.chat_id, users.count()).await.ok();
                            continue;
                        }

                        // Handle /help
                        if msg.text == "/help" || msg.text.starts_with("/help@") {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_safe(msg.chat_id,
                                "🔴 *COMMANDS*\n\n\
                                /start — Initialize connection\n\
                                /status — System status\n\
                                /airdrop — Check your $RDX eligibility\n\
                                /scan\\_news <url> — Scan article for conspiracy indicators\n\
                                /help — This message\n\n\
                                💡 *Tip:* Just paste any news URL and I'll auto-scan it!\n\n\
                                Register wallet for airdrop:\n\
                                [redacted-protocol.vercel.app](https://redacted-protocol.vercel.app)\n\n\
                                Send any message for Redacted response."
                            ).await.ok();
                            continue;
                        }

                        // Handle /scan_news <url>
                        if msg.text.starts_with("/scan_news") || msg.text.starts_with("/scan_news@") {
                            let url = msg.text.split_whitespace().nth(1);
                            if url.is_none() {
                                bot.show_typing(msg.chat_id).await.ok();
                                bot.send_safe(msg.chat_id,
                                    "Usage: /scan\\_news <url>\n\nExample: /scan\\_news https://example.com/article"
                                ).await.ok();
                                continue;
                            }
                            handle_scan_url(&mut bot, msg.chat_id, url.unwrap(), &news_scanner).await;
                            continue;
                        }

                        // Handle /airdrop
                        if msg.text == "/airdrop" || msg.text.starts_with("/airdrop@") {
                            handle_airdrop_query(&mut bot, msg.chat_id, msg.user_id, &airdrop).await;
                            continue;
                        }

                        // Auto-detect URLs and offer scan
                        if msg.has_urls() && !offered_scans.contains(&(msg.chat_id, msg.text.clone())) {
                            for url in &msg.urls {
                                offered_scans.insert((msg.chat_id, format!("{}{}", url, msg.text)));
                            }
                            bot.show_typing(msg.chat_id).await.ok();

                            let mut reply = format!("🔍 Detected {} URL(s):\n", msg.urls.len());
                            for url in &msg.urls {
                                reply.push_str(&format!("• {}\n", url));
                            }
                            reply.push_str("\nTap a button below to scan, or send /scan\\_news for manual analysis.");

                            let keyboard = TelegramBot::scan_keyboard(&msg.urls);
                            bot.send_formatted(msg.chat_id, &reply, Some(&keyboard)).await.ok();
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
                                // Truncate for Telegram
                                if reply.len() > 4000 {
                                    reply = format!("{}...", &reply[..3997]);
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

    /// Handle inline keyboard callback queries.
    async fn handle_callback(
        bot: &mut TelegramBot,
        msg: &TgMessage,
        airdrop: &AirdropRegistry,
        users: &UserRegistry,
        news_scanner: &Arc<Mutex<rd_types::news::NewsScanner>>,
    ) {
        let data = msg.callback_data.as_deref().unwrap_or("");

        if data.starts_with("scan:") {
            let url = &data[5..];
            handle_scan_url(bot, msg.chat_id, url, news_scanner).await;
        } else if data == "cmd:airdrop" {
            handle_airdrop_query(bot, msg.chat_id, msg.user_id, airdrop).await;
        } else if data == "cmd:status" {
            bot.send_system_status(msg.chat_id, users.count()).await.ok();
        } else if data == "cmd:help" {
            bot.send_safe(msg.chat_id,
                "Commands: /start, /status, /airdrop, /scan\\_news <url>, /help\n\n\
                Paste any news URL to auto-scan!"
            ).await.ok();
        } else if data == "cmd:scan_prompt" {
            bot.send_safe(msg.chat_id,
                "Paste a news article URL and I'll scan it for conspiracy indicators."
            ).await.ok();
        }
    }

    /// Handle news URL scanning.
    async fn handle_scan_url(
        bot: &mut TelegramBot,
        chat_id: i64,
        url: &str,
        news_scanner: &Arc<Mutex<rd_types::news::NewsScanner>>,
    ) {
        bot.show_typing(chat_id).await.ok();

        let scanner = news_scanner.lock().await;

        if scanner.is_seen(url) {
            bot.send_safe(chat_id, &format!("Already scanned this URL: {}\nNo new flags detected.", url)).await.ok();
            return;
        }

        // Clone scanner Arc for the async operation
        let scanner_clone = Arc::clone(news_scanner);
        drop(scanner);

        // Fetch and analyze
        let s = scanner_clone.lock().await;
        match s.scan_url(url).await {
            Ok(result) => {
                let r = result.clone();
                drop(s);
                bot.send_analysis_result(chat_id, url, &r).await.ok();
            }
            Err(e) => {
                drop(s);
                bot.send_safe(chat_id, &format!("Scan failed: {}", e)).await.ok();
            }
        }
    }

    /// Handle airdrop status query.
    async fn handle_airdrop_query(
        bot: &mut TelegramBot,
        chat_id: i64,
        user_id: i64,
        airdrop: &AirdropRegistry,
    ) {
        bot.show_typing(chat_id).await.ok();
        let amount = airdrop.get_amount(user_id);
        let rdx_amount = amount as f64 / 1_000_000_000.0;
        let eligible = airdrop.is_eligible(user_id);
        bot.send_airdrop_status(chat_id, eligible, rdx_amount, None).await.ok();
    }
}
