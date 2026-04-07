use anyhow::Result;
use rd_core::Orchestrator;
use rd_providers::Provider;
use rd_session::MessageRole;

pub async fn handle_slash_command<P: Provider>(cmd: &str, orch: &mut Orchestrator<P>) -> Result<String> {
    let parts: Vec<&str> = cmd.split_whitespace().collect();
    match *parts.first().unwrap_or(&"") {
        "/help" => Ok("/help /status /model [name] /permission [level] /clear /cost /compact /telegram [msg] /config /version".into()),
        "/status" => Ok(format!("Session: {}\nModel: {}\nMessages: {}\nEst. tokens: {}", orch.session.id, orch.session.model, orch.session.messages.len(), orch.session.estimated_tokens())),
        "/model" => { if let Some(m) = parts.get(1) { orch.session.model = m.to_string(); } Ok(format!("Model: {}", orch.session.model)) }
        "/permission" | "/perm" => {
            if let Some(l) = parts.get(1) {
                if let Some(level) = rd_types::permission::PermissionLevel::parse(l) { orch.permission.set_level(level); return Ok(format!("Permission: {:?}", level)); }
            }
            Ok(format!("Permission: {:?}", orch.permission.level()))
        }
        "/clear" => {
            let model = orch.session.model.clone();
            let sys: Vec<_> = orch.session.messages.iter().filter(|m| m.role == MessageRole::System).cloned().collect();
            orch.session = rd_session::Session::new(&model);
            for m in sys { orch.session.messages.push(m); }
            Ok("Session cleared.".into())
        }
        "/cost" => Ok(format!("Tokens: {} in, {} out, {} total", orch.session.total_usage.input_tokens, orch.session.total_usage.output_tokens, orch.session.total_usage.total())),
        "/compact" => { let before = orch.session.messages.len(); orch.session.compact(20); Ok(format!("Compacted: {} -> {}", before, orch.session.messages.len())) }
        "/telegram" | "/tg" => {
            let msg = parts.get(1).map(|s| s.to_string()).unwrap_or_else(|| "🔴 Redacted Protocol Agent\n\nThe file is breathing.\n\n#RedactedProtocol".into());
            let bot = rd_tools::telegram::TelegramBot::from_env()
                .ok_or_else(|| anyhow::anyhow!("TELEGRAM_BOT_TOKEN not set. Create bot via @BotFather."))?;
            bot.send_message(&msg).await
                .map_err(|e| anyhow::anyhow!("Telegram: {}", e))?;
            Ok("Sent to Telegram ✅".into())
        }
        "/config" => {
            let mut loader = rd_config::ConfigLoader::new();
            if let Ok(cwd) = std::env::current_dir() { loader.set_cwd(&cwd); }
            let s = loader.load().await;
            Ok(format!("model: {}\npermission: {:?}\nmax_iterations: {}\ntemperature: {}\nsolana_rpc: {}", s.model, s.permission_mode, s.max_iterations, s.temperature, s.solana_rpc_url))
        }
        "/version" => Ok(format!("rd-agent {}", env!("CARGO_PKG_VERSION"))),
        other => {
            let suggestions = ["/help","/status","/model","/permission","/clear","/cost","/compact","/config","/version"].iter().filter(|&&c| levenshtein(other, c) <= 2).map(|&s| s.to_string()).collect::<Vec<_>>();
            if suggestions.is_empty() { Ok(format!("Unknown: {}. Type /help.", other)) }
            else { Ok(format!("Unknown: {}. Did you mean: {}?", other, suggestions.join(", "))) }
        }
    }
}

pub async fn run_command(cmd: &str, _cwd: &std::path::Path) -> anyhow::Result<()> {
    println!("Command: {}", cmd);
    Ok(())
}

fn levenshtein(a: &str, b: &str) -> usize {
    let ac: Vec<char> = a.chars().collect(); let bc: Vec<char> = b.chars().collect();
    let m = ac.len(); let n = bc.len();
    let mut dp = vec![vec![0usize; n + 1]; m + 1];
    for i in 0..=m { dp[i][0] = i; }
    for j in 0..=n { dp[0][j] = j; }
    for i in 1..=m { for j in 1..=n {
        let cost = if ac[i-1] == bc[j-1] { 0 } else { 1 };
        dp[i][j] = (dp[i-1][j]+1).min(dp[i][j-1]+1).min(dp[i-1][j-1]+cost);
    }}
    dp[m][n]
}
