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
    /// Required to answer the callback query via answerCallbackQuery
    pub callback_query_id: Option<String>,
    /// Whether this message represents a new member joining a group
    pub is_new_member: bool,
    pub new_member_name: Option<String>,
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
        let body = if let Some(kb) = keyboard {
            json!({
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "MarkdownV2",
                "disable_web_page_preview": true,
                "reply_markup": { "inline_keyboard": kb.to_json() },
            })
        } else {
            json!({
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "MarkdownV2",
                "disable_web_page_preview": true,
            })
        };

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

    /// Send a photo from a URL (no caption formatting).
    pub async fn send_photo_simple(&self, chat_id: i64, photo_url: &str) -> Result<(), String> {
        let body = json!({
            "chat_id": chat_id,
            "photo": photo_url,
        });
        self.api_post("sendPhoto", body).await.map(|_| ())
    }

    /// Generate a Pollinations.ai image URL from a prompt (free, no API key needed).
    pub fn pollinations_image_url(prompt: &str, width: u32, height: u32, seed: u32) -> String {
        format!(
            "https://image.pollinations.ai/prompt/{}?width={}&height={}&seed={}&nologo=true&model=flux",
            urlencoding::encode(prompt),
            width,
            height,
            seed
        )
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

    /// Escape a URL for use as a link target in MarkdownV2.
    /// Telegram MarkdownV2 requires escaping of certain characters even inside URL parentheses.
    pub fn escape_md_url(url: &str) -> String {
        url.replace('\\', "\\\\")
            .replace('.', "\\.")
            .replace('-', "\\-")
            .replace('!', "\\!")
    }

    pub async fn poll_messages(&mut self) -> Result<Vec<TgMessage>, String> {
        let url = format!("{}/bot{}/getUpdates", TELEGRAM_API, self.token);
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
                    let cb_id = cb.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
                    if let (Some(c), Some(u)) = (cid, uid2) {
                        msgs.push(TgMessage {
                            chat_id: c, user_id: u, username: uname,
                            text: format!("callback:{}", data), message_id: mid,
                            urls: Vec::new(), is_callback: true,
                            callback_data: Some(data),
                            callback_query_id: cb_id,
                            is_new_member: false,
                            new_member_name: None,
                        });
                    }
                    continue;
                }

                // Handle regular messages or service messages
                if let Some(msg) = update.get("message") {
                    let cid = msg.get("chat").and_then(|c| c.get("id")).and_then(|v| v.as_i64());
                    let uid2 = msg.get("from").and_then(|f| f.get("id")).and_then(|v| v.as_i64());
                    let uname = msg.get("from").and_then(|f| f.get("username")).and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
                    let txt = msg.get("text").and_then(|v| v.as_str()).unwrap_or("");
                    let mid = msg.get("message_id").and_then(|v| v.as_i64()).unwrap_or(0);
                    
                    if let Some(c) = cid {
                        // LOG FOR DEBUGGING GROUP IDS
                        println!("\n[TELEGRAM] Update from Chat ID: {} (@{})", c, uname);
                        
                        // Handle join event
                        if let Some(new_members) = msg.get("new_chat_members").and_then(|v| v.as_array()) {
                            for member in new_members {
                                let name = member.get("first_name").and_then(|v| v.as_str()).unwrap_or("Stranger");
                                msgs.push(TgMessage {
                                    chat_id: c, user_id: 0, username: "system".into(),
                                    text: "system:join".into(), message_id: mid,
                                    urls: Vec::new(), is_callback: false,
                                    callback_data: None, callback_query_id: None,
                                    is_new_member: true, new_member_name: Some(name.to_string()),
                                });
                            }
                        }

                        if let (Some(u), false) = (uid2, txt.is_empty()) {
                            // Auto-detect URLs
                            let urls = Self::detect_urls_in_text(txt);
                            msgs.push(TgMessage {
                                chat_id: c, user_id: u, username: uname,
                                text: txt.to_string(), message_id: mid,
                                urls, is_callback: false, callback_data: None,
                                callback_query_id: None,
                                is_new_member: false, new_member_name: None,
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
                InlineButton { text: "\u{1F310} Dashboard".into(), callback_data: "".into(), url: Some("https://redacted.bond".into()) },
            ])
    }

    /// Welcome message with inline keyboard.
    pub async fn send_welcome(&self, chat_id: i64) -> Result<(), String> {
        let text = "*Bienvenido a Redacted Protocol*

Este bot te ayuda a tokenizar documentos en Solana con IA y a seguir tu actividad dentro del protocolo\\.

*Que puedes hacer aqui:*
\\- Analizar noticias pegando un enlace en el chat\\.
\\- Consultar tu airdrop con el boton *My Airdrop*\\.
\\- Abrir el dashboard para ver XP, misiones y wallet\\.
\\- Entrar al terminal para subir documentos\\.

*Enlaces:*
\\- Dashboard: [redacted\\.bond/dashboard](https://redacted\\.bond/dashboard)
\\- Terminal de documentos: [redacted\\.bond/terminal](https://redacted\\.bond/terminal)
\\- Web principal: [redacted\\.bond](https://redacted\\.bond)";

        self.send_formatted(chat_id, text, Some(&Self::main_keyboard())).await
    }

    /// Send news analysis result with formatted output.
    pub async fn send_analysis_result(&self, chat_id: i64, url: &str, result: &rd_types::news::NewsAnalysisResult) -> Result<(), String> {
        let threat_icon = result.threat_level.icon();
        let threat_label = match result.threat_level {
            rd_types::news::ThreatLevel::Critical => "Crítico (Censura Inminente / Alta Gravedad)",
            rd_types::news::ThreatLevel::Flagged => "Marcado (Censura Detectada / Manipulación)",
            rd_types::news::ThreatLevel::Suspicious => "Sospechoso (Anomalías de contenido)",
            _ => "Seguro (Sin anomalías detectadas)",
        };
        let escaped_threat_label = Self::escape_md(threat_label);
        let escaped_title = Self::escape_md(&result.title);
        let escaped_url_link = Self::escape_md_url(url);

        let mut text = format!(
            "{} *ANÁLISIS DE NOTICIA COMPLETADO*\n\n\
             \u{1F4F0} *Título:* {}\n\
             \u{1F517} *Enlace original:* [Abrir noticia]({})\n\n\
             \u{26A1} *Nivel de Alerta:* {}\n\
             \u{1F4CA} *Tamaño analizado:* `{}` caracteres",
            threat_icon, escaped_title, escaped_url_link, escaped_threat_label, result.content_length
        );

        if !result.flags.is_empty() {
            text.push_str("\n\n\u{1F50D} *INDICADORES DETECTADOS POR IA:*");
            for flag in result.flags.iter().take(8) {
                let escaped_desc = Self::escape_md(&flag.description);
                let flag_type_str = format!("{}", flag.flag_type);
                let escaped_type = Self::escape_md(&flag_type_str);
                text.push_str(&format!("\n\u{2022} \\[{}\\] {} \\(Confianza: {:.0}%\\)", escaped_type, escaped_desc, flag.confidence * 100.0));
            }
            if result.flags.len() > 8 {
                text.push_str(&format!("\n_\\.\\.\\. y {} indicadores más\\._", result.flags.len() - 8));
            }
        } else {
            text.push_str("\n\n\u{2705} _No se encontraron indicadores significativos de censura o manipulación\\._");
        }

        text.push_str("\n\n💡 *¿Qué significa esto?*\n\
                       Nuestra IA analiza patrones de censura, bloqueo de palabras clave y propaganda gubernamental en la noticia\\. Si se detecta una alerta alta, la noticia se guarda automáticamente de forma inmutable en Solana y Arweave\\.");

        // Action buttons
        let keyboard = InlineKeyboard::new()
            .row(vec![
                InlineButton { text: "\u{1F50D} Escanear Otra".into(), callback_data: "cmd:scan_prompt".into(), url: None },
                InlineButton { text: "\u{1F4CA} Estado del Airdrop".into(), callback_data: "cmd:airdrop".into(), url: None },
            ]);

        self.send_formatted(chat_id, &text, Some(&keyboard)).await
    }
 
    /// Announce a new token launch in the official group.
    pub async fn announce_token_launch(
        &self,
        chat_id: i64,
        name: &str,
        symbol: &str,
        mint: &str,
    ) -> Result<(), String> {
        let terminal_url = format!("https://redacted.bond/terminal/{}", mint);
        let escaped_terminal_url = Self::escape_md_url(&terminal_url);
        let clear_text = format!(
            "\u{1F6A8} *NUEVA TOKENIZACIÓN CREADA* \u{1F6A8}\n\n\
             Se ha lanzado un nuevo activo digital basado en un documento sensible analizado por nuestra IA\\.\n\n\
             \u{1F4D6} *Datos del token:*\n\
             \u{2022} Documento: `{}`\n\
             \u{2022} Ticker: `${}`\n\
             \u{2022} Dirección Mint: `{}`\n\n\
             \u{1F4C8} *Enlaces descriptivos:*\n\
             \u{2022} *[Acceder al Terminal de Trading y Archivo Reconstruido]({})*",
            Self::escape_md(name),
            Self::escape_md(symbol),
            Self::escape_md(mint),
            escaped_terminal_url
        );
        self.send_formatted(chat_id, &clear_text, Some(&Self::main_keyboard())).await
    }

    /// Send airdrop status.
    pub async fn send_airdrop_status(&self, chat_id: i64, eligible: bool, amount_rdx: f64, wallet: Option<&str>) -> Result<(), String> {
        let wallet_line = wallet
            .map(|w| {
                let short = w.chars().take(8).collect::<String>();
                format!("\u{2022} *Wallet registrada:* `{}`", Self::escape_md(&short))
            })
            .unwrap_or_else(|| "\u{2022} *Wallet registrada:* `Ninguna (Registra tu wallet con /airdrop <address>)`".to_string());
        
        let clear_text = format!(
            "\u{1F4CA} *ESTADO DE TU AIRDROP DE $RDX*\n\n\
             \u{2022} *Elegible:* `{}`\n\
             \u{2022} *Asignación estimada:* `{} RDX`\n\
             \u{2022} *Estado de entrega:* `{}`\n\
             {}\n\n\
             \u{1F4DD} *Enlaces descriptivos:*\n\
             \u{2022} *[Registrar o Actualizar tu Wallet en el Dashboard](https://redacted.bond/dashboard)*\n\
             \u{2022} *[Ir al Portal de Redacted Protocol](https://redacted.bond)*",
            if eligible { "SÍ \u{2705}" } else { "NO \u{274C}" },
            amount_rdx,
            if eligible { "PENDIENTE DE LANZAMIENTO" } else { "NO REGISTRADO" },
            wallet_line
        );
        self.send_formatted(chat_id, &clear_text, Some(&Self::main_keyboard())).await
    }

    /// Send system status.
    pub async fn send_system_status(&self, chat_id: i64, user_count: usize) -> Result<(), String> {
        let clear_text = format!(
            "\u{1F4E1} *ESTADO GENERAL DEL PROTOCOLO*\n\n\
             \u{2022} *Agente Inteligente:* `ONLINE (Activo)`\n\
             \u{2022} *Modelos de IA:* `DISPONIBLES (100% de operatividad)`\n\
             \u{2022} *Protocolo de Seguridad:* `ACTIVO`\n\
             \u{2022} *Usuarios Registrados:* `{}`\n\
             \u{2022} *Fuentes de Noticias Monitoreadas:* `7`\n\
             \u{2022} *Airdrop de RDX:* `ACTIVO`\n\n\
             \u{1F310} *Enlaces oficiales:*\n\
             \u{2022} *[Ir al Dashboard Web](https://redacted.bond/dashboard)*\n\
             \u{2022} *[Abrir Web Principal](https://redacted.bond)*",
            user_count
        );
        self.send_formatted(chat_id, &clear_text, Some(&Self::main_keyboard())).await
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
        "*Tokeniza documentos en Solana*

Sube un PDF, una imagen o un informe\\. La IA analiza el contenido y ayuda a crear un activo digital\\.

*Pasos:*
\\- Sube el archivo en el terminal\\.
\\- Revisa el analisis de IA\\.
\\- Crea el token SPL asociado\\.

*Enlaces:*
\\- Terminal para subir documentos: [redacted\\.bond/terminal](https://redacted\\.bond/terminal)
\\- Web principal: [redacted\\.bond](https://redacted\\.bond)

\\#Solana \\#AI \\#RDX",
        "floating_documents",
    ),
    (
        "*Airdrop de RDX*

Registra tu wallet, completa misiones y suma XP dentro de Redacted Protocol\\.

*Como participar:*
\\- Abre el dashboard\\.
\\- Conecta tu wallet de Solana\\.
\\- Revisa tu estado de airdrop y tus misiones\\.

*Enlaces:*
\\- Registro y estado del airdrop: [redacted\\.bond/dashboard](https://redacted\\.bond/dashboard)
\\- Terminal para ganar XP con documentos: [redacted\\.bond/terminal](https://redacted\\.bond/terminal)

\\#Airdrop \\#Solana \\#RDX",
        "circuit_board",
    ),
    (
        "*Analisis de noticias*

Pega aqui el enlace de una noticia y el bot revisara si contiene senales relevantes para el mercado o el ecosistema\\.

*El resultado incluye:*
\\- Titulo de la noticia\\.
\\- Nivel de alerta\\.
\\- Indicadores detectados\\.
\\- Enlace marcado como noticia analizada\\.

*Enlaces:*
\\- Dashboard para ver actividad y XP: [redacted\\.bond/dashboard](https://redacted\\.bond/dashboard)",
        "glitch_interference",
    ),
    (
        "*Misiones y XP*

Cada accion dentro del protocolo puede sumar experiencia\\.

*Acciones principales:*
\\- Check\\-in diario: `+25 XP`
\\- Escanear documentos: `+50 XP`
\\- Invitar usuarios: `+200 XP`

*Enlaces:*
\\- Ver XP, ranking y misiones: [redacted\\.bond/dashboard](https://redacted\\.bond/dashboard)",
        "censored_figure",
    ),
];
