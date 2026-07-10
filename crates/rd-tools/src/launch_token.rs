//! Autonomous Document Token Launcher
//!
//! Calls the redacted.bond `/api/agent/launch` endpoint to tokenize
//! a discovered/reconstructed document as a Solana SPL token.
//!
//! The agent uses this after detecting censored content to:
//!   1. Convert the document into a token on-chain
//!   2. Register it to the live feed at redacted.bond
//!   3. Get a Telegram broadcast sent automatically

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

use crate::registry::{ToolError, ToolHandler};

/// Result of an autonomous token launch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenLaunchResult {
    pub mint: String,
    pub symbol: String,
    pub name: String,
    pub terminal_url: String,
    pub telegram_sent: bool,
    pub on_chain: bool,
    pub tx_signature: Option<String>,
    pub duplicate: bool,
}

/// Launch a document token by calling the dashboard agent API
pub async fn launch_document_token(
    name: &str,
    symbol: &str,
    description: &str,
    category: &str,
    image_url: Option<&str>,
    source_url: Option<&str>,
    confidence: u8,
) -> Result<TokenLaunchResult, String> {
    let dashboard_url = std::env::var("DASHBOARD_URL")
        .unwrap_or_else(|_| "https://redacted.bond".to_string());

    let agent_secret = std::env::var("AGENT_SECRET")
        .map_err(|_| "AGENT_SECRET not set — cannot authenticate with dashboard API".to_string())?;

    let endpoint = format!("{}/api/agent/launch", dashboard_url);

    let payload = serde_json::json!({
        "name":        name,
        "symbol":      symbol,
        "description": if description.is_empty() { "Declassified document fragment anchored via Redacted Protocol." } else { description },
        "category":    category,
        "image_url":   if image_url.unwrap_or("").is_empty() { "https://redacted.bond/logo.png" } else { image_url.unwrap() },
        "source_url":  source_url.unwrap_or(""),
        "confidence":  confidence,
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let response = client
        .post(&endpoint)
        .header("Authorization", format!("Bearer {}", agent_secret))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Response parse error: {}", e))?;

    if !status.is_success() {
        let err = body
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown error");
        return Err(format!("Launch failed ({}): {}", status, err));
    }

    let duplicate = body.get("duplicate").and_then(|v| v.as_bool()).unwrap_or(false);

    let mint = body
        .get("mint")
        .and_then(|v| v.as_str())
        .ok_or("Response missing 'mint'")?
        .to_string();

    let sym = body
        .get("symbol")
        .and_then(|v| v.as_str())
        .unwrap_or(symbol)
        .to_string();

    let terminal_url = body
        .get("terminal_url")
        .and_then(|v| v.as_str())
        .unwrap_or(&format!("https://redacted.bond/terminal/{}", mint))
        .to_string();

    if duplicate {
        info!("[LaunchToken] Duplicate token ${} — already exists: {}", sym, mint);
    } else {
        info!(
            "[LaunchToken] ✅ Launched ${} — mint={} tx={:?} url={}",
            sym,
            mint,
            body.get("tx_signature").and_then(|v| v.as_str()),
            terminal_url
        );
    }

    let mut telegram_sent = body.get("telegram_sent").and_then(|v| v.as_bool()).unwrap_or(false);

    // ── Fallback Telegram broadcast ──
    // If the dashboard API failed to send (likely due to missing env vars on the server),
    // the agent attempts to send it directly using its own local env.
    if !telegram_sent && !duplicate {
        let bot_token = std::env::var("TELEGRAM_BOT_TOKEN").ok();
        let chat_id   = std::env::var("TELEGRAM_CHAT_ID").ok();

        if let (Some(token), Some(chat)) = (bot_token, chat_id) {
            info!("[LaunchToken] Dashboard Telegram failed, attempting direct broadcast...");
            
            // Escape special chars for MarkdownV2 (simple version)
            let safe_name = name.replace(|c: char| "_*[]()~`>#+-=|{}.!".contains(c), "\\$0");
            let emoji = "🟢"; // Default for declassified
            let msg = format!(
                "{} *NUEVA TOKENIZACIÓN DETECTADA*\n\n\
                📄 *ARCHIVO:* {}\n\
                🏷️ *TICKER:* \\${} \\| CLASSIFIED\n\
                🔬 *CONFIANZA IA:* {}%\n\n\
                ⛓️ `MINT: {}`\n\n\
                🔓 [🔬 VER ARCHIVO RECONSTRUIDO]({})",
                emoji, safe_name, sym, confidence, mint, terminal_url
            );

            let tg_url = format!("https://api.telegram.org/bot{}/sendMessage", token);
            let tg_res = client.post(&tg_url)
                .json(&serde_json::json!({
                    "chat_id": chat,
                    "text": msg,
                    "parse_mode": "MarkdownV2"
                }))
                .send()
                .await;

            match tg_res {
                Ok(resp) if resp.status().is_success() => {
                    info!("[LaunchToken] Direct Telegram broadcast successful.");
                    telegram_sent = true;
                }
                Ok(resp) => {
                    warn!("[LaunchToken] Direct Telegram failed: {}", resp.status());
                }
                Err(e) => {
                    warn!("[LaunchToken] Direct Telegram exception: {}", e);
                }
            }
        }
    }

    Ok(TokenLaunchResult {
        mint,
        symbol: sym,
        name: name.to_string(),
        terminal_url,
        telegram_sent,
        on_chain: body.get("on_chain").and_then(|v| v.as_bool()).unwrap_or(false),
        tx_signature: body.get("tx_signature").and_then(|v| v.as_str()).map(String::from),
        duplicate,
    })
}

/// Tool handler for the LLM tool registry
pub struct LaunchTokenTool;

#[async_trait]
impl ToolHandler for LaunchTokenTool {
    async fn execute(&self, input: serde_json::Value) -> Result<String, ToolError> {
        let name = input
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ToolError::InvalidInput("missing 'name'".into()))?;

        let symbol = input
            .get("symbol")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ToolError::InvalidInput("missing 'symbol'".into()))?;

        let description = input
            .get("description")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let category = input
            .get("category")
            .and_then(|v| v.as_str())
            .unwrap_or("CLASSIFIED");

        let image_url = input.get("image_url").and_then(|v| v.as_str());
        let source_url = input.get("source_url").and_then(|v| v.as_str());
        let confidence = input
            .get("confidence")
            .and_then(|v| v.as_u64())
            .map(|c| c.min(100) as u8)
            .unwrap_or(75);

        match launch_document_token(
            name,
            symbol,
            description,
            category,
            image_url,
            source_url,
            confidence,
        )
        .await
        {
            Ok(result) => {
                if result.duplicate {
                    Ok(format!(
                        "Token ${} already exists. Mint: {} | {}",
                        result.symbol, result.mint, result.terminal_url
                    ))
                } else {
                    Ok(format!(
                        "✅ Launched ${} — {}\nMint: {}\nOn-chain: {} | TX: {}\nTelegram: {}\nTrade: {}",
                        result.symbol,
                        result.name,
                        result.mint,
                        result.on_chain,
                        result.tx_signature.as_deref().unwrap_or("pending"),
                        if result.telegram_sent { "✅ sent" } else { "⚠️ failed" },
                        result.terminal_url,
                    ))
                }
            }
            Err(e) => Err(ToolError::ExecutionFailed(format!("Token launch failed: {}", e))),
        }
    }
}

/// Schema for the LLM tool definition
pub fn launch_token_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Full document name, e.g. 'Epstein Flight Logs Vol.2'"
            },
            "symbol": {
                "type": "string",
                "description": "Token ticker, 2-8 uppercase letters, e.g. 'EPST2'"
            },
            "description": {
                "type": "string",
                "description": "Short description of the document"
            },
            "category": {
                "type": "string",
                "enum": ["CLASSIFIED", "LEAKED", "REDACTED", "DECLASSIFIED", "SUPPRESSED", "CENSORED"],
                "description": "Document classification category"
            },
            "image_url": {
                "type": "string",
                "description": "Optional: URL of a pre-generated image for the token"
            },
            "source_url": {
                "type": "string",
                "description": "Optional: URL of the original source article"
            },
            "confidence": {
                "type": "integer",
                "minimum": 0,
                "maximum": 100,
                "description": "Reconstruction confidence score (0-100)"
            }
        },
        "required": ["name", "symbol"]
    })
}
