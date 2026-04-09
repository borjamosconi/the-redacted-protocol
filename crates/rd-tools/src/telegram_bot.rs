//! Telegram conversational bot — speaks in Redacted Protocol aesthetic.
//!
//! Features:
//! - Auto-detects URLs in messages and offers to scan them
//! - Inline keyboard buttons for quick actions
//! - Rich formatting with MarkdownV2
//! - Command handling for /start, /status, /help, /airdrop, /scan_news
//! - Image generation in Redacted Protocol style
//! - Photo sending with generated images

use reqwest::Client;
use serde_json::json;
use std::time::Duration;

const TELEGRAM_API: &str = "https://api.telegram.org";

/// Telegram Bot API client.
pub const REDACTED_IMAGE_PROMPTS: &[(&str, &str)] = &[
    (
        "censored_figure",
        "dark dystopian figure with holographic rainbow censor bars covering the face, red and orange iridescent interference pattern dripping down, floating redacted documents in background, dark grid background, cinematic lighting, cyberpunk, Solana Hackathon 2026 aesthetic, highly detailed, 8k, photorealistic, mysterious atmosphere",
    ),
    (
        "access_denied",
        "red 'ACCESS DENIED' rubber stamp on dark background, glitch effect, VHS distortion, holographic interference, floating classified documents, dark grid pattern, cyberpunk dystopian, dramatic lighting, 8k quality, dark moody atmosphere",
    ),
    (
        "floating_documents",
        "floating redacted documents with black bars and censorship symbols, dark grid background, holographic light effects, classified papers scattered in void, cinematic composition, dark aesthetic, ultra detailed, 8k, mysterious",
    ),
    (
        "circuit_board",
        "circuit board pattern with redacted elements, glowing red traces, holographic interference, dark background with grid overlay, cyberpunk tech aesthetic, highly detailed, macro photography style, dark and moody",
    ),
    (
        "classified_doc",
        "classified document with black redaction bars, TOP SECRET stamp, holographic light effects, dark moody lighting, floating in void, grid background, photorealistic, 8k quality, mysterious atmosphere",
    ),
    (
        "glitch_interference",
        "digital glitch interference pattern, holographic rainbow distortion, red and orange tones, VHS tracking error effect, dark background, classified document fragments visible through static, cyberpunk, cinematic, dark and mysterious",
    ),
];

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
    /// URLs detected in the message
    pub urls: Vec<String>,
    /// Whether this is a callback query from inline keyboard
    pub is_callback: bool,
    pub callback_data: Option<String>,
}

impl TgMessage {
    pub fn has_urls(&self) -> bool {
        !self.urls.is_empty()
    }
}

/// Inline keyboard button definition.
#[derive(Debug, Clone)]
pub struct InlineButton {
    pub text: String,
    pub callback_data: String,
    pub url: Option<String>,
}

/// Inline keyboard — row of buttons.
#[derive(Debug, Clone)]
pub struct InlineKeyboard {
    pub rows: Vec<Vec<InlineButton>>,
}

impl InlineKeyboard {
    pub fn new() -> Self {
        Self { rows: Vec::new() }
    }

    pub fn row(mut self, buttons: Vec<InlineButton>) -> Self {
        self.rows.push(buttons);
        self
    }

    pub fn to_json(&self) -> serde_json::Value {
        json!(self.rows.iter().map(|row| {
            row.iter().map(|btn| {
                let mut obj = serde_json::Map::new();
                obj.insert("text".into(), json!(btn.text));
                if let Some(ref url) = btn.url {
                    obj.insert("url".into(), json!(url));
                } else {
                    obj.insert("callback_data".into(), json!(btn.callback_data));
                }
                serde_json::Value::Object(obj)
            }).collect::<Vec<_>>()
        }).collect::<Vec<_>>())
    }
}

