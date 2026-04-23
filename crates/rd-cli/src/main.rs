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
    /// Execute with verification/repair loop (Ralph mode)
    Ralph {
        /// Task to execute
        text: String,
        /// Maximum verification cycles (default: 5)
        #[arg(short = 'c', long, default_value = "5")]
        max_cycles: u32,
    },
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
            Command::Ralph { text, max_cycles } => Action::Ralph(text.clone(), *max_cycles),
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
        let mut term = signal::unix::signal(signal::unix::SignalKind::terminate())
            .unwrap_or_else(|e| { tracing::warn!("Failed to register SIGTERM handler: {}", e); return; });
        let mut int = signal::unix::signal(signal::unix::SignalKind::interrupt())
            .unwrap_or_else(|e| { tracing::warn!("Failed to register SIGINT handler: {}", e); return; });

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
    Ralph(String, u32),
    Resume(Option<&'a str>),
    Cmd(&'a str),
    Telegram,
}

impl<'a> Action<'a> {
    async fn run(self, cwd: &std::path::Path) -> anyhow::Result<()> {
        match self {
            Action::Repl => repl::run(cwd).await,
            Action::OneShot(text) => oneshot::run(&text, cwd).await,
            Action::Ralph(text, max_cycles) => ralph::run(&text, max_cycles, cwd).await,
            Action::Resume(sid) => {
                use rd_session::SessionStore;
                
                let store = SessionStore::default_store()
                    .map_err(|e| anyhow::anyhow!("Failed to create session store: {}", e))?;
                
                // Ensure store directory exists
                store.ensure_dir().await
                    .map_err(|e| anyhow::anyhow!("Failed to access session store: {}", e))?;
                
                if let Some(session_id) = sid {
                    // Load specific session
                    let session = store.load(session_id).await
                        .map_err(|e| anyhow::anyhow!("Failed to load session '{}': {}", session_id, e))?;
                    
                    println!("╔══════════════════════════════════════════════════╗");
                    println!("║   SESSION RESUMED: {}         ║", session_id);
                    println!("╚══════════════════════════════════════════════════╝");
                    println!("Model: {}", session.model);
                    println!("Messages: {}", session.messages.len());
                    println!("Created: {}", session.created_at);
                    println!("\nContinuing conversation...");
                    
                    // Launch REPL with resumed session
                    repl::run_with_session(cwd, session, store).await
                } else {
                    // List available sessions and resume latest
                    let sessions = store.list_sessions().await
                        .map_err(|e| anyhow::anyhow!("Failed to list sessions: {}", e))?;
                    
                    if sessions.is_empty() {
                        println!("No saved sessions found. Start a new conversation first.");
                        return Ok(());
                    }
                    
                    // Find latest session
                    if let Some(latest) = store.load_latest().await
                        .map_err(|e| anyhow::anyhow!("Failed to load latest session: {}", e))? 
                    {
                        let session_id = &latest.id;
                        println!("╔══════════════════════════════════════════════════╗");
                        println!("║   RESUMING LATEST SESSION: {:>16}║", &session_id[..session_id.len().min(16)]);
                        println!("╚══════════════════════════════════════════════════╝");
                        println!("Model: {}", latest.model);
                        println!("Messages: {}", latest.messages.len());
                        println!("Last activity: {}", latest.updated_at);
                        println!("\nContinuing from latest session...");
                        
                        repl::run_with_session(cwd, latest, store).await
                    } else {
                        println!("No sessions to resume.");
                        Ok(())
                    }
                }
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

mod ralph {
    use rd_config::ConfigLoader;
    use rd_providers;
    use rd_types::provider::ProviderKind;
    use rd_tools::{ToolRegistry, builtins::register_builtins};
    use rd_hooks::HookRunner;

    pub async fn run(task: &str, max_cycles: u32, cwd: &std::path::Path) -> anyhow::Result<()> {
        let settings = load_settings(cwd).await;
        let mut tools = ToolRegistry::new();
        register_builtins(&mut tools);
        let hooks = HookRunner::from_settings(&settings);
        let provider = setup_provider().await?;
        let mut orch = rd_core::Orchestrator::new(provider, tools, hooks, settings);
        orch.build_system_prompt(cwd, Vec::new()).await;

        println!("╔══════════════════════════════════════════════════╗");
        println!("║   RALPH MODE — Verification/Repair Loop          ║");
        println!("║   Max cycles: {}                                     ║", max_cycles);
        println!("╚══════════════════════════════════════════════════╝");
        println!("\nTask: {}\n", task);

        match orch.run_ralph(task, max_cycles).await {
            Ok(result) => {
                println!("\n╔══════════════════════════════════════════════════╗");
                if result.verified {
                    println!("║   RALPH: VERIFIED ✓ ({} cycle(s))                    ║", result.attempts);
                } else {
                    println!("║   RALPH: COULD NOT VERIFY ✗ ({} cycle(s))            ║", result.attempts);
                }
                println!("╚══════════════════════════════════════════════════╝");
                println!("\n--- Result ---");
                println!("{}", result.final_output);
                println!("\n--- Usage: {} input, {} output, {} total tokens ---",
                    result.total_usage.input_tokens,
                    result.total_usage.output_tokens,
                    result.total_usage.total());

                if !result.verified {
                    anyhow::bail!("Work could not be verified after {} cycles", result.attempts);
                }
                Ok(())
            }
            Err(e) => {
                eprintln!("Ralph error: {}", e);
                Err(anyhow::anyhow!("{}", e))
            }
        }
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
    use rd_tools::solana::SolanaClient;
    use rd_tools::TgMessage;
    use rd_core::Orchestrator;
    use rd_tools::ToolRegistry;
    use rd_tools::builtins::register_builtins;
    use rd_hooks::HookRunner;
    use rd_muapi::MuapiClient;
    use rd_arweave::ArweaveClient;
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

        // Initialize Muapi client for AI image/video generation
        let muapi_client = MuapiClient::from_env();
        if let Some(_) = &muapi_client {
            info!("Muapi.ai client initialized — image/video generation enabled");
        } else {
            warn!("MUAPI_API_KEY not set — AI image generation disabled");
        }

        // Initialize Arweave client for permanent document storage
        let arweave_client: Option<ArweaveClient> = {
            match rd_arweave::ArweaveClient::from_env().await {
                Ok(client) => {
                    info!("Arweave client initialized — permanent storage enabled");
                    Some(client)
                }
                Err(e) => {
                    warn!("Arweave wallet not configured: {} — articles will NOT be permanently stored", e);
                    None
                }
            }
        };

        // Initialize Solana client for on-chain NFT anchoring
        let solana_client: Option<SolanaClient> = {
            match SolanaClient::from_env().await {
                Ok(client) => {
                    info!("Solana RPC: {} — on-chain anchoring enabled", client.rpc_url);
                    Some(client)
                }
                Err(e) => {
                    warn!("Solana wallet not configured: {} — fragments will NOT be anchored on-chain", e);
                    None
                }
            }
        };

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

        // News intelligence (now direct mutable reference, no Arc<Mutex>)
        let mut news_scanner = rd_types::news::NewsScanner::new();
        let mut last_news_poll = std::time::Instant::now() - std::time::Duration::from_secs(1800);
        let news_poll_interval = std::time::Duration::from_secs(1800); // 30 minutes

        // Track URLs already offered inline keyboards for (max 500 entries)
        const MAX_OFFERED_SCANS: usize = 500;
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
                    // Use Pollinations.ai as fallback (free, no API key needed)
                    let pollinations_prompt = match image_style {
                        "censored_figure" => "dark dystopian figure with holographic rainbow censor bars covering the face, red and orange iridescent interference pattern dripping down, floating redacted documents in background, dark grid background, cinematic lighting, cyberpunk, highly detailed, 8k, photorealistic",
                        "access_denied" => "red ACCESS DENIED rubber stamp on dark background, glitch effect, VHS distortion, holographic interference, floating classified documents, dark grid pattern, cyberpunk dystopian, dramatic lighting, 8k quality",
                        "floating_documents" => "floating redacted documents with black bars and censorship symbols, dark grid background, holographic light effects, classified papers scattered in void, cinematic composition, dark aesthetic, ultra detailed, 8k",
                        "circuit_board" => "circuit board pattern with redacted elements, glowing red traces, holographic interference, dark background with grid overlay, cyberpunk tech aesthetic, highly detailed, macro photography style",
                        "classified_doc" => "classified document with black redaction bars, TOP SECRET stamp, holographic light effects, dark moody lighting, floating in void, grid background, photorealistic, 8k quality, mysterious atmosphere",
                        "glitch_interference" => "digital glitch interference pattern, holographic rainbow distortion, red and orange tones, VHS tracking error effect, dark background, classified document fragments visible through static, cyberpunk, cinematic",
                        _ => "dark cyberpunk illustration, dystopian aesthetic, holographic rainbow censor bars, floating redacted documents, dark grid background, cinematic lighting",
                    };
                    let image_url = TelegramBot::pollinations_image_url(pollinations_prompt, 512, 512, (42 + post_index * 7) as u32);
                    
                    let mut sent_with_image = 0;
                    for &uid in &user_ids {
                        if bot.send_photo(uid, &image_url, post_text).await.is_ok() {
                            sent_with_image += 1;
                        } else if bot.send_photo_simple(uid, &image_url).await.is_ok() {
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

            // ─────────────────────────────────────────────────────────────
            // AUTONOMOUS NEWS RECONSTRUCTION ENGINE
            // Scans sources, detects censorship, reconstructs with LLM,
            // and broadcasts results — fully autonomous, no human input.
            // ─────────────────────────────────────────────────────────────
            if last_news_poll.elapsed() >= news_poll_interval {
                last_news_poll = std::time::Instant::now();
                info!("═══ AUTONOMOUS NEWS SCAN INITIATED ═══");

                let user_ids = users.ids();
                let news_engine = rd_core::AutonomousNewsEngine::new();

                let processed = news_engine.run_autonomous_cycle(
                    &mut orch,
                    &bot,
                    &user_ids,
                    &mut news_scanner,
                    muapi_client.as_ref(),
                    arweave_client.as_ref(),
                    solana_client.as_ref(),
                ).await;

                if processed > 0 {
                    info!("═══ AUTONOMOUS SCAN COMPLETE: {} articles processed ═══", processed);
                } else {
                    info!("Autonomous scan: no new censorship detected");
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
                            handle_callback(&mut bot, &msg, &airdrop, &users, &mut news_scanner).await;
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
                                /gen\\_image <desc> — Generate AI image (Muapi.ai)\n\
                                /gen\\_video <desc> — Generate AI video (Muapi.ai)\n\
                                /gen\\_cinema <desc> — Cinema shot w/ camera controls\n\
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
                            handle_scan_url(&mut bot, msg.chat_id, url.unwrap(), &mut news_scanner).await;
                            continue;
                        }

                        // Handle /airdrop
                        if msg.text == "/airdrop" || msg.text.starts_with("/airdrop@") {
                            handle_airdrop_query(&mut bot, msg.chat_id, msg.user_id, &airdrop).await;
                            continue;
                        }

                        // Handle /gen_image <prompt> — Generate AI image via Muapi
                        if msg.text.starts_with("/gen_image") || msg.text.starts_with("/gen_image@") {
                            let prompt = msg.text.strip_prefix("/gen_image").unwrap_or("").trim();
                            if prompt.is_empty() {
                                bot.show_typing(msg.chat_id).await.ok();
                                bot.send_safe(msg.chat_id,
                                    "Usage: /gen\\_image <description>\n\n\
                                    Example: /gen\\_image classified intelligence report with redaction bars"
                                ).await.ok();
                                continue;
                            }
                            handle_gen_image(&mut bot, msg.chat_id, prompt, &muapi_client).await;
                            continue;
                        }

                        // Handle /gen_video <prompt> — Generate AI video via Muapi
                        if msg.text.starts_with("/gen_video") || msg.text.starts_with("/gen_video@") {
                            let prompt = msg.text.strip_prefix("/gen_video").unwrap_or("").trim();
                            if prompt.is_empty() {
                                bot.show_typing(msg.chat_id).await.ok();
                                bot.send_safe(msg.chat_id,
                                    "Usage: /gen\\_video <description>\n\n\
                                    Example: /gen\\_video dark cyberpunk news animation with glitch effects\n\n\
                                    ⚠️ Video generation takes 1-3 minutes. Please be patient."
                                ).await.ok();
                                continue;
                            }
                            handle_gen_video(&mut bot, msg.chat_id, prompt, &muapi_client).await;
                            continue;
                        }

                        // Handle /gen_cinema <prompt> — Generate cinematic shot via Muapi
                        if msg.text.starts_with("/gen_cinema") || msg.text.starts_with("/gen_cinema@") {
                            let prompt = msg.text.strip_prefix("/gen_cinema").unwrap_or("").trim();
                            if prompt.is_empty() {
                                bot.show_typing(msg.chat_id).await.ok();
                                bot.send_safe(msg.chat_id,
                                    "Usage: /gen\\_cinema <description>\n\n\
                                    Example: /gen\\_cinema classified intelligence brief in dark facility\n\n\
                                    ⚠️ Cinema shots use professional camera controls."
                                ).await.ok();
                                continue;
                            }
                            handle_gen_cinema(&mut bot, msg.chat_id, prompt, &muapi_client).await;
                            continue;
                        }

                        // Auto-detect URLs and offer scan
                        if msg.has_urls() && !offered_scans.contains(&(msg.chat_id, msg.text.clone())) {
                            // Evict oldest entries if approaching limit
                            if offered_scans.len() > MAX_OFFERED_SCANS {
                                offered_scans.clear();
                            }
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
        news_scanner: &mut rd_types::news::NewsScanner,
    ) {
        // Answer the callback query first so Telegram stops the loading spinner
        if let Some(ref cb_id) = msg.callback_query_id {
            bot.answer_callback(cb_id, "", false).await.ok();
        }

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
        news_scanner: &mut rd_types::news::NewsScanner,
    ) {
        bot.show_typing(chat_id).await.ok();

        if news_scanner.is_seen(url) {
            bot.send_safe(chat_id, &format!("Already scanned this URL: {}\nNo new flags detected.", url)).await.ok();
            return;
        }

        // Scan the URL (this will also mark it as seen)
        match news_scanner.scan_url(url).await {
            Ok(result) => {
                bot.send_analysis_result(chat_id, url, &result).await.ok();
            }
            Err(e) => {
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

    /// Generate an AI image via Muapi (for /gen_image command).
    /// Falls back to Pollinations.ai (free, no API key) if Muapi is unavailable.
    async fn handle_gen_image(
        bot: &mut TelegramBot,
        chat_id: i64,
        prompt: &str,
        muapi: &Option<MuapiClient>,
    ) {
        // Try Muapi first if available
        if let Some(client) = muapi {
            // Send "generating" message
            bot.send_safe(chat_id, &format!("🎨 Generating image for: \"{}\"\n\n⏳ This may take 10-30 seconds...", prompt)).await.ok();

            // Build prompt with Redacted Protocol aesthetic
            let full_prompt = format!(
                "dark cyberpunk illustration: {}, dystopian aesthetic, \
                holographic rainbow censor bars, floating redacted documents, \
                dark grid background, cinematic lighting, mysterious atmosphere, \
                highly detailed, 8k, photorealistic",
                prompt
            );

            match client.generate_image(&full_prompt, rd_muapi::ImageModel::FluxDev, Some(rd_muapi::AspectRatio::Landscape)).await {
                Ok(result) => {
                    bot.send_photo(chat_id, &result.url, &format!("🖼️ *AI Generated*\\n\\nPrompt: {}\\nModel: {}", prompt, result.model)).await.ok();
                    return; // Success, exit early
                }
                Err(e) => {
                    warn!("Muapi image generation failed, trying Pollinations: {}", e);
                    // Fall through to Pollinations fallback
                }
            }
        }

        // Pollinations.ai fallback (free, no API key needed)
        bot.send_safe(chat_id, &format!("🎨 Generating via Pollinations.ai: \"{}\"\n\n⏳ One moment...", prompt)).await.ok();

        let pollinations_prompt = format!(
            "dark cyberpunk illustration: {}, dystopian aesthetic, holographic rainbow censor bars, floating redacted documents, dark grid background, cinematic lighting, mysterious atmosphere, highly detailed, 8k",
            prompt
        );
        let image_url = TelegramBot::pollinations_image_url(&pollinations_prompt, 1024, 1024, chrono::Utc::now().timestamp() as u32);

        // Pollinations images may take a moment to generate
        tokio::time::sleep(std::time::Duration::from_secs(3)).await;

        match bot.send_photo_simple(chat_id, &image_url).await {
            Ok(()) => {
                info!("Pollinations image sent successfully for: {}", prompt);
            }
            Err(e) => {
                error!("Both Muapi and Pollinations failed: {}", e);
                bot.send_safe(chat_id, &format!("❌ Image generation failed. Please try again.")).await.ok();
            }
        }
    }

    /// Generate an AI video via Muapi (for /gen_video command).
    async fn handle_gen_video(
        bot: &mut TelegramBot,
        chat_id: i64,
        prompt: &str,
        muapi: &Option<MuapiClient>,
    ) {
        let client = match muapi {
            Some(c) => c,
            None => {
                bot.send_safe(chat_id, "❌ Muapi API key not configured. Video generation is unavailable.").await.ok();
                return;
            }
        };

        // Send "generating" message
        bot.send_safe(chat_id, &format!("🎬 Generating video for: \"{}\"\n\n⏳ This takes 1-3 minutes. Please wait...", prompt)).await.ok();

        // Build prompt
        let full_prompt = format!(
            "dark cyberpunk cinematic shot: {}, dystopian atmosphere, \
            dramatic lighting, volumetric fog, film grain, \
            cinematic camera movement, mysterious, highly detailed",
            prompt
        );

        match client.generate_video(&full_prompt, rd_muapi::VideoModel::Seedance2, Some(rd_muapi::AspectRatio::Landscape), Some(5)).await {
            Ok(result) => {
                // Telegram doesn't have a direct "send video URL" method for external URLs,
                // so we send the link as a message
                bot.send_safe(chat_id, &format!(
                    "🎬 *Video Generated!*\n\nPrompt: {}\nModel: {}\nDuration: {}s\n\n📹 Download: {}",
                    prompt, result.model, result.duration_secs.unwrap_or(0), result.url
                )).await.ok();
            }
            Err(e) => {
                bot.send_safe(chat_id, &format!("❌ Video generation failed: {}", e)).await.ok();
            }
        }
    }

    /// Generate a cinematic shot via Muapi (for /gen_cinema command).
    async fn handle_gen_cinema(
        bot: &mut TelegramBot,
        chat_id: i64,
        prompt: &str,
        muapi: &Option<MuapiClient>,
    ) {
        let client = match muapi {
            Some(c) => c,
            None => {
                bot.send_safe(chat_id, "❌ Muapi API key not configured. Cinema generation is unavailable.").await.ok();
                return;
            }
        };

        // Send "generating" message
        bot.send_safe(chat_id, &format!("🎬 Generating cinematic shot: \"{}\"\n\n⏳ This may take 15-30 seconds...", prompt)).await.ok();

        // Build prompt with Redacted Protocol aesthetic
        let full_prompt = format!(
            "{prompt}, dark cyberpunk cinematic shot, dystopian aesthetic, \
            holographic interference, classified document elements, \
            dark grid background, dramatic cinematic lighting, mysterious atmosphere, \
            volumetric fog, film grain, highly detailed",
        );

        // Default cinema settings: 70mm film, classic anamorphic, 35mm, f/4
        match client.generate_cinema(
            &full_prompt,
            rd_muapi::CinemaCamera::GrandFormat70mmFilm,
            rd_muapi::CinemaLens::ClassicAnamorphic,
            rd_muapi::FocalLength::Standard35,
            rd_muapi::Aperture::F4,
            rd_muapi::AspectRatio::Landscape,
            rd_muapi::Resolution::K4,
        ).await {
            Ok(result) => {
                bot.send_photo(chat_id, &result.url, &format!("🎬 *Cinema Shot*\n\nPrompt: {}\nCamera: 70mm Film + Classic Anamorphic\n35mm @ f/4 — 16:9 4K\n\nModel: {}", prompt, result.model)).await.ok();
            }
            Err(e) => {
                bot.send_safe(chat_id, &format!("❌ Cinema generation failed: {}", e)).await.ok();
            }
        }
    }
}
