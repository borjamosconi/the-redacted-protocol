//! Autonomous News Reconstruction & Anchoring Engine
//!
//! Full pipeline:
//!   1. Scan news sources from censored regions
//!   2. Detect censorship patterns and flags
//!   3. Reconstruct redacted content via LLM
//!   4. Upload original + reconstruction to Arweave (permanent storage)
//!   5. Submit fragment hash + proof to Solana (NFT anchoring)
//!   6. Broadcast results to all registered Telegram users
//!
//! All steps run autonomously — zero human intervention after startup.

use crate::orchestrator::Orchestrator;
use rd_arweave::{ArweaveClient, AnchoredContent};
use rd_muapi::{MuapiClient, ImageModel, AspectRatio};
use rd_providers::Provider;
use rd_tools::solana::{SolanaClient, FragmentSubmitResult};
use rd_tools::twitter::TwitterClient;
use rd_tools::launch_token::launch_document_token;
use rd_types::image_gen::RedactedStyle;
use sha2::{Sha256, Digest};
use tracing::{info, warn};
use hex;

/// Result of the complete anchoring pipeline
#[derive(Debug, Clone)]
pub struct AnchoredArticle {
    /// Token launch result (if auto-launched)
    pub token_mint: Option<String>,
    pub token_symbol: Option<String>,
    pub terminal_url: Option<String>,
    /// Original article metadata
    pub source_url: String,
    pub title: String,
    pub original_content: String,
    /// LLM reconstruction
    pub reconstructed_content: String,
    pub confidence: u8,
    pub threat_level: String,
    pub redaction_count: usize,
    /// Neural-synthesized image
    pub image_url: Option<String>,
    pub image_model: Option<String>,
    /// On-chain anchoring
    pub arweave_tx_id: Option<String>,
    pub solana_tx_id: Option<String>,
    pub fragment_address: Option<String>,
    /// Content hashes (hex)
    pub content_hash: String,
    pub reconstruction_hash: String,
    /// Whether fully anchored on both systems
    pub is_fully_anchored: bool,
}

/// Autonomous news engine — fully self-operating
pub struct AutonomousNewsEngine {
    /// RSS/HTML sources to monitor (censored regions)
    pub sources: Vec<String>,
    /// How often to poll (seconds)
    pub poll_interval_secs: u64,
    /// Auto-detected topic tags for the article
    pub topic_tags: Vec<String>,
}

impl Default for AutonomousNewsEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl AutonomousNewsEngine {
    pub fn new() -> Self {
        Self {
            sources: vec![
                // ─── CHINA / HK ───
                "https://www.rfa.org/cantonese/news/".to_string(),
                "https://www.rfa.org/mandarin/news/".to_string(),
                "https://chinadigitaltimes.net/feed/".to_string(),
                "https://www.voachinese.com/".to_string(),
                "https://www.bbc.com/zhongwen/simp/world".to_string(),
                // ─── IRAN ───
                "https://www.iranintl.com/".to_string(),
                "https://www.radiofarda.com/".to_string(),
                "https://www.anaj.ir/".to_string(),
                // ─── RUSSIA / OPPOSITION ───
                "https://meduza.io/rss/en".to_string(),
                "https://novayagazeta.eu/".to_string(),
                "https://www.kommersant.ru/rss/news.xml".to_string(),
                // ─── SYRIA ───
                "https://www.syriahr.com/".to_string(),
                "https://www.enabbaladi.net/".to_string(),
                // ─── VENEZUELA / LATAM ───
                "https://www.resumenlatinoamericano.org/feed/".to_string(),
                // ─── WHISTLEBLOWER / DECLASSIFIED ───
                "https://cryptome.org/feed.rss".to_string(),
                "https://theintercept.com/feed/".to_string(),
                "https://www.thegrayzone.com/feed/".to_string(),
                // ─── INVESTIGATIVE ───
                "https://www.propublica.org/feeds/".to_string(),
                "https://www.icij.org/feeds/".to_string(),
                // ─── DEEP STATE / GOVERNMENT ───
                "https://www.cia.gov/rss/".to_string(),
                "https://www.nsa.gov/news/".to_string(),
                "https://www.fbi.gov/news/".to_string(),
                "https://www.defense.gov/News/".to_string(),
            ],
            poll_interval_secs: 1800, // 30 minutes
            topic_tags: vec![
                "censorship".to_string(),
                "redaction".to_string(),
                "free-press".to_string(),
            ],
        }
    }

