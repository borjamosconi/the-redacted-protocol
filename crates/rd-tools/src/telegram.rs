//! Telegram Bot API client for publishing declassified fragments.
//!
//! All outbound messages use Telegram's `HTML` parse mode and are built from
//! the shared helpers in [`crate::telegram_format`], so every link is
//! explicitly labeled and every dynamic value is escaped.

use crate::telegram_format::{
    escape_html, labeled_link, link, section_title, short_address, short_hash,
    truncate, CHANNEL_URL, DASHBOARD_URL, SITE_URL,
};
use reqwest::Client;
use tracing::info;

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

    /// Send a text message. Caller is responsible for valid HTML.
    pub async fn send_message(&self, text: &str) -> Result<(), String> {
        let url = format!("{}{}/sendMessage", TELEGRAM_API, self.token);

        let body = serde_json::json!({
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
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

    /// Send a readable fragment publication to Telegram.
    pub async fn send_fragment(
        &self,
        file_number: u32,
        reconstructed: &str,
        confidence: f64,
        status: &str,
    ) -> Result<(), String> {
        let confidence_pct = (confidence * 100.0).clamp(0.0, 100.0);
        let body = format!(
            "{title}\n\n\
            {file_label} <code>#RDX-{file:04}</code>\n\
            {status_label} <b>{status}</b>\n\
            {confidence_label} <b>{confidence:.1}%</b>\n\n\
            {content_label}\n\
            <i>\"{snippet}\"</i>\n\n\
            {links_label}\n\
            {channel}\n\
            {site}\n\n\
            #RedactedProtocol #RDX",
            title = section_title("Fragmento reconstruido"),
            file_label = "<b>Archivo:</b>",
            file = file_number,
            status_label = "<b>Estado:</b>",
            status = escape_html(status),
            confidence_label = "<b>Confianza:</b>",
            confidence = confidence_pct,
            content_label = section_title("Contenido reconstruido:"),
            snippet = escape_html(&truncate(reconstructed, 600)),
            links_label = section_title("Enlaces:"),
            channel = labeled_link("Canal oficial de Telegram", CHANNEL_URL),
            site = labeled_link("Web principal", SITE_URL),
        );

        self.send_message(&body).await
    }

    /// Send a system notification.
    pub async fn send_notification(&self, title: &str, detail: &str) -> Result<(), String> {
        let body = format!(
            "{title}\n\n{detail}",
            title = section_title(title),
            detail = escape_html(detail),
        );
        self.send_message(&body).await
    }

    /// Get chat ID from a username or channel.
    pub async fn resolve_chat(&self, username: &str) -> Result<String, String> {
        Ok(username.to_string())
    }

    /// Convenience for callers that already hold a `&TelegramBot` and a mint
    /// to publish a complete anchor summary (news + on-chain + token).
    #[allow(clippy::too_many_arguments)]
    pub async fn send_anchored_summary(
        &self,
        title: &str,
        threat_level: &str,
        confidence: u8,
        original_excerpt: &str,
        reconstructed_excerpt: &str,
        source_url: &str,
        arweave_tx_id: Option<&str>,
        solana_tx_id: Option<&str>,
        fragment_address: Option<&str>,
        token_symbol: Option<&str>,
        terminal_url: Option<&str>,
        image_url: Option<&str>,
    ) -> Result<(), String> {
        let (anchor_label, anchor_value) = match (arweave_tx_id, solana_tx_id) {
            (Some(_), Some(_)) => ("Anclaje en cadena", "Completo (Arweave + Solana)"),
            (Some(_), None) => ("Anclaje en cadena", "Parcial (Arweave)"),
            _ => ("Anclaje en cadena", "Solo local (sin on-chain)"),
        };

        let mut body = String::new();
        body.push_str(&section_title("Documento censurado detectado"));
        body.push_str("\n\n");
        body.push_str(&format!(
            "<b>Titulo:</b> {}\n\
             <b>Nivel de amenaza:</b> <b>{}</b>\n\
             <b>Confianza de la IA:</b> <b>{}%</b>\n\n",
            escape_html(title),
            escape_html(threat_level),
            confidence,
        ));

        body.push_str(&section_title("Noticia original censurada"));
        body.push('\n');
        body.push_str(&escape_html(&truncate(original_excerpt, 320)));
        body.push_str("\n\n");

        body.push_str(&section_title("Reconstruccion"));
        body.push('\n');
        body.push_str(&escape_html(&truncate(reconstructed_excerpt, 420)));
        body.push_str("\n\n");

        body.push_str(&section_title("Enlaces"));
        body.push('\n');
        body.push_str(&labeled_link("Fuente original", source_url));
        if let Some(id) = arweave_tx_id {
            body.push('\n');
            body.push_str(&labeled_link(
                "Archivo permanente (Arweave)",
                &format!("https://arweave.net/{}", id),
            ));
            body.push('\n');
            body.push_str(&labeled_link(
                "Ver transaccion (Viewblock)",
                &format!("https://viewblock.io/arweave/tx/{}", id),
            ));
        }
        if let (Some(tx), Some(addr)) = (solana_tx_id, fragment_address) {
            body.push('\n');
            body.push_str(&labeled_link(
                "Transaccion en Solana",
                &format!("https://explorer.solana.com/tx/{}", tx),
            ));
            body.push('\n');
            body.push_str(&format!(
                "<b>Fragmento:</b> <code>{}</code>",
                short_address(addr)
            ));
        }
        if let (Some(sym), Some(url)) = (token_symbol, terminal_url) {
            body.push('\n');
            body.push_str(&labeled_link(
                &format!("Token ${} en el terminal", sym),
                url,
            ));
        }
        if let Some(img) = image_url {
            body.push('\n');
            body.push_str(&labeled_link("Imagen neural generada", img));
        }

        body.push_str("\n\n");
        body.push_str(&format!(
            "<b>{}:</b> {}\n",
            anchor_label, anchor_value
        ));
        body.push_str(&format!(
            "<i>Reconstruccion generada por IA. Verifica la informacion de forma independiente.</i>"
        ));

        self.send_message(&body).await
    }

    /// Shorthand for sharing a Solana wallet that just interacted.
    pub async fn send_wallet_event(
        &self,
        action: &str,
        wallet: &str,
        amount_sol: Option<f64>,
    ) -> Result<(), String> {
        let mut lines = Vec::new();
        lines.push(section_title("Nueva actividad en el protocolo"));
        lines.push(String::new());
        lines.push(format!("<b>Accion:</b> {}", escape_html(action)));
        lines.push(format!(
            "<b>Wallet:</b> <code>{}</code>",
            short_address(wallet)
        ));
        if let Some(amt) = amount_sol {
            lines.push(format!("<b>Importe:</b> {:.4} SOL", amt));
        }
        lines.push(String::new());
        lines.push(section_title("Enlaces"));
        lines.push(labeled_link("Dashboard del protocolo", DASHBOARD_URL));
        lines.push(labeled_link("Web principal", SITE_URL));
        self.send_message(&lines.join("\n")).await
    }

    /// Build a labeled share link line.
    pub fn link_line(label: &str, url: &str) -> String {
        labeled_link(label, url)
    }

    /// Build a single inline link.
    pub fn link(label: &str, url: &str) -> String {
        link(label, url)
    }

    /// Helper for callers that need to shorten a hash consistently with the
    /// rest of the message templates.
    pub fn short_hash(value: &str) -> String {
        short_hash(value)
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
            "Verificado"
        } else if confidence >= 0.85 {
            "Alta confianza"
        } else {
            "Pendiente de revision"
        };

        self.bot
            .send_fragment(file_number, reconstructed, confidence, status)
            .await
    }
}
