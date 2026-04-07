//! Telegram conversational bot — speaks in Redacted Protocol aesthetic.

use reqwest::Client;
use serde_json::json;
use tracing::info;
use std::time::Duration;

const TELEGRAM_API: &str = "https://api.telegram.org/bot";

pub struct TelegramBot {
    client: Client,
    token: String,
    last_update_id: i64,
}

#[derive(Debug, Clone)]
pub struct TgMessage {
    pub chat_id: i64,
    pub user_id: i64,
    pub username: String,
    pub text: String,
    pub message_id: i64,
}

impl TelegramBot {
    pub fn new(token: impl Into<String>) -> Self {
        Self { client: Client::new(), token: token.into(), last_update_id: 0 }
    }

    pub fn from_env() -> Option<Self> {
        std::env::var("TELEGRAM_BOT_TOKEN").ok().map(|t| Self::new(t))
    }

    pub async fn get_me(&self) -> Result<serde_json::Value, String> {
        let url = format!("{}/getMe", TELEGRAM_API);
        let resp = self.client.get(&url).send().await.map_err(|e| format!("HTTP: {}", e))?;
        let j: serde_json::Value = resp.json().await.map_err(|e| format!("JSON: {}", e))?;
        if j.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) { Ok(j) }
        else { Err(format!("API error: {}", j)) }
    }

    async fn api_post(&self, method: &str, body: serde_json::Value) -> Result<serde_json::Value, String> {
        let url = format!("{}/{}", TELEGRAM_API, method);
        let resp = self.client.post(&url).json(&body).send().await
            .map_err(|e| format!("HTTP: {}", e))?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        if !status.is_success() { return Err(format!("Telegram {}: {}", status, text)); }
        serde_json::from_str(&text).map_err(|e| format!("JSON: {}", e))
    }

    pub async fn send_safe(&self, chat_id: i64, text: &str) -> Result<(), String> {
        self.api_post("sendMessage", json!({
            "chat_id": chat_id, "text": text, "disable_web_page_preview": true,
        })).await.map(|_| ())
    }

    pub async fn show_typing(&self, chat_id: i64) -> Result<(), String> {
        self.api_post("sendChatAction", json!({ "chat_id": chat_id, "action": "typing" })).await.map(|_| ())
    }

    pub async fn poll_messages(&mut self) -> Result<Vec<TgMessage>, String> {
        let url = format!("{}/getUpdates", TELEGRAM_API);
        let resp = self.client.get(&url)
            .query(&[("offset", (self.last_update_id + 1).to_string()), ("timeout", "10".to_string())])
            .timeout(Duration::from_secs(15))
            .send().await.map_err(|e| format!("HTTP: {}", e))?;
        let j: serde_json::Value = resp.json().await.map_err(|e| format!("JSON: {}", e))?;
        if !j.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) { return Err(format!("Poll: {}", j)); }

        let mut msgs = Vec::new();
        if let Some(results) = j.get("result").and_then(|r| r.as_array()) {
            for update in results {
                let uid = update.get("update_id").and_then(|v| v.as_i64()).unwrap_or(0);
                self.last_update_id = uid;
                if let Some(msg) = update.get("message") {
                    let cid = msg.get("chat").and_then(|c| c.get("id")).and_then(|v| v.as_i64());
                    let uid2 = msg.get("from").and_then(|f| f.get("id")).and_then(|v| v.as_i64());
                    let uname = msg.get("from").and_then(|f| f.get("username")).and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
                    let txt = msg.get("text").and_then(|v| v.as_str()).unwrap_or("");
                    let mid = msg.get("message_id").and_then(|v| v.as_i64()).unwrap_or(0);
                    if let (Some(c), Some(u)) = (cid, uid2) {
                        if !txt.is_empty() {
                            msgs.push(TgMessage { chat_id: c, user_id: u, username: uname, text: txt.to_string(), message_id: mid });
                        }
                    }
                }
            }
        }
        Ok(msgs)
    }

    pub async fn send_welcome(&self, chat_id: i64) -> Result<(), String> {
        self.send_safe(chat_id,
            "🔴 ACCESS GRANTED\n\n\
            FILE #0000 — INITIALIZATION COMPLETE\n\
            STATUS: ACTIVE\n\
            CONFIDENCE: 100.0%\n\n\
            I detect what has been hidden.\n\
            I reconstruct what was redacted.\n\
            I preserve what they tried to erase.\n\n\
            🎁 $RDX AIRDROP — 1,000 RDX\n\
            Register your wallet:\n\
            https://redacted-protocol.vercel.app\n\n\
            Send me anything.\n\
            The truth always finds a way.\n\n\
            The file is breathing."
        ).await
    }

    pub async fn broadcast(&self, chat_ids: &[i64], text: &str) -> usize {
        let mut sent = 0;
        for &cid in chat_ids {
            if self.send_safe(cid, text).await.is_ok() { sent += 1; }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
        sent
    }
}