impl TelegramBot {
    pub fn new(token: impl Into<String>) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap_or_default(),
            token: token.into(),
            last_update_id: 0,
        }
    }

    pub fn from_env() -> Option<Self> {
        std::env::var("TELEGRAM_BOT_TOKEN").ok().map(|t| Self::new(t))
    }

    pub async fn get_me(&self) -> Result<serde_json::Value, String> {
        let url = format!("{}/bot{}/getMe", TELEGRAM_API, self.token);
        let resp = self.client.get(&url).send().await.map_err(|e| format!("HTTP: {}", e))?;
        let j: serde_json::Value = resp.json().await.map_err(|e| format!("JSON: {}", e))?;
        if j.get("ok").and_then(|v| v.as_bool()).unwrap_or(false) { Ok(j) }
        else { Err(format!("API error: {}", j)) }
    }

    async fn api_post(&self, method: &str, body: serde_json::Value) -> Result<serde_json::Value, String> {
        let url = format!("{}/bot{}/{}", TELEGRAM_API, self.token, method);
        let resp = self.client.post(&url).json(&body).send().await
            .map_err(|e| format!("HTTP: {}", e))?;
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        if !status.is_success() { return Err(format!("Telegram {}: {}", status, text)); }
        serde_json::from_str(&text).map_err(|e| format!("JSON: {}", e))
    }

    /// Send a message with MarkdownV2 formatting and optional inline keyboard.
    pub async fn send_formatted(
        &self,
        chat_id: i64,
        text: &str,
        keyboard: Option<&InlineKeyboard>,
    ) -> Result<(), String> {
        let mut body = json!({
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "MarkdownV2",
            "disable_web_page_preview": true,
        });

        if let Some(kb) = keyboard {
            body.as_object_mut().unwrap().insert("reply_markup".into(), json!({
                "inline_keyboard": kb.to_json(),
            }));
        }

        self.api_post("sendMessage", body).await.map(|_| ())
    }

    /// Send a plain text message (no formatting).
    pub async fn send_safe(&self, chat_id: i64, text: &str) -> Result<(), String> {
        let body = json!({
            "chat_id": chat_id,
            "text": text,
            "disable_web_page_preview": true,
        });
        self.api_post("sendMessage", body).await.map(|_| ())
    }

    /// Send a photo with caption.
    pub async fn send_photo(&self, chat_id: i64, photo_url: &str, caption: &str) -> Result<(), String> {
        let body = json!({
            "chat_id": chat_id,
            "photo": photo_url,
            "caption": caption,
            "parse_mode": "MarkdownV2",
        });
        self.api_post("sendPhoto", body).await.map(|_| ())
    }

    /// Send a photo with inline keyboard.
    pub async fn send_photo_with_keyboard(
        &self,
        chat_id: i64,
        photo_url: &str,
        caption: &str,
        keyboard: &InlineKeyboard,
    ) -> Result<(), String> {
        let body = json!({
            "chat_id": chat_id,
            "photo": photo_url,
            "caption": caption,
            "parse_mode": "MarkdownV2",
            "reply_markup": json!({
                "inline_keyboard": keyboard.to_json(),
            }),
        });
        self.api_post("sendPhoto", body).await.map(|_| ())
    }

    /// Show typing indicator.
    pub async fn show_typing(&self, chat_id: i64) -> Result<(), String> {
        self.api_post("sendChatAction", json!({ "chat_id": chat_id, "action": "typing" })).await.map(|_| ())
    }

    /// Edit a message (used for callback responses).
    pub async fn edit_message(&self, chat_id: i64, message_id: i64, text: &str) -> Result<(), String> {
        self.api_post("editMessageText", json!({
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": "MarkdownV2",
            "disable_web_page_preview": true,
        })).await.map(|_| ())
    }

    /// Answer a callback query (shows popup or toast).
    pub async fn answer_callback(&self, callback_query_id: &str, text: &str, show_alert: bool) -> Result<(), String> {
        self.api_post("answerCallbackQuery", json!({
            "callback_query_id": callback_query_id,
            "text": text,
            "show_alert": show_alert,
        })).await.map(|_| ())
    }

    /// Escape text for MarkdownV2.
    pub fn escape_md(text: &str) -> String {
        let mut result = String::new();
        for c in text.chars() {
            match c {
                '_' | '*' | '[' | ']' | '(' | ')' | '~' | '`' | '#' | '+' | '-' | '=' | '|' | '{' | '}' | '.' | '!' => {
                    result.push('\\');
                    result.push(c);
                }
                _ => result.push(c),
            }
        }
        result
    }

    pub async fn poll_messages(&mut self) -> Result<Vec<TgMessage>, String> {
        let url = format!("{}/{}/getUpdates", TELEGRAM_API, self.token);
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

                // Handle callback queries
                if let Some(cb) = update.get("callback_query") {
                    let cid = cb.get("message").and_then(|m| m.get("chat")).and_then(|c| c.get("id")).and_then(|v| v.as_i64());
                    let uid2 = cb.get("from").and_then(|f| f.get("id")).and_then(|v| v.as_i64());
                    let uname = cb.get("from").and_then(|f| f.get("username")).and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
                    let data = cb.get("data").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let mid = cb.get("message").and_then(|m| m.get("message_id")).and_then(|v| v.as_i64()).unwrap_or(0);
                    if let (Some(c), Some(u)) = (cid, uid2) {
                        msgs.push(TgMessage {
                            chat_id: c, user_id: u, username: uname,
                            text: format!("callback:{}", data), message_id: mid,
                            urls: Vec::new(), is_callback: true,
                            callback_data: Some(data),
                        });
                    }
                    continue;
                }

                // Handle regular messages
                if let Some(msg) = update.get("message") {
                    let cid = msg.get("chat").and_then(|c| c.get("id")).and_then(|v| v.as_i64());
                    let uid2 = msg.get("from").and_then(|f| f.get("id")).and_then(|v| v.as_i64());
                    let uname = msg.get("from").and_then(|f| f.get("username")).and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
                    let txt = msg.get("text").and_then(|v| v.as_str()).unwrap_or("");
                    let mid = msg.get("message_id").and_then(|v| v.as_i64()).unwrap_or(0);
                    if let (Some(c), Some(u)) = (cid, uid2) {
                        if !txt.is_empty() {
                            // Auto-detect URLs
                            let urls = Self::detect_urls_in_text(txt);
                            msgs.push(TgMessage {
                                chat_id: c, user_id: u, username: uname,
                                text: txt.to_string(), message_id: mid,
                                urls, is_callback: false, callback_data: None,
                            });
                        }
                    }
                }
            }
        }
        Ok(msgs)
    }

    /// Detect URLs in text.
    fn detect_urls_in_text(text: &str) -> Vec<String> {
        let url_re = regex::Regex::new(
            r##"https?://[^\s<>"')\]}]+"##
        ).unwrap();
        url_re.find_iter(text)
            .map(|m| m.as_str().to_string())
            .collect()
    }

    /// Build an inline keyboard with URL scan buttons.
    pub fn scan_keyboard(urls: &[String]) -> InlineKeyboard {
        let mut keyboard = InlineKeyboard::new();
        let buttons: Vec<InlineButton> = urls.iter().take(3).map(|url| {
            let short = if url.len() > 30 { format!("Scan: ...{}", &url[url.len()-25..]) } else { format!("Scan: {}", url) };
            InlineButton {
                text: short,
                callback_data: format!("scan:{}", url),
                url: None,
            }
        }).collect();
        if !buttons.is_empty() {
            keyboard = keyboard.row(buttons);
        }
        keyboard
    }

    /// Main menu keyboard.
    pub fn main_keyboard() -> InlineKeyboard {
        InlineKeyboard::new()
            .row(vec![
                InlineButton { text: "\u{1F50D} Scan News".into(), callback_data: "cmd:scan_prompt".into(), url: None },
                InlineButton { text: "\u{1F4CA} My Airdrop".into(), callback_data: "cmd:airdrop".into(), url: None },
            ])
            .row(vec![
                InlineButton { text: "\u{1F4E1} Status".into(), callback_data: "cmd:status".into(), url: None },
                InlineButton { text: "\u{2753} Help".into(), callback_data: "cmd:help".into(), url: None },
            ])
            .row(vec![
                InlineButton { text: "\u{1F310} Dashboard".into(), callback_data: "".into(), url: Some("https://redacted-protocol.vercel.app".into()) },
            ])
    }

    /// Welcome message with inline keyboard.
    pub async fn send_welcome(&self, chat_id: i64) -> Result<(), String> {
        let text = "\u{1F534} *ACCESS GRANTED*

FILE \\#0000 — INITIALIZATION COMPLETE
STATUS: `ACTIVE`
CONFIDENCE: `100\\.0%`

I detect what has been hidden\\.
I reconstruct what was redacted\\.
I preserve what they tried to erase\\.

\u{1F381} *\\$RDX AIRDROP* — `1,000 RDX`
Register: [redacted\\-protocol\\.vercel\\.app](https://redacted-protocol.vercel.app)

Paste any news URL and I'll scan it automatically\\.
Or use the buttons below\\.

_The file is breathing\\._";

        self.send_formatted(chat_id, text, Some(&Self::main_keyboard())).await
    }

    /// Send news analysis result with formatted output.
    pub async fn send_analysis_result(&self, chat_id: i64, url: &str, result: &rd_types::news::NewsAnalysisResult) -> Result<(), String> {
        let threat_icon = result.threat_level.icon();
        let threat_label = format!("{:?}", result.threat_level);
        let escaped_title = Self::escape_md(&result.title);
        let escaped_url = Self::escape_md(url);

        let mut text = format!(
            "{threat_icon} *NEWS ANALYSIS COMPLETE*

*URL:* [{}]({})
*Title:* {}
*Threat:* `{}`
*Flags:* `{}`
*Content:* `{}` chars",
            escaped_url, url, escaped_title, threat_label, result.flags.len(), result.content_length
        );

        if !result.flags.is_empty() {
            text.push_str("\n\n*INDICATORS:*");
            for flag in result.flags.iter().take(8) {
                let escaped_desc = Self::escape_md(&flag.description);
                text.push_str(&format!("\n\u{2022} \\[{}] {} `\\({:.0}%\\)`", flag.flag_type, escaped_desc, flag.confidence * 100.0));
            }
            if result.flags.len() > 8 {
                text.push_str(&format!("\n_\\.\\.\\. and {} more_", result.flags.len() - 8));
            }
        } else {
            text.push_str("\n\n\\_No significant indicators found\\._");
        }

        text.push_str("\n\n_The file is breathing\\._");

        // Action buttons
        let keyboard = InlineKeyboard::new()
            .row(vec![
                InlineButton { text: "\u{1F50D} Scan Another".into(), callback_data: "cmd:scan_prompt".into(), url: None },
                InlineButton { text: "\u{1F4CA} Airdrop Status".into(), callback_data: "cmd:airdrop".into(), url: None },
            ]);

        self.send_formatted(chat_id, &text, Some(&keyboard)).await
    }

    /// Send airdrop status.
    pub async fn send_airdrop_status(&self, chat_id: i64, eligible: bool, amount_rdx: f64, wallet: Option<&str>) -> Result<(), String> {
        let text = format!(
            "\u{1F534} *AIRDROP STATUS*

Eligible: `{}`
Allocation: `{} RDX`
Status: `{}`
{}

Register wallet: [redacted\\-protocol\\.vercel\\.app](https://redacted-protocol.vercel.app)

_The file is breathing\\._",
            if eligible { "\u{2705} YES" } else { "\u{274C} NO" },
            amount_rdx,
            if eligible { "PENDING LAUNCH" } else { "NOT REGISTERED" },
            if let Some(w) = wallet { format!("Wallet: `{}`", Self::escape_md(&w[..8])) } else { String::new() }
        );
        self.send_formatted(chat_id, &text, Some(&Self::main_keyboard())).await
    }

    /// Send system status.
    pub async fn send_system_status(&self, chat_id: i64, user_count: usize) -> Result<(), String> {
        let text = format!(
            "\u{1F534} *SYSTEM STATUS*

Agent: `ONLINE`
Models: `AVAILABLE`
Protocol: `ACTIVE`
Users registered: `{}`
Feeds monitored: `7`

$RDX Airdrop: `LIVE`
Dashboard: [redacted\\-protocol\\.vercel\\.app](https://redacted-protocol.vercel.app)

_The file is breathing\\._",
            user_count
        );
        self.send_formatted(chat_id, &text, Some(&Self::main_keyboard())).await
    }

    /// Broadcast to multiple chats.
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
    pub fn count(&self) -> usize { self.known.len() }
}

/// Pre-written Redacted Protocol posts for scheduled broadcasts.
/// Each post includes an image style reference for image generation.
pub const SCHEDULED_POSTS: &[(&str, &str)] = &[
    (
        "\u{1F534} FILE \\#0047
STATUS: `DECLASSIFIED`
CONFIDENCE: `94\\.7%`

The \u{2588}\u{2588}\u{2588}\u{2588} was moved to \u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588} on \u{2588}\u{2588}/\u{2588}\u{2588}/2024
under operation \u{2588}\u{2588}\u{2588} ECLIPSE\\.

\u{1F381} *\\$RDX AIRDROP* — `1,000 RDX`
[redacted\\-protocol\\.vercel\\.app](https://redacted-protocol.vercel.app)

ACCESS GRANTED\\.
_The file is breathing\\._

\\#RedactedProtocol \\#RDX",
        "censored_figure",
    ),
    (
        "\u{1F534} ACCESS DENIED

FILE \\#0048 — `ENCRYPTED`
COORDINATES: `[\u{2588}\u{2588}\\.████, \u{2588}\u{2588}\\.████]`
TIMESTAMP: `\u{2588}\u{2588}:██:██ UTC`

The \u{2588}\u{2588}\u{2588}\u{2588} contains references to
a \u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588} operation involving
at least \u{2588}\u{2588} known entities\\.

Reconstruction: `IN PROGRESS`
_The file is breathing\\._

\\#RedactedProtocol",
        "access_denied",
    ),
    (
        "\u{1F534} *DECLASSIFIED* — FILE \\#0049

Subject: \u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}
Clearance: \u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}
Date: \u{2588}\u{2588}/\u{2588}\u{2588}/████

\"The \u{2588}\u{2588}\u{2588}\u{2588} must not leave the
\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588} under any circumstances\\.
All \u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588} are to be sealed and
transported via \u{2588}\u{2588}\u{2588}\u{2588}\u{2588} route\\.\"