    /// Full autonomous pipeline.
    ///
    /// `orchestrator` — LLM for reconstruction
    /// `bot` — Telegram for broadcasting
    /// `user_ids` — registered users to notify
    /// `scanner` — news scanner with censorship detection
    /// `muapi` — optional neural media synthesis
    /// `arweave` — optional Arweave client for permanent storage
    /// `solana` — optional Solana client for on-chain anchoring
    ///
    /// Returns number of articles fully processed.
    pub async fn run_autonomous_cycle<P: Provider>(
        &self,
        orchestrator: &mut Orchestrator<P>,
        bot: &rd_tools::telegram_bot::TelegramBot,
        user_ids: &[i64],
        scanner: &mut rd_types::news::NewsScanner,
        muapi: Option<&MuapiClient>,
        arweave: Option<&ArweaveClient>,
        solana: Option<&SolanaClient>,
        twitter: Option<&TwitterClient>,
    ) -> usize {
        if user_ids.is_empty() {
            info!("Autonomous scan skipped — no registered users");
            return 0;
        }

        let mut processed = 0;

        // Collect sources not yet scanned
        let unseen: Vec<String> = self.sources.iter()
            .filter(|url| !scanner.is_seen(url))
            .map(|url| url.to_string())
            .collect();

        if unseen.is_empty() {
            info!("Autonomous scan: all sources scanned, cycle complete");
            return 0;
        }

        info!("═══ AUTONOMOUS SCAN: {} new sources ═══", unseen.len());

        for url in unseen {
            match scanner.scan_url(&url).await {
                Ok(result) => {
                    // Trigger on: flagged, critical, or 2+ conspiracy flags
                    let should_process = result.threat_level == rd_types::news::ThreatLevel::Flagged
                        || result.threat_level == rd_types::news::ThreatLevel::Critical
                        || result.flags.len() >= 2;

                    if !should_process {
                        continue;
                    }

                    info!(
                        "🚨 CENSORSHIP DETECTED — {} (threat: {:?}, {} flags)",
                        url, result.threat_level, result.flags.len()
                    );

                    // ── Step 1: Fetch full article ──
                    let (title, content) = match scanner.fetch_article(&url).await {
                        Ok(pair) => pair,
                        Err(e) => {
                            warn!("Failed to fetch article {}: {}", url, e);
                            continue;
                        }
                    };

                    // ── Step 2: Reconstruct with LLM ──
                    let reconstruction = match self.reconstruct(&title, &content, orchestrator).await {
                        Ok(r) => r,
                        Err(e) => {
                            warn!("Reconstruction failed for {}: {}", url, e);
                            self.broadcast_alert(bot, user_ids, &url, &result).await;
                            processed += 1;
                            continue;
                        }
                    };

                    // ── Step 3: Synthesize neural media (optional, non-blocking) ──
                    let (image_url, image_model) = if let Some(client) = muapi {
                        match self.generate_image(client, &title, &reconstruction.reconstructed_content).await {
                            Ok((u, m)) => (Some(u), Some(m)),
                            Err(e) => {
                                warn!("Image gen failed: {}", e);
                                (None, None)
                            }
                        }
                    } else {
                        (None, None)
                    };

                    // ── Step 4: Compute content hashes ──
                    let content_hash = Self::sha256_hex(&content);
                    let reconstruction_hash = Self::sha256_hex(&reconstruction.reconstructed_content);

                    // ── Step 5: Upload to Arweave (permanent storage) ──
                    let arweave_tx_id = if let Some(aw) = arweave {
                        match self.upload_to_arweave(aw, &url, &title, &content,
                            &reconstruction.reconstructed_content, reconstruction.confidence,
                            &reconstruction.threat_level.clone(), reconstruction.redaction_count,
                            &content_hash, &reconstruction_hash).await {
                            Ok(tx_id) => {
                                info!("Uploaded to Arweave: {}", tx_id);
                                Some(tx_id)
                            }
                            Err(e) => {
                                warn!("Arweave upload failed (continuing without): {}", e);
                                None
                            }
                        }
                    } else {
                        None
                    };

                    // ── Step 6: Anchor on Solana (NFT) ──
                    let (solana_tx_id, fragment_address) = if let (Some(sol), Some(ref aw_tx)) = (solana, &arweave_tx_id) {
                        match self.anchor_on_solana(sol, &content_hash, &reconstruction_hash,
                            aw_tx, reconstruction.confidence).await {
                            Ok(result) => {
                                info!("Anchored on Solana: tx={}", result.tx_signature.0);
                                (Some(result.tx_signature.0), Some(result.fragment_address))
                            }
                            Err(e) => {
                                warn!("Solana anchor failed (continuing without): {}", e);
                                (None, None)
                            }
                        }
                    } else {
                        (None, None)
                    };

                    let is_fully_anchored = arweave_tx_id.is_some() && solana_tx_id.is_some();

                    // ── Step 7: Broadcast to all users ──
                    // ── Step 8: Auto-launch document as token ──
                    let (token_mint, token_symbol, terminal_url) = {
                        let auto_launch = std::env::var("AGENT_AUTO_LAUNCH_TOKENS")
                            .map(|v| v == "1" || v.to_lowercase() == "true")
                            .unwrap_or(true); // on by default

                        if auto_launch {
                            let ticker = Self::make_ticker(&title);
                            let threat_cat = match reconstruction.threat_level.as_str() {
                                "Critical" => "CLASSIFIED",
                                "Flagged"  => "LEAKED",
                                _          => "SUPPRESSED",
                            };
                            match launch_document_token(
                                &title,
                                &ticker,
                                &reconstruction.reconstructed_content.chars().take(200).collect::<String>(),
                                threat_cat,
                                image_url.as_deref(),
                                Some(&url),
                                reconstruction.confidence,
                            ).await {
                                Ok(result) if !result.duplicate => {
                                    info!(
                                        "🚀 Token launched: ${} — {} | {}",
                                        result.symbol, result.mint, result.terminal_url
                                    );
                                    (Some(result.mint), Some(result.symbol), Some(result.terminal_url))
                                }
                                Ok(result) => {
                                    info!("Token already exists: ${}", result.symbol);
                                    (Some(result.mint), Some(result.symbol), Some(result.terminal_url))
                                }
                                Err(e) => {
                                    warn!("Auto-launch failed (continuing): {}", e);
                                    (None, None, None)
                                }
                            }
                        } else {
                            (None, None, None)
                        }
                    };

                    let anchored = AnchoredArticle {
                        source_url: url.clone(),
                        title,
                        original_content: content.chars().take(300).collect(),
                        reconstructed_content: reconstruction.reconstructed_content.clone(),
                        confidence: reconstruction.confidence,
                        threat_level: reconstruction.threat_level,
                        redaction_count: reconstruction.redaction_count,
                        image_url,
                        image_model,
                        arweave_tx_id,
                        solana_tx_id,
                        fragment_address,
                        content_hash,
                        reconstruction_hash,
                        is_fully_anchored,
                        token_mint,
                        token_symbol,
                        terminal_url,
                    };

                    self.broadcast_anchored_article(bot, user_ids, &anchored, twitter).await;
                    processed += 1;
                }
                Err(e) => {
                    warn!("Scan failed for {}: {}", url, e);
                }
            }
        }

        info!("═══ AUTONOMOUS CYCLE COMPLETE: {} articles processed ═══", processed);
        processed
    }

