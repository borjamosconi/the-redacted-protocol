//! Telegram Bot API client for publishing declassified fragments.

use reqwest::Client;
use tracing::{info, warn};

const TELEGRAM_API: &str = "https://api.telegram.org/bot";

/// Telegram Bot API client.
pub struct TelegramBot {
    client: Client,
    token: String,
    chat_id: String,
}

impl TelegramBot {
    /// Create a new Telegram bot client.
    pub fn new(token: impl Into<String>, chat_id: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            token: token.into(),
            chat_id: chat_id.into(),
        }
    }

    /// Create from environment variables.
    pub fn from_env() -> Option<Self> {
        let token = std::env::var("TELEGRAM_BOT_TOKEN").ok()?;
        let chat_id = std::env::var("TELEGRAM_CHAT_ID")
            .unwrap_or_else(|_| "@RedactedProtocolChannel".into());
        Some(Self::new(token, chat_id))
    }

    /// Get bot info (test connection).
    pub async fn get_me(&self) -> Result<serde_json::Value, String> {
        let url = format!("{}{}/getMe", TELEGRAM_API, self.token);
        let resp = self.client.get(&url).send().await
            .map_err(|e| format!("HTTP error: {}", e))?;
        let json: serde_json::Value = resp.json().await
            .map_err(|e| format!("Parse error: {}", e))?;
        if json.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) {
            Ok(json)
        } else {
            Err(format!("Telegram API error: {}", json))
        }
    }

    /// Send a text message.
    pub async fn send_message(&self, text: &str) -> Result<(), String> {
        let url = format!("{}{}/sendMessage", TELEGRAM_API, self.token);

        let body = serde_json::json!({
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": true,
        });

        let resp = self.client.post(&url).json(&body).send().await
            .map_err(|e| format!("HTTP error: {}", e))?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Telegram error ({}): {}", status, text));
        }

        info!("Telegram message sent (chat: {})", self.chat_id);
        Ok(())
    }

    /// Send a message with the Redacted Protocol aesthetic.
    pub async fn send_fragment(
        &self,
        file_number: u32,
        reconstructed: &str,
        confidence: f64,
        status: &str,
    ) -> Result<(), String> {
        let message = format!(
            "🔴 **FILE #{:04}**\n\n\
            **STATUS:** {}\n\
            **CONFIDENCE:** {:.1}%\n\n\
            {}\n\n\
            ACCESS GRANTED.\n\
            _The file is breathing._\n\n\
            #RedactedProtocol #RDX",
            file_number,
            status,
            confidence * 100.0,
            reconstructed,
        );

        self.send_message(&message).await
    }

    /// Send a system notification.
    pub async fn send_notification(&self, title: &str, detail: &str) -> Result<(), String> {
        let msg = format!(
            "🔔 **{}**\n\n{}",
            title, detail
        );
        self.send_message(&msg).await
    }

    /// Get chat ID from a username or channel.
    pub async fn resolve_chat(&self, username: &str) -> Result<String, String> {
        // For channels and groups, we need to add the message first
        // and then get updates to find the chat_id.
        // For now, return the username as-is.
        Ok(username.to_string())
    }
}

/// Publisher that sends declassified fragments to Telegram.
pub struct FragmentPublisher {
    bot: TelegramBot,
    enabled: bool,
}

impl FragmentPublisher {
    pub fn new(bot: TelegramBot, enabled: bool) -> Self {
        Self { bot, enabled }
    }

    pub fn from_env() -> Option<Self> {
        let bot = TelegramBot::from_env()?;
        let enabled = std::env::var("PUBLISH_TO_TELEGRAM")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);
        Some(Self::new(bot, enabled))
    }

    /// Publish a declassified fragment.
    pub async fn publish(
        &self,
        file_number: u32,
        reconstructed: &str,
        confidence: f64,
    ) -> Result<(), String> {
        if !self.enabled {
            info!("Telegram publishing disabled");
            return Ok(());
        }

        let status = if confidence >= 0.95 {
            "VERIFIED"
        } else if confidence >= 0.85 {
            "DECLASSIFIED"
        } else {
            "PROVISIONAL"
        };

        self.bot.send_fragment(file_number, reconstructed, confidence, status).await
    }
}