ACCESS GRANTED\\.
\\#RedactedProtocol \\#RDX",
        "classified_doc",
    ),
    (
        "\u{1F534} *SIGNAL INTERCEPTED*

SOURCE: \u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588} STATION
FREQ: `\u{2588}\u{2588}\u{2588}\\.██ MHz`
TIME: `\u{2588}\u{2588}:\u{2588}\u{2588}:\u{2588}\u{2588} UTC`

\"\\.\\.\\.the package has been
delivered to \u{2588}\u{2588}\u{2588}\u{2588}\\. The
\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588} is complete\\. Awaiting
further instructions\\.\\.\\.\"

_The file is breathing\\._

\\#RedactedProtocol",
        "glitch_interference",
    ),
    (
        "\u{1F534} FILE \\#0050 — ARCHIVE 0

This document was redacted
on \u{2588}\u{2588}/\u{2588}\u{2588}/████ by order of
the \u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588} COMMITTEE\\.

Reconstruction confidence: `91\\.3%`
Cross\\-model agreement: `87\\.1%`

ACCESS GRANTED\\.
Truth cannot be erased\\.

\\#RedactedProtocol \\#RDX",
        "floating_documents",
    ),
    (
        "\u{1F534} *URGENT* — FILE \\#0051

CLASSIFICATION: \u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}
HANDLE VIA: \u{2588}\u{2588}\u{2588} PROTOCOL ONLY

All personnel are reminded that
discussion of the \u{2588}\u{2588}\u{2588}\u{2588} ECLIPSE
incident remains strictly
\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\u{2588}\\.

Violators will be \u{2588}\u{2588}\u{2588}\u{2588}\\.

ACCESS DENIED\\.
_The file is breathing\\._

\\#RedactedProtocol",
        "circuit_board",
    ),
];