    /// Step 2: LLM reconstruction
    async fn reconstruct<P: Provider>(
        &self,
        title: &str,
        content: &str,
        orchestrator: &mut Orchestrator<P>,
    ) -> Result<ReconstructedArticle, String> {
        let redaction_count = Self::count_redactions(content);

        // Smart prompt: reconstruct censored text
        let prompt = format!(
            "You are a journalist and historian analyzing a news article that has been CENSORED or REDACTED by a government or authority.\n\n\
            TITLE: {}\n\n\
            ARTICLE CONTENT:\n{}\n\n\
            YOUR TASK:\n1. Identify ALL redacted/censored sections (marked with ▓, █, [REDACTED], [CLASSIFIED], xxxx, etc.)\n2. Using context, journalistic style, historical facts, and logical inference — RECONSTRUCT what the original text most likely said\n3. Rate your confidence (0-100) based on how much was redacted and how inferrable it is\n\n\
            Respond ONLY with valid JSON (no markdown, no commentary):\n\
            {{\"reconstruction\": \"<your best reconstruction of the original text>\", \
            \"confidence\": <0-100>, \
            \"threat_level\": \"<Safe|Suspicious|Flagged|Critical based on the severity of censorship>\", \
            \"reasoning\": \"<brief explanation of your reconstruction choices>\"}}",
            title, content
        );

        let summary = orchestrator.run_turn(&prompt).await
            .map_err(|e| format!("Orchestrator error: {:?}", e))?;
        let response_text: String = summary.assistant_blocks.iter()
            .filter_map(|b| {
                if let rd_types::block::ContentBlock::Text { text } = b { Some(text.clone()) } else { None }
            })
            .collect::<Vec<_>>()
            .join("\n");

        let (reconstructed, confidence, reasoning) = Self::parse_llm_json(&response_text)?;

        let threat = Self::classify_threat(&reconstructed, &reasoning);

        info!("Reconstruction: confidence={}, threat={}", confidence, threat);

        Ok(ReconstructedArticle {
            reconstructed_content: reconstructed,
            confidence,
            reasoning,
            threat_level: threat,
            redaction_count,
        })
    }