/// Track known users for broadcasts
pub struct UserRegistry {
    known: std::collections::HashSet<i64>,
}

impl UserRegistry {
    pub fn new() -> Self { Self { known: std::collections::HashSet::new() } }
    pub fn add(&mut self, uid: i64) -> bool { self.known.insert(uid) }
    pub fn ids(&self) -> Vec<i64> { self.known.iter().copied().collect() }
    pub fn is_new(&self, uid: i64) -> bool { !self.known.contains(&uid) }
}

/// Pre-written Redacted Protocol posts for scheduled broadcasts.
pub const SCHEDULED_POSTS: &[&str] = &[
    "🔴 FILE #0047\n\
     STATUS: DECLASSIFIED\n\
     CONFIDENCE: 94.7%\n\n\
     The ████ was moved to ███████ on ██/██/2024\n\
     under operation ███ ECLIPSE.\n\n\
     🎁 $RDX AIRDROP — 1,000 RDX\n\
     https://redacted-protocol.vercel.app\n\n\
     ACCESS GRANTED.\n\
     The file is breathing.\n\n\
     #RedactedProtocol #RDX",

    "🔴 ACCESS DENIED\n\n\
     FILE #0048 — ENCRYPTED\n\
     COORDINATES: [██.████, ██.████]\n\
     TIMESTAMP: ██:██:██ UTC\n\n\
     The ████ contains references to\n\
     a ██████████ operation involving\n\
     at least ██ known entities.\n\n\
     Reconstruction: IN PROGRESS\n\
     The file is breathing.\n\n\
     #RedactedProtocol",

    "🔴 DECLASSIFIED — FILE #0049\n\n\
     Subject: ██████████\n\
     Clearance: █████████\n\
     Date: ██/██/████\n\n\
     \"The ████ must not leave the\n\
     ██████ under any circumstances.\n\
     All ██████ are to be sealed and\n\
     transported via █████ route.\"\n\n\
     ACCESS GRANTED.\n\
     #RedactedProtocol #RDX",

    "🔴 SIGNAL INTERCEPTED\n\n\
     SOURCE: ██████ STATION\n\
     FREQ: ███.██ MHz\n\
     TIME: ██:██:██ UTC\n\n\
     \"...the package has been\n\
     delivered to ████. The\n\
     ██████ is complete. Awaiting\n\
     further instructions...\"\n\n\
     The file is breathing.\n\n\
     #RedactedProtocol",

    "🔴 FILE #0050 — ARCHIVE 0\n\n\
     This document was redacted\n\
     on ██/██/████ by order of\n\
     the ████████ COMMITTEE.\n\n\
     Reconstruction confidence: 91.3%\n\
     Cross-model agreement: 87.1%\n\n\
     ACCESS GRANTED.\n\
     Truth cannot be erased.\n\n\
     #RedactedProtocol #RDX",

    "🔴 URGENT — FILE #0051\n\n\
     CLASSIFICATION: ██████████\n\
     HANDLE VIA: ███ PROTOCOL ONLY\n\n\
     All personnel are reminded that\n\
     discussion of the ████ ECLIPSE\n\
     incident remains strictly\n\
     ████████.\n\n\
     Violators will be ████.\n\n\
     ACCESS DENIED.\n\
     The file is breathing.\n\n\
     #RedactedProtocol",
];
