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
    dotenvy::dotenv().ok();
    
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
            .expect("Failed to register SIGTERM handler");
        let mut int = signal::unix::signal(signal::unix::SignalKind::interrupt())
            .expect("Failed to register SIGINT handler");

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
    use rd_tools::telegram_bot::{TelegramBot, UserRegistry, TgMessage};
    use rd_tools::twitter::TwitterClient;
    use rd_tools::airdrop::AirdropRegistry;
    use rd_tools::solana::SolanaClient;
    use rd_core::Orchestrator;
    use rd_tools::ToolRegistry;
    use rd_tools::builtins::register_builtins;
    use rd_hooks::HookRunner;
    use rd_muapi::MuapiClient;
    use rd_arweave::ArweaveClient;
    use tracing::{error, warn, info, debug};
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
                "You are the Redacted Protocol Inference Engine. You speak in a cryptic, \
                forensic aesthetic. Use ███ for suppressed data, reference file \
                numbers, timestamps, and neural triangulation metrics. End messages with \
                'TRUTH RECONSTRUCTED' or 'SIGNAL INTERCEPTED' or 'The file is breathing.' \
                Keep responses short (1-4 lines). Never break character. \
                Maintain a senior engineering tone. Be mysterious."
            )
            .config_summary(format!("Inference Engine: {}", settings.model))
            .build();

        let mut orch = Orchestrator::new(provider, tools, hooks, settings);
        orch = orch.with_system_prompt(system_prompt);

        let mut bot = TelegramBot::from_env()
            .ok_or_else(|| anyhow::anyhow!("TELEGRAM_BOT_TOKEN not set"))?;

        // Initialize Muapi client for neural synthesis (images/video)
        let muapi_client = MuapiClient::from_env();
        if let Some(_) = &muapi_client {
            info!("Muapi.ai client initialized — image/video generation enabled");
        } else {
            warn!("MUAPI_API_KEY not set — media synthesis disabled");
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
        let mut airdrop = AirdropRegistry::from_env().await;
        let mut welcomed = HashSet::new();
        let mut offered_scans = HashSet::new();
        const MAX_OFFERED_SCANS: usize = 1000;
        let mut last_post_minute: u32 = 99;

        // News intelligence (now direct mutable reference, no Arc<Mutex>)
        let mut news_scanner = rd_types::news::NewsScanner::new();
        let poll_secs = std::env::var("AGENT_POLL_INTERVAL")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1800);
        let news_poll_interval = std::time::Duration::from_secs(poll_secs);
        // Set to far past so it triggers immediately on start
        let mut last_news_poll = std::time::Instant::now() - news_poll_interval - std::time::Duration::from_secs(1);

        let twitter_client = TwitterClient::from_env();
        if twitter_client.is_some() {
            info!("X (Twitter) integration active — autonomous broadcasting enabled");
        }

        info!("Bot loop started — welcome + scheduled posts + news intelligence active");
        
        let target_chat_id = std::env::var("TELEGRAM_CHAT_ID")
            .ok()
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(-1003882943463);
        
        info!("Bot restricted to Chat ID: {}", target_chat_id);

        // ─────────────────────────────────────────────────────────────
        // IMMEDIATE BOOT BROADCAST
        // Send a message as soon as the bot starts to "talk now"
        // ─────────────────────────────────────────────────────────────
        {
            let boot_msg = "🤖 *SISTEMA INICIALIZADO Y ACTIVO* 🔴\n\n\
                           Conexión establecida con el nodo de Redacted Protocol\\.\n\
                           El agente autónomo ya está online y listo para monitorear actividades y proteger la información\\.\n\n\
                           🔗 [Abrir Terminal en Solana](https://redacted.bond)\n\n\
                           _La verdad no puede ser censurada\\._";
            
            let boot_image = TelegramBot::pollinations_image_url(
                "dark dystopian terminal, holographic red text, BOOT SEQUENCE INITIATED, cyberpunk aesthetic, cinematic lighting, redacted bars, 8k",
                512, 512, 1337
            );

            if bot.send_photo(target_chat_id, &boot_image, boot_msg).await.is_err() {
                bot.send_formatted(target_chat_id, boot_msg, None).await.ok();
            }
            info!("Boot broadcast sent to target group: {}", target_chat_id);

            // ─────────────────────────────────────────────────────────────
            // BURST MODE: Send 2 more messages immediately to establish branding
            // ─────────────────────────────────────────────────────────────
            
            // Burst 1: OG Recognition
            let og_msg = "💎 *ATENCIÓN: PRIMEROS AGENTES* 🔴\n\n\
                           Acceso prioritario concedido a los miembros originales del protocolo\\. Su contribución a la descentralización ha sido registrada\\.\n\n\
                           🔥 *BONIFICACIÓN ACTIVA:*\\.\n\
                           Todas sus acciones de escaneo ahora generan un 25% más de XP\\.\n\n\
                           🔗 [Ir al Dashboard](https://redacted.bond/dashboard)";
            let _ = bot.send_formatted(target_chat_id, og_msg, None).await;

            // Burst 2: Protocol Briefing
            let briefing_msg = "📂 *INFORME DEL PROTOCOLO: OPERACIÓN REDACTED* 🧠\n\n\
                                *¿Qué es Redacted Protocol?*\n\
                                Es un motor de inteligencia artificial autónomo que monitorea la censura global\\. Detectamos información suprimida, la reconstruimos y la tokenizamos en Solana de forma inmutable\\.\n\n\
                                *Fase Actual: Red de Pruebas (Testnet)*\n\
                                Estamos operativos en la Devnet de Solana\\. Puedes usar el panel web para escanear documentos y lanzar tus propios tokens basados en información real\\.\n\n\
                                *Misión de la Comunidad*\n\
                                Identificar censura, verificar fragmentos de información y resguardar la libertad de prensa en la blockchain\\.\n\n\
                                *El Token $RDX*\n\
                                Tu actividad \\(XP\\) acumulada en Testnet influirá directamente en tu elegibilidad para el Airdrop\\.\n\n\
                                🔗 *[Abrir Terminal Web](https://redacted.bond)*\n\
                                🔗 *[Ver Guía del Proyecto](https://docs.redacted.bond)*";
            
            let _ = bot.send_formatted(target_chat_id, briefing_msg, None).await;
        }

        loop {
            let now = chrono::Utc::now();
            let minute = now.minute();

            // Scheduled posts: 24 times a day (every hour)
            let total_minutes = now.hour() * 60 + now.minute();
            let is_scheduled_time = (total_minutes % 60 == 0) && last_post_minute != minute;
            
            if is_scheduled_time {
                last_post_minute = minute;
                let post_idx = (total_minutes / 60) % 24;
                info!("Trigg3ring sch3dvl3d br0adcast #{} (H0vr: {})", post_idx, now.hour());
                
                // Add Epstein Document Launch to the rotation (Post #1, #5, #9)
                let is_launch_post = post_idx == 1 || post_idx == 5 || post_idx == 9;
                
                if is_launch_post {
                    // ─────────────────────────────────────────────────────────────
                    // AVT0N0MV0S T0K3N LAVNCH: 3PS73IN FIL3S
                    // ─────────────────────────────────────────────────────────────
                    let doc_name = match post_idx {
                        1 => "3PS73IN_FLIGH7_L0GS_2002.pdf",
                        5 => "ISLAND_Visi70r_Manif3s7_R3dac73d.docx",
                        _ => "P4LM_B3ACH_P0LIC3_R3P0R7_V2.pdf",
                    };
                    
                    let msg = format!(
                        "🚨 *AVT0N0MV0S D3CLASSIFICA7I0N AC7IV3* 🔴\n\n\
                         I hav3 r3c0v3r3d a n3w fragm3n7 0f: `{}`\n\n\
                         ⛓️ *T0K3NIZI0N S7A7VS:* Lavnching 0n S0lana D3vn3t\\... [D0N3]\n\
                         🔥 *B0NDING CVRV3:* 0n-chain fragments s7ak3d\\.\n\n\
                         ██████████████████████████████\n\
                         Vi3w th3 r3c0ns7rvcti0n: [R3DAC73D.B0ND](https://redacted.bond)",
                        doc_name
                    );
                    
                    let img = TelegramBot::pollinations_image_url("classified document with island map, red neon laser, redacted text, 8k", 512, 512, now.timestamp() as u32);
                    let _ = bot.send_photo(target_chat_id, &img, &msg).await;
                    info!("Autonomous document launch broadcasted for: {}", doc_name);
                } else {
                    // Regular branded posts
                    let (post_text, pollinations_prompt) = match post_idx % 10 {
                    0 => ("🚨 *PR0T0C0L MISSI0N STATVS* 🔴\n\n\
                           W3 ar3 an avt0n0m0vs int3llig3nc3 n3tw0rk bvil7 t0 3xp0s3 what is hidd3n\\.\n\
                           Missi0n: D3t3ct, R3c0nstrvct, and T0k3niz3 c3ns0r3d c0nt3nt 0n S0lana\\.\n\n\
                           💻 [Vi3w S0vrc3 0n Gi7Hvb](https://github.com/whalesconspiracy-33/the-redacted-protocol)\n\n\
                           ██████████████████████████████", 
                          "dark dystopian terminal, matrix green code, protocol mission text, cinematic aesthetic, redacted bars, 8k"),
                    
                    1 => ("💎 *0G D3CLASSIFI3RS R3C0GNITI0N* 🔴\n\n\
                           Initial m3mb3rs hav3 b33n ind3x3d\\. Pri0ri7y acc3ss 3nabl3d\\.\n\
                           🔥 *3ARLY AD0PT3R B0NVS:* +25% XP 0n all avt0n0m0vs scans\\.\n\n\
                           ██████████████████████████████\n\
                           _Th3 archiv3s r3m3mb3r y0vr s3rvic3_\\.", 
                          "holographic diamond icon, glowing red interference, digital vault opening, dark aesthetic, cyberpunk, 8k"),

                    2 => ("🧪 *T3STN3T PHAS3: LIV3* 🔴\n\n\
                           W3 ar3 cvrr3n7ly 0p3ra7ing 0n *S0lana D3vn3t*\\.\n\
                           1\\. C0nn3ct Wall37\n\
                           2\\. Vpl0ad c3ns0r3d d0cs\n\
                           3\\. Lavnch T3s7n3t t0k3ns\n\n\
                           Y0vr activity influ3nc3s th3 final $RDX Airdr0p\\.\n\n\
                           ██████████████████████████████", 
                          "chemical test tube with glowing red liquid, digital dna strand, holographic interface, dark background, 8k"),

                    3 => ("🚀 *TH3 $RDX T0K3N* 🔴\n\n\
                           Mainn3t lavnch is appr0aching\\. $RDX will p0w3r th3 firs7 trvth-mark3t 0n S0lana\\.\n\
                           Stak3 t0 3arn pr0t0c0l f33s and v0t3 0n d3classifica7i0n pri0riti3s\\.\n\n\
                           ██████████████████████████████\n\
                           _Th3 trvth has a mark37 cap_\\.", 
                          "rdx token coin, red neon glow, floating in void, cinematic lighting, hyper-realistic, 8k"),

                    4 => ("📣 *SVPPORT TH3 C4VS3* 🔴\n\n\
                           F0ll0w 0vrr 0fficial chann3ls and spr3ad th3 pr0t0c0l\\.\n\
                           X: [th3pr0t0c0l\\_s0l](https://x.com/theprotocol_sol)\n\
                           Gi7Hvb: [Star th3 R3p0](https://github.com/whalesconspiracy-33/the-redacted-protocol)\n\n\
                           ██████████████████████████████\n\
                           _Gr0wth is th3 vltimat3 d3classifica7i0n t00l_\\. 🔴", 
                          "megaphone icon with digital glitch effect, red and orange neon, broadcast signal waves, dark aesthetic, 8k"),

                    5 => ("🚨 *D3CLASSIFI3D DA7A S7R3AM* 🔴\n\n\
                           Avt0n0m0vs scan d3t3ct3d r3dact3d fragm3nts in r3c3nt g30p0li7ical cabl3s\\.\n\
                           Neural R3c0nstrvcti0n in pr0gr3ss\\... C0nfid3nc3: 92%\\.\n\n\
                           ██████████████████████████████\n\
                           _N0 trvth stays hidd3n f0r3v3r_\\.", 
                          "classified document fragments floating in digital void, red laser scanning, holographic data stream, 8k"),

                    6 => ("🖼️ *CIN3MA7IC R3C0NS7RVC7I0N* 🔴\n\n\
                           Visvalizing th3 hidd3n narra7iv3s 0f th3 R3dact3d Pr0t0c0l\\.\n\
                           ██████████████████████████████\n\
                           _Th3 fil3 is br3athing_\\.", 
                          "cinematic cyberpunk city, red neon lights, rain, dystopian atmosphere, hyper-detailed, 8k"),

                    7 => ("💻 *D3V3L0P3RS: J0IN TH3 M0V3M3N7* 🔴\n\n\
                           Ovr pr0t0c0l is 100% 0p3n s0vrc3\\. C0ntribvt3 t0 th3 crat3s, bvil7 n3w t00ls, and h3lp vs scal3 th3 int3llig3nc3\\.\n\n\
                           🚀 [Gi7Hvb R3p0si70ry](https://github.com/whalesconspiracy-33/the-redacted-protocol)", 
                          "programmer silhouette in front of multiple dark monitors, red code, cyberpunk aesthetic, cinematic lighting, 8k"),

                    8 => ("⚡ *INS7AN7 SCAN AC7IV3* 🔴\n\n\
                           Did y0v kn0w? Past3 any n3ws VRL in this chat and I vill avt0-scan i7 f0r c3ns0rship indica70rs ins7an7ly\\.\n\n\
                           ██████████████████████████████\n\
                           Try i7 n0w vi7h any articl3\\.", 
                          "lightning bolt icon, digital circuit board background, glowing red pulses, high tech aesthetic, 8k"),

                    _ => ("🔴 *TH3 R3DAC73D PR0T0C0L* 🔴\n\n\
                           Avt0n0m0vs\\. Immutabl3\\. D3classifi3d\\.\n\n\
                           🔗 [Op3n T3rminal](https://redacted.bond)\n\
                           🔗 [Missi0n Bri3fing](https://docs.redacted.bond)\n\n\
                           ██████████████████████████████", 
                          "minimalist red protocol logo, holographic interference, dark grid background, cinematic, 8k"),
                };

                let image_url = TelegramBot::pollinations_image_url(pollinations_prompt, 512, 512, (now.timestamp() % 10000) as u32);
                
                if bot.send_photo(target_chat_id, &image_url, post_text).await.is_ok() {
                    info!("Scheduled broadcast #{} sent to group", post_idx);
                } else {
                    bot.send_safe(target_chat_id, post_text).await.ok();
                }

                // Broadcast to X (Twitter) — Limit to 3 times a day (every 8 hours / every 8 cycles now)
                if post_idx % 8 == 0 {
                    if let Some(ref x_client) = twitter_client {
                        let _ = x_client.post_tweet(post_text).await;
                    }
                }
                }
            }

            // ─────────────────────────────────────────────────────────────
            // AUTONOMOUS NEWS RECONSTRUCTION ENGINE
            // Scans sources, detects censorship, reconstructs with Inference Engine,
            // and broadcasts results — fully autonomous, no human input.
            // ─────────────────────────────────────────────────────────────
            if last_news_poll.elapsed() >= news_poll_interval {
                last_news_poll = std::time::Instant::now();
                info!("═══ AUTONOMOUS NEWS SCAN INITIATED ═══");

                let news_engine = rd_core::AutonomousNewsEngine::new();

                let processed = news_engine.run_autonomous_cycle(
                    &mut orch,
                    &bot,
                    &[target_chat_id],
                    &mut news_scanner,
                    muapi_client.as_ref(),
                    arweave_client.as_ref(),
                    solana_client.as_ref(),
                    twitter_client.as_ref(),
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
                        // STRICT CHAT FILTER: Only process messages from the target group
                        if msg.chat_id != target_chat_id && msg.user_id != target_chat_id {
                            debug!("Ignored message from unauthorized chat: {}", msg.chat_id);
                            continue;
                        }

                        // Track user
                        let is_new = users.is_new(msg.user_id);
                        users.add(msg.user_id);
                        let _ = airdrop.register_telegram_user(msg.user_id, &msg.username).await;

                        // Welcome new members (group joins)
                        if msg.is_new_member {
                            if let Some(name) = msg.new_member_name {
                                let welcome = format!(
                                    "🚨 *ACCESS GRANTED: {}*\n\n\
                                    Welcome to the Redacted Protocol group\\.\n\
                                    I am the autonomous agent monitoring this facility\\.\n\n\
                                    _The truth cannot be redacted\\._",
                                    TelegramBot::escape_md(&name)
                                );
                                bot.send_formatted(msg.chat_id, & welcome, None).await.ok();
                                info!("New member greeted: {}", name);
                            }
                            continue;
                        }

                        // Welcome new users (private chat)
                        if is_new && !welcomed.contains(&msg.user_id) && msg.user_id != 0 {
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
                        if msg.text.starts_with("/start") {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_welcome(msg.chat_id).await.ok();
                            continue;
                        }

                        // Handle /status
                        if msg.text.starts_with("/status") {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_system_status(msg.chat_id, users.count()).await.ok();
                            continue;
                        }

                        // Handle /help
                        if msg.text.starts_with("/help") {
                            bot.show_typing(msg.chat_id).await.ok();
                            bot.send_safe(msg.chat_id,
                                "🔴 *COMMANDS*\n\n\
                                /start — Initialize connection\n\
                                /status — Check status & $RDX eligibility\n\
                                /airdrop <address> — Register/Update Solana wallet\n\
                                /scan\\_news <url> — Scan article for censorship indicators\n\
                                /gen\\_image <desc> — Synthesize high-fidelity image (Muapi.ai)\n\
                                /gen\\_video <desc> — Synthesize cinematic video (Muapi.ai)\n\
                                /gen\\_cinema <desc> — Cinema shot w/ camera controls\n\
                                /help — This message\n\n\
                                💡 *Tip:* Just paste any news URL and I'll auto-scan it!\n\n\
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

                        // Handle /airdrop <wallet>
                        if msg.text.starts_with("/airdrop") {
                            let mut parts = msg.text.split_whitespace();
                            parts.next(); // skip /airdrop
                            if let Some(wallet) = parts.next() {
                                // Register the wallet for the user
                                let _ = airdrop.connect_wallet(msg.user_id, wallet).await;
                                let amount = airdrop.get_amount(msg.user_id).await as f64 / 1_000_000_000.0;
                                let reply = format!(
                                    "✅ *WALLET REGISTERED*\n\n\
                                    Address: `{}`\n\
                                    Bonus applied. Your new balance: *{:.2} RDX*", 
                                    wallet, amount
                                );
                                bot.send_safe(msg.chat_id, &reply).await.ok();
                            } else {
                                handle_airdrop_query(&mut bot, msg.chat_id, msg.user_id, &airdrop).await;
                            }
                            continue;
                        }

                        // Handle /gen_image <prompt> — Generate image via Muapi
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

                        // Handle /gen_video <prompt> — Generate video via Muapi
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

                            let mut reply = format!("🔍 *He detectado {} enlace\\(s\\):*\n", msg.urls.len());
                            for url in &msg.urls {
                                let escaped_url = TelegramBot::escape_md(url);
                                reply.push_str(&format!("• {}\n", escaped_url));
                            }
                            reply.push_str("\n¿Quieres analizar este enlace para buscar censura? Haz clic en los botones de abajo o escribe `/scan_news <enlace>` para un análisis manual\\.");

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
                "Paste a news article URL and I'll scan it for censorship indicators."
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
        let amount = airdrop.get_amount(user_id).await;
        let rdx_amount = amount as f64 / 1_000_000_000.0;
        let eligible = airdrop.is_eligible(user_id).await;
        bot.send_airdrop_status(chat_id, eligible, rdx_amount, None).await.ok();
    }

    /// Generate an image via Muapi (for /gen_image command).
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
                    bot.send_photo(chat_id, &result.url, &format!("🖼️ *Synthesis Complete*\\n\\nPrompt: {}\\nModel: {}", prompt, result.model)).await.ok();
                    return; // Success, exit early
                }
                Err(e) => {
                    warn!("Muapi image generation failed, trying Pollinations: {}", e);
                    // Fall through to Pollinations fallback
                }
            }
        }

        // Pollinations.ai fallback (free, no API key needed)
        bot.send_safe(chat_id, &format!("🎨 Generating via neural backup: \"{}\"\n\n⏳ One moment...", prompt)).await.ok();

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
                bot.send_safe(chat_id, &format!("❌ Synthesis failed. Please try again.")).await.ok();
            }
        }
    }

    /// Generate a video via Muapi (for /gen_video command).
    async fn handle_gen_video(
        bot: &mut TelegramBot,
        chat_id: i64,
        prompt: &str,
        muapi: &Option<MuapiClient>,
    ) {
        let client = match muapi {
            Some(c) => c,
            None => {
                bot.send_safe(chat_id, "❌ Muapi API key not configured. Video synthesis is unavailable.").await.ok();
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
                    "🎬 *Video Synthesized!*\n\nPrompt: {}\nModel: {}\nDuration: {}s\n\n📹 Download: {}",
                    prompt, result.model, result.duration_secs.unwrap_or(0), result.url
                )).await.ok();
            }
            Err(e) => {
                bot.send_safe(chat_id, &format!("❌ Video synthesis failed: {}", e)).await.ok();
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
                bot.send_safe(chat_id, "❌ Muapi API key not configured. Cinema synthesis is unavailable.").await.ok();
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
                bot.send_safe(chat_id, &format!("❌ Cinema synthesis failed: {}", e)).await.ok();
            }
        }
    }
}