    /// Parse JSON from LLM response
    fn parse_llm_json(text: &str) -> Result<(String, u8, String), String> {
        let text = text.trim();
        
        // Find the first '{'
        let start = text.find('{').ok_or_else(|| {
            format!("No JSON object found in response: {}", &text[..text.len().min(100)])
        })?;
        let json_part = &text[start..];

        let mut stream = serde_json::Deserializer::from_str(json_part).into_iter::<serde_json::Value>();
        if let Some(Ok(json_val)) = stream.next() {
            let reconstruction = json_val.get("reconstruction")
                .and_then(|v| v.as_str())
                .unwrap_or("[RECONSTRUCTION FAILED]")
                .to_string();

            let confidence = json_val.get("confidence")
                .and_then(|v| v.as_u64())
                .map(|c| c.min(100) as u8)
                .unwrap_or(50);

            let reasoning = json_val.get("reasoning")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            return Ok((reconstruction, confidence, reasoning));
        }

        Err("Failed to parse JSON object from LLM response".to_string())
    }

    /// Generate a short ticker symbol from a document title
    /// e.g. "Epstein Flight Logs Vol.2" → "EPST2"
    fn make_ticker(title: &str) -> String {
        // Remove common stop words, take first letters of remaining words
        let stop = ["the", "a", "an", "of", "in", "on", "at", "to", "for",
                    "and", "or", "vol", "volume", "part", "file", "files",
                    "document", "documents", "report", "operation"];

        let words: Vec<&str> = title.split_whitespace()
            .filter(|w| {
                let lc = w.to_lowercase();
                let clean: String = lc.chars().filter(|c| c.is_alphabetic()).collect();
                !stop.contains(&clean.as_str()) && !clean.is_empty()
            })
            .collect();

        // Take first 4 words, first 1-2 letters each
        let ticker: String = words.iter()
            .take(4)
            .flat_map(|w| {
                w.chars()
                 .filter(|c| c.is_alphanumeric())
                 .take(2)
            })
            .collect::<String>()
            .to_uppercase();

        // Ensure it's 3-8 chars
        let t = if ticker.len() < 3 {
            format!("{}XX", ticker)
        } else {
            ticker[..ticker.len().min(8)].to_string()
        };

        // Append single digit hash to reduce collisions
        let h: u8 = title.bytes().fold(0u8, |acc, b| acc.wrapping_add(b)) % 10;
        format!("{}{}", t, h)
    }

