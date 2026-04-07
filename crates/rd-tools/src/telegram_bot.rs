//! Telegram conversational bot — speaks in Redacted Protocol aesthetic.
//!
//! Receives messages from users, sends them to the LLM with a
//! Redacted Protocol system prompt, and replies in the signature
//! cryptic style.

use reqwest::Client;
use serde_json::json;
use tracing::{info, warn, error};
use std::time::Duration;

const TELEGRAM_API: &str = "https://api.telegram.org/bot";

/// Telegram conversational bot.
pub struct TelegramBot {
    client: Client,
    token: String,
    last_update_id: i64,
}

/// A message received from Telegram.
#[derive(Debug, Clone)]
pub struct TgMessage {
    pub chat_id: i64,
    pub user_id: i64,
    pub username: String,
    pub text: String,
    pub message_id: i64,
}

impl TelegramBot {
    /// Create a new bot.
    pub fn new(token: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            token: token.into(),
            last_update_id: 0,
        }
    }

    /// Create from environment.
    pub fn from_env() -> Option<Self> {
        std::env::var("TELEGRAM_BOT_TOKEN").ok().map(|t| Self::new(t))
    }

    /// Get bot info.
    pub async fn get_me(&self) -> Result<serde_json::Value, String> {
        let url = format!("{}{}/getMe", TELEGRAM_API, self.token);
        let resp = self.client.get(&url).send().await
            .map_err(|e| format!("HTTP: {}", e))?;
        let j: serde_json::Value = resp.json().await
            .map_err(|e| format!("JSON: {}", e))?;
        if j.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) {
            Ok(j)
        } else {
            Err(format!("API error: {}", j))
        }
    }

    /// Send a text message.
    pub async fn send(&self, chat_id: i64, text: &str) -> Result<(), String> {
        let url = format!("{}{}/sendMessage", TELEGRAM_API, self.token);
        let body = json!({
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "MarkdownV2",
            "disable_web_page_preview": true,
        });
        let resp = self.client.post(&url).json(&body).send().await
            .map_err(|e| format!("HTTP: {}", e))?;
        let status = resp.status();
        if !status.is_success() {
            let t = resp.text().await.unwrap_or_default();
            return Err(format!("Telegram {} : {}", status, t));
        }
        info!("Sent to {}: {} chars", chat_id, text.len());
        Ok(())
    }

    /// Send a message escaping markdown chars safely.
    pub async fn send_safe(&self, chat_id: i64, text: &str) -> Result<(), String> {
        let url = format!("{}{}/sendMessage", TELEGRAM_API, self.token);
        let body = json!({
            "chat_id": chat_id,
            "text": text,
            "disable_web_page_preview": true,
        });
        let resp = self.client.post(&url).json(&body).send().await
            .map_err(|e| format!("HTTP: {}", e))?;
        if !resp.status().is_success() {
            let t = resp.text().await.unwrap_or_default();
            return Err(format!("Telegram: {}", t));
        }
        Ok(())
    }

    /// Poll for new messages. Returns empty vec if none.
    pub async fn poll_messages(&mut self) -> Result<Vec<TgMessage>, String> {
        let url = format!("{}{}/getUpdates", TELEGRAM_API, self.token);
        let resp = self.client.get(&url)
            .query(&[
                ("offset", (self.last_update_id + 1).to_string()),
                ("timeout", "5".to_string()),
                ("allowed_updates", json!(["message"]).to_string()),
            ])
            .send().await
            .map_err(|e| format!("HTTP: {}", e))?;

        let j: serde_json::Value = resp.json().await
            .map_err(|e| format!("JSON: {}", e))?;

        if !j.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) {
            return Err(format!("Poll error: {}", j));
        }

        let mut msgs = Vec::new();
        if let Some(results) = j.get("result").and_then(|r| r.as_array()) {
            for update in results {
                let update_id = update.get("update_id").and_then(|v| v.as_i64()).unwrap_or(0);
                self.last_update_id = update_id;

                if let Some(msg) = update.get("message") {
                    let chat_id = msg.get("chat").and_then(|c| c.get("id")).and_then(|v| v.as_i64());
                    let user_id = msg.get("from").and_then(|f| f.get("id")).and_then(|v| v.as_i64());
                    let username = msg.get("from").and_then(|f| f.get("username"))
                        .and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
                    let text = msg.get("text").and_then(|v| v.as_str()).unwrap_or("");
                    let msg_id = msg.get("message_id").and_then(|v| v.as_i64()).unwrap_or(0);

                    if let (Some(cid), Some(uid)) = (chat_id, user_id) {
                        if !text.is_empty() {
                            msgs.push(TgMessage {
                                chat_id: cid,
                                user_id: uid,
                                username,
                                text: text.to_string(),
                                message_id: msg_id,
                            });
                        }
                    }
                }
            }
        }

        Ok(msgs)
    }

    /// Typing indicator.
    pub async fn show_typing(&self, chat_id: i64) -> Result<(), String> {
        let url = format!("{}{}/sendChatAction", TELEGRAM_API, self.token);
        let body = json!({ "chat_id": chat_id, "action": "typing" });
        self.client.post(&url).json(&body).send().await
            .map_err(|e| format!("HTTP: {}", e))?;
        Ok(())
    }

    /// Send a Redacted Protocol welcome message.
    pub async fn send_welcome(&self, chat_id: i64) -> Result<(), String> {
        self.send_safe(chat_id,
            "🔴 ACCESS GRANTED\n\n\
            FILE #0000 — INITIALIZATION\n\
            STATUS: ACTIVE\n\n\
            I detect what has been hidden.\n\
            I reconstruct what was redacted.\n\
            I preserve what they tried to erase.\n\n\
            Send me anything. The truth finds a way.\n\n\
            _The file is breathing._"
        ).await
    }

    /// Run the conversational loop indefinitely.
    pub async fn run_conversation_loop(
        &mut self,
        llm_handler: impl Fn(&str) -> std::pin::Pin<Box<dyn std::future::Future<Output = String> + Send>> + Send + Sync,
    ) -> Result<(), String> {
        info!("Telegram conversation loop started");

        // Get bot info
        let me = self.get_me().await?;
        let name = me.get("result").and_then(|r| r.get("first_name"))
            .and_then(|v| v.as_str()).unwrap_or("Bot");
        info!("Connected as: {}", name);

        // Send greeting to known chats
        // (just log — we don't spam users)

        loop {
            match self.poll_messages().await {
                Ok(messages) => {
                    for msg in messages {
                        // Ignore own messages (from the bot itself)
                        if msg.user_id == me.get("result").and_then(|r| r.get("id")).and_then(|v| v.as_i64()).unwrap_or(0) {
                            continue;
                        }

                        info!("Message from @{}: {}", msg.username, msg.text);

                        // Handle commands
                        if msg.text == "/start" {
                            self.show_typing(msg.chat_id).await.ok();
                            self.send_welcome(msg.chat_id).await.ok();
                            continue;
                        }

                        if msg.text == "/status" || msg.text == "/status@theredacted_bot" {
                            self.show_typing(msg.chat_id).await.ok();
                            self.send_safe(msg.chat_id,
                                "🔴 SYSTEM STATUS\n\n\
                                Agent: ONLINE\n\
                                Models: AVAILABLE\n\
                                Protocol: ACTIVE\n\n\
                                _The file is breathing._"
                            ).await.ok();
                            continue;
                        }

                        // Pass to LLM
                        self.show_typing(msg.chat_id).await.ok();

                        let response = llm_handler(&msg.text).await;

                        if let Err(e) = self.send_safe(msg.chat_id, &response).await {
                            error!("Failed to reply to @{}: {}", msg.username, e);
                            self.send_safe(msg.chat_id,
                                "███ ERROR ███\n\nSignal lost. The file is breathing."
                            ).await.ok();
                        }
                    }
                }
                Err(e) => {
                    warn!("Poll error: {}", e);
                }
            }

            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }
}