    /// Classify threat level from reconstruction
    fn classify_threat(reconstructed: &str, _reasoning: &str) -> String {
        let lower = reconstructed.to_lowercase();
        let critical_terms = ["massacre", "mass killing", "torture", "illegal", "cover-up",
            "suppressed", "whistleblower", "leaked", "indigenous genocide", "war crimes"];
        let flagged_terms = ["censored", "redacted", "classified", "suppressed", "denied"];

        if critical_terms.iter().any(|t| lower.contains(t)) {
            "Critical".to_string()
        } else if flagged_terms.iter().any(|t| lower.contains(t)) {
            "Flagged".to_string()
        } else {
            "Suspicious".to_string()
        }
    }

    /// Count visible redaction markers
    fn count_redactions(content: &str) -> usize {
        let markers = ["▓", "█", "░", "[REDACTED]", "[CLASSIFIED]", "[CENSORED]",
            "xxxx", "XXXX", "......"];
        markers.iter()
            .map(|m| content.matches(m).count())
            .sum::<usize>()
            .max(1) // at least 1 if content exists
    }

    /// Compute SHA-256 hash (hex)
    fn sha256_hex(data: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Step 3: Synthesize neural media
    async fn generate_image(
        &self,
        client: &MuapiClient,
        title: &str,
        content: &str,
    ) -> Result<(String, String), String> {
        let snippet = &content[..content.len().min(200)];
        let prompt = format!(
            "dark dystopian news illustration: {} — {} \
            -- cyberpunk aesthetic, holographic interference bars, floating classified documents, \
            dark grid background, cinematic lighting, mysterious atmosphere, photorealistic, 8k",
            title, snippet
        );
        let style = RedactedStyle::ClassifiedDoc;
        let result = client
            .generate_image(&style.prompt(&prompt), ImageModel::FluxDev, Some(AspectRatio::Landscape))
            .await
            .map_err(|e| format!("Muapi error: {}", e))?;
        Ok((result.url, result.model))
    }

    /// Step 5: Upload content to Arweave
    async fn upload_to_arweave(
        &self,
        client: &ArweaveClient,
        source_url: &str,
        title: &str,
        original: &str,
        reconstructed: &str,
        confidence: u8,
        threat_level: &str,
        redaction_count: usize,
        content_hash: &str,
        reconstruction_hash: &str,
    ) -> Result<String, String> {
        let anchored = AnchoredContent {
            source_url: source_url.to_string(),
            title: title.to_string(),
            original_content: original.to_string(),
            reconstructed_content: reconstructed.to_string(),
            confidence,
            threat_level: threat_level.to_string(),
            redaction_count,
            content_hash: content_hash.to_string(),
            reconstruction_hash: reconstruction_hash.to_string(),
            anchored_at: chrono::Utc::now().timestamp(),
            protocol_version: "1.0.0".to_string(),
        };

        let tx_id = client.upload_content(&anchored).await?;
        Ok(tx_id.0)
    }

    /// Step 6: Anchor fragment hash on Solana
    async fn anchor_on_solana(
        &self,
        client: &SolanaClient,
        content_hash: &str,
        reconstruction_hash: &str,
        arweave_tx_id: &str,
        confidence: u8,
    ) -> Result<FragmentSubmitResult, String> {
        client.submit_fragment(
            content_hash,
            reconstruction_hash,
            arweave_tx_id,
            confidence,
            self.topic_tags.clone(),
        ).await
    }

    /// Broadcast an alert when reconstruction fails but censorship is detected
    async fn broadcast_alert(
        &self,
        bot: &rd_tools::telegram_bot::TelegramBot,
        user_ids: &[i64],
        url: &str,
        result: &rd_types::news::NewsAnalysisResult,
    ) {
        let flags = result.flags.iter()
            .map(|f| format!("  • {} ({:.0}%)", f.description, f.confidence * 100.0))
            .collect::<Vec<_>>()
            .join("\n");

        let msg = format!(
            "🚨 CENSORSHIP ALERT — autonomous detection\n\n\
            Source: {}\n\
            Threat: {:?}\n\
            Flags ({}):\n{}\n\n\
            ⚠️ LLM reconstruction unavailable — fragment saved locally\n\
            Will retry on next cycle.\n\n\
            _The file is breathing._",
            url, result.threat_level, result.flags.len(), flags
        );

        for &uid in user_ids {
            bot.send_safe(uid, &msg).await.ok();
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        }
    }

    /// Broadcast a fully anchored article with all proof data
    async fn broadcast_anchored_article(
        &self,
        bot: &rd_tools::telegram_bot::TelegramBot,
        user_ids: &[i64],
        article: &AnchoredArticle,
        twitter: Option<&TwitterClient>,
    ) {
        let anchor_status = if article.is_fully_anchored {
            "✅ FULLY ANCHORED (Arweave + Solana)"
        } else if article.arweave_tx_id.is_some() {
            "🔶 PARTIALLY ANCHORED (Arweave only)"
        } else {
            "⚠️ LOCAL ONLY (not on-chain)"
        };

        let img_note = article.image_url.as_ref()
            .map(|u| format!("\n🖼️ Neural Image: {}", u))
            .unwrap_or_default();

        let arweave_note = article.arweave_tx_id.as_ref()
            .map(|id| format!("\n🌐 Source (Download): https://arweave.net/{}\n👁️ Source (View): https://viewblock.io/arweave/tx/{}", id, id))
            .unwrap_or_default();

        let solana_note = if let (Some(ref tx), Some(ref addr)) = (&article.solana_tx_id, &article.fragment_address) {
            format!("\n⛓️ Solana: tx={} | fragment={}", &tx[..min(tx.len(), 16)], addr)
        } else {
            String::new()
        };

        let token_note = if let (Some(ref sym), Some(ref url)) = (&article.token_symbol, &article.terminal_url) {
            format!("\n\n🚀 TOKEN LAUNCHED: ${} — Trade: {}", sym, url)
        } else {
            String::new()
        };

        let threat_emoji = match article.threat_level.as_str() {
            "Critical" => "🔴",
            "Flagged" => "🟠",
            _ => "🟡",
        };

        let msg = format!(
            "{} DECLASSIFIED — AUTONOMOUS SCAN\n\n\
            {} — Confidence: {}%\n\n\
            📰 {}\n\n\
            === ORIGINAL (CENSORED) ===\n{}\n\n\
            === RECONSTRUCTED ===\n{}{}{}{}{}\n\n\
            🔑 Content Hash: {}\n\n\
            {}\n\n\
            ⚠️ Inference-powered reconstruction — verify independently\n\
            _The file is breathing._",
            threat_emoji,
            article.threat_level,
            article.confidence,
            article.title,
            if article.original_content.len() > 300 {
                format!("{}...", &article.original_content[..300])
            } else {
                article.original_content.clone()
            },
            if article.reconstructed_content.len() > 400 {
                format!("{}...", &article.reconstructed_content[..400])
            } else {
                article.reconstructed_content.clone()
            },
            img_note,
            arweave_note,
            solana_note,
            token_note,
            &article.content_hash[..min(article.content_hash.len(), 32)],
            anchor_status,
        );

        for &uid in user_ids {
            let sent = if let (Some(ref img_url), true) = (&article.image_url, article.image_url.is_some()) {
                // Try photo first
                if bot.send_photo(uid, img_url, &msg).await.is_ok() {
                    true
                } else {
                    bot.send_safe(uid, &msg).await.is_ok()
                }
            } else {
                bot.send_safe(uid, &msg).await.is_ok()
            };
            if sent {
                info!("Broadcast to user {}", uid);
            }
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        }

        // Broadcast to X (Twitter)
        if let Some(x_client) = twitter {
            let x_msg = format!(
                "{} DECLASSIFIED: {}\n\n{}\n\nConfidence: {}%\n\n_The file is breathing._ #Solana #Neural #Redacted",
                threat_emoji,
                article.title,
                if article.reconstructed_content.len() > 180 {
                    format!("{}...", &article.reconstructed_content[..180])
                } else {
                    article.reconstructed_content.clone()
                },
                article.confidence
            );
            let _ = x_client.post_tweet(&x_msg).await;
        }
    }
}

/// Intermediate reconstruction result
#[allow(dead_code)]
struct ReconstructedArticle {
    reconstructed_content: String,
    confidence: u8,
    reasoning: String,
    threat_level: String,
    redaction_count: usize,
}

fn min(a: usize, b: usize) -> usize {
    if a < b { a } else { b }
}
