//! News Intelligence types — shared across all crates.
//!
//! Provides threat analysis of news articles using pattern matching,
//! RSS feed aggregation, and URL-based scanning.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashSet;
use std::time::SystemTime;

/// Threat level based on conspiracy indicators.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThreatLevel {
    Safe,
    Suspicious,
    Flagged,
    Critical,
}

impl ThreatLevel {
    pub fn icon(&self) -> &'static str {
        match self {
            Self::Safe => "\u{2705}",
            Self::Suspicious => "\u{26A0}\u{FE0F}",
            Self::Flagged => "\u{1F6A8}",
            Self::Critical => "\u{1F534}",
        }
    }

    pub fn color(&self) -> &'static str {
        match self {
            Self::Safe => "green",
            Self::Suspicious => "yellow",
            Self::Flagged => "orange",
            Self::Critical => "red",
        }
    }
}

/// Flag type for news analysis.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FlagType {
    RedactionMarker,
    ClassifiedLanguage,
    CoverUpPattern,
    Contradiction,
    PatternMatch,
    SourceReliability,
    TemporalCluster,
    UnusualFraming,
    DocumentReference,
    GeoAnomaly,
    TimingSuspicion,
}

impl std::fmt::Display for FlagType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::RedactionMarker => write!(f, "REDACTION"),
            Self::ClassifiedLanguage => write!(f, "CLASSIFIED"),
            Self::CoverUpPattern => write!(f, "COVER-UP"),
            Self::Contradiction => write!(f, "CONTRADICTION"),
            Self::PatternMatch => write!(f, "PATTERN"),
            Self::SourceReliability => write!(f, "SOURCE"),
            Self::TemporalCluster => write!(f, "TEMPORAL"),
            Self::UnusualFraming => write!(f, "FRAMING"),
            Self::DocumentReference => write!(f, "DOCUMENT"),
            Self::GeoAnomaly => write!(f, "GEO-ANOMALY"),
            Self::TimingSuspicion => write!(f, "TIMING"),
        }
    }
}

/// Individual flag raised by detection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsFlag {
    pub flag_type: FlagType,
    pub description: String,
    pub confidence: f64,
    pub context: String,
}

/// RSS Feed source definition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedSource {
    pub name: String,
    pub url: String,
    pub category: FeedCategory,
    pub enabled: bool,
    pub last_polled: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FeedCategory {
    WorldNews,
    Investigative,
    Government,
    Intelligence,
    Alternative,
    CensoredRegions,
    Whistleblower,
}

/// Parsed RSS article.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RssArticle {
    pub title: String,
    pub link: String,
    pub description: String,
    pub pub_date: Option<DateTime<Utc>>,
    pub source: String,
}

/// Result of a news analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsAnalysisResult {
    pub url: String,
    pub title: String,
    pub threat_level: ThreatLevel,
    pub flags: Vec<NewsFlag>,
    pub analyzed_at: DateTime<Utc>,
    pub content_length: usize,
}

impl NewsAnalysisResult {
    pub fn summary(&self) -> String {
        format!(
            "{} {} — {:?} ({} flags)",
            self.threat_level.icon(),
            self.title,
            self.threat_level,
            self.flags.len()
        )
    }

    pub fn detailed_report(&self) -> String {
        let mut report = String::new();
        report.push_str("=== NEWS ANALYSIS REPORT ===\n\n");
        report.push_str(&format!("URL: {}\n", self.url));
        report.push_str(&format!("Title: {}\n", self.title));
        report.push_str(&format!("Threat Level: {:?} {}\n", self.threat_level, self.threat_level.icon()));
        report.push_str(&format!("Content Length: {} chars\n", self.content_length));
        report.push_str(&format!("Flags Raised: {}\n\n", self.flags.len()));

        if !self.flags.is_empty() {
            report.push_str("--- FLAGS ---\n\n");
            for flag in &self.flags {
                report.push_str(&format!(
                    "[{}] {} ({:.0}%)\n  {}\n\n",
                    flag.flag_type,
                    flag.description,
                    flag.confidence * 100.0,
                    flag.context
                ));
            }
        }

        report.push_str(&format!("Analyzed at: {}\n", self.analyzed_at.format("%Y-%m-%d %H:%M:%S UTC")));
        report
    }
}

/// Conspiracy pattern database.
pub struct ConspiracyPatterns {
    pub keywords: HashSet<String>,
    pub redaction_patterns: Vec<regex::Regex>,
    pub coverup_phrases: Vec<String>,
    pub classified_terms: Vec<String>,
    pub geo_anomaly_terms: Vec<String>,
    pub timing_terms: Vec<String>,
}

impl ConspiracyPatterns {
    pub fn new() -> Self {
        let keywords: HashSet<String> = [
            "deep state", "false flag", "black budget", "covert operation",
            "plausible deniability", "need to know", "eyes only",
            "compartmentalized", "SCI", "TS/SCI", "NOFORN",
            "special access", "black project", "undisclosed location",
            "enhanced interrogation", "extraordinary rendition",
            "mass surveillance", "data retention", "backdoor",
            "psyop", "controlled opposition", "limited hangout",
            "managed democracy", "astroturf", "concern trolling",
            "whisper campaign", "limited disclosure", "gradual reveal",
            "predictive programming", "problem reaction solution",
            "crisis actor", "crisis exploitation", "manufactured consent",
            "shadow government", "parallel structure", "staying behind",
            "stay-behind", "operation gladio", "mockingbird",
            "operation mockingbird", "mk ultra", "mkultra",
            "paperclip", "operation paperclip", "northwoods",
            "gulf of tonkin", "tonkin incident",
            "false narrative", "alternative facts", "disinformation",
            "counter-narrative", "narrative control", "information warfare",
            "cognitive warfare", "influence operation",
        ].into_iter().map(String::from).collect();

        let redaction_patterns: Vec<regex::Regex> = vec![
            regex::Regex::new(r"\u{2588}+").unwrap(),
            regex::Regex::new(r"\[REDACTED\]").unwrap(),
            regex::Regex::new(r"\[CLASSIFIED\]").unwrap(),
            regex::Regex::new(r"\[CENSORED\]").unwrap(),
            regex::Regex::new(r"[\u{2588}\u{2593}\u{2592}\u{2591}]{3,}").unwrap(),
            regex::Regex::new(r"black(?:ed)? out").unwrap(),
            regex::Regex::new(r"redacted|expunged|sealed|classified").unwrap(),
            regex::Regex::new(r"withheld|suppressed|removed|deleted").unwrap(),
        ];

        let coverup_phrases: Vec<String> = [
            "declined to comment", "no comment", "sources close to",
            "according to unnamed sources", "refused to confirm or deny",
            "neither confirmed nor denied", "on condition of anonymity",
            "sources familiar with", "people with knowledge of",
            "a source familiar with", "according to a person familiar",
            "allegedly", "reportedly", "purportedly",
            "documents suggest", "leaked documents indicate",
            "it is believed that", "sources say", "insiders claim",
            "officials familiar with", "people briefed on",
            "according to officials", "sources told",
            "speaking on condition of anonymity",
        ].into_iter().map(String::from).collect();

        let classified_terms: Vec<String> = [
            "classified", "secret", "top secret", "confidential",
            "restricted", "sensitive", "privileged", "proprietary",
            "internal use only", "do not distribute", "need-to-know basis",
            "eyes only", "for official use only", "FOUO",
            "SCI", "special compartmented information",
            "TS/SCI", "top secret sensitive compartmented information",
            "NOFORN", "not releasable to foreign nationals",
            "ORCON", "originator controlled",
        ].into_iter().map(String::from).collect();

        let geo_anomaly_terms: Vec<String> = [
            "undisclosed location", "secret facility", "black site",
            "classified location", "remote facility", "undisclosed facility",
            "secure location", "safe house", "underground facility",
            "underground bunker", "secure compound", "off-site location",
        ].into_iter().map(String::from).collect();

        let timing_terms: Vec<String> = [
            "conveniently", "timed to", "coincidentally", "just as",
            "right before", "shortly after", "in the wake of",
            "following the", "amid", "against the backdrop",
            "in the aftermath", "on the eve of",
        ].into_iter().map(String::from).collect();

        Self { keywords, redaction_patterns, coverup_phrases, classified_terms, geo_anomaly_terms, timing_terms }
    }
}

impl Default for ConspiracyPatterns {
    fn default() -> Self { Self::new() }
}

/// News scanner — fetches and analyzes articles.
pub struct NewsScanner {
    client: reqwest::Client,
    patterns: ConspiracyPatterns,
    pub seen_urls: HashSet<String>,
    pub feed_sources: Vec<FeedSource>,
}

impl Default for NewsScanner {
    fn default() -> Self { Self::new() }
}

impl NewsScanner {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .user_agent("RedactedProtocol/1.0 (+https://redacted-protocol.vercel.app)")
                .timeout(std::time::Duration::from_secs(15))
                .build()
                .unwrap_or_default(),
            patterns: ConspiracyPatterns::new(),
            seen_urls: HashSet::new(),
            feed_sources: Self::default_feeds(),
        }
    }

    pub fn with_feeds(mut self, feeds: Vec<FeedSource>) -> Self {
        self.feed_sources = feeds;
        self
    }

    /// Default RSS feed sources for intelligence monitoring.
    /// Sources from regions with known government censorship.
    fn default_feeds() -> Vec<FeedSource> {
        vec![
            // ─── CHINA / HK ───
            FeedSource { name: "RFA Cantonese".into(), url: "https://www.rfa.org/cantonese/news/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            FeedSource { name: "RFA Mandarin".into(), url: "https://www.rfa.org/mandarin/news/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            FeedSource { name: "China Digital Times".into(), url: "https://chinadigitaltimes.net/feed/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            FeedSource { name: "VOA Chinese".into(), url: "https://www.voachinese.com/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            // ─── IRAN ───
            FeedSource { name: "Iran International".into(), url: "https://www.iranintl.com/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            FeedSource { name: "Radio Farda".into(), url: "https://www.radiofarda.com/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            FeedSource { name: "Anaj".into(), url: "https://www.anaj.ir/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            // ─── RUSSIA ───
            FeedSource { name: "Meduza".into(), url: "https://meduza.io/rss/en".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            FeedSource { name: "Novaya Gazeta".into(), url: "https://novayagazeta.eu/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            FeedSource { name: "Kommersant".into(), url: "https://www.kommersant.ru/rss/news.xml".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            // ─── SYRIA ───
            FeedSource { name: "Syrian Human Rights".into(), url: "https://www.syriahr.com/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            FeedSource { name: "Enab Baladi".into(), url: "https://www.enabbaladi.net/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            // ─── VENEZUELA / LATAM ───
            FeedSource { name: "Resumen Latino".into(), url: "https://www.resumenlatinoamericano.org/feed/".into(), category: FeedCategory::CensoredRegions, enabled: true, last_polled: None },
            // ─── WHISTLEBLOWER ───
            FeedSource { name: "Cryptome".into(), url: "https://cryptome.org/feed.rss".into(), category: FeedCategory::Whistleblower, enabled: true, last_polled: None },
            FeedSource { name: "The Intercept".into(), url: "https://theintercept.com/feed/".into(), category: FeedCategory::Investigative, enabled: true, last_polled: None },
            FeedSource { name: "The Grayzone".into(), url: "https://www.thegrayzone.com/feed/".into(), category: FeedCategory::Whistleblower, enabled: true, last_polled: None },
            // ─── INVESTIGATIVE ───
            FeedSource { name: "ProPublica".into(), url: "https://www.propublica.org/feeds/".into(), category: FeedCategory::Investigative, enabled: true, last_polled: None },
            FeedSource { name: "ICIJ".into(), url: "https://www.icij.org/feeds/".into(), category: FeedCategory::Investigative, enabled: true, last_polled: None },
            // ─── GOVERNMENT / DEEP STATE ───
            FeedSource { name: "CIA FOIA".into(), url: "https://www.cia.gov/rss/".into(), category: FeedCategory::Government, enabled: true, last_polled: None },
            FeedSource { name: "NSA".into(), url: "https://www.nsa.gov/news/".into(), category: FeedCategory::Intelligence, enabled: true, last_polled: None },
            FeedSource { name: "FBI".into(), url: "https://www.fbi.gov/news/".into(), category: FeedCategory::Government, enabled: true, last_polled: None },
            FeedSource { name: "DoD".into(), url: "https://www.defense.gov/News/".into(), category: FeedCategory::Government, enabled: true, last_polled: None },
        ]
    }

    /// Analyze text for conspiracy/censorship indicators.
    pub async fn analyze(&self, title: &str, content: &str) -> Vec<NewsFlag> {
        let mut flags = Vec::new();
        let full_text = format!("{} {}", title, content).to_lowercase();

        // Redaction markers (highest confidence)
        for pattern in &self.patterns.redaction_patterns {
            if let Some(m) = pattern.find(&full_text) {
                flags.push(NewsFlag {
                    flag_type: FlagType::RedactionMarker,
                    description: "Redaction/censorship markers detected".into(),
                    confidence: 0.95,
                    context: full_text[m.start()..(m.start() + 50).min(full_text.len())].to_string(),
                });
            }
        }

        // Classified terminology
        for term in &self.patterns.classified_terms {
            if full_text.contains(&term.to_lowercase()) {
                flags.push(NewsFlag {
                    flag_type: FlagType::ClassifiedLanguage,
                    description: format!("Classified terminology: '{}'", term),
                    confidence: 0.7,
                    context: term.clone(),
                });
            }
        }

        // Cover-up patterns
        for phrase in &self.patterns.coverup_phrases {
            if full_text.contains(&phrase.to_lowercase()) {
                flags.push(NewsFlag {
                    flag_type: FlagType::CoverUpPattern,
                    description: format!("Cover-up language: '{}'", phrase),
                    confidence: 0.65,
                    context: phrase.clone(),
                });
            }
        }

        // Conspiracy keyword matches
        for keyword in &self.patterns.keywords {
            if full_text.contains(&keyword.to_lowercase()) {
                flags.push(NewsFlag {
                    flag_type: FlagType::PatternMatch,
                    description: format!("Conspiracy keyword match: '{}'", keyword),
                    confidence: 0.6,
                    context: keyword.clone(),
                });
            }
        }

        // Geographic anomalies
        for term in &self.patterns.geo_anomaly_terms {
            if full_text.contains(&term.to_lowercase()) {
                flags.push(NewsFlag {
                    flag_type: FlagType::GeoAnomaly,
                    description: format!("Geographic anomaly: '{}'", term),
                    confidence: 0.65,
                    context: term.clone(),
                });
            }
        }

        // Timing suspicions
        for term in &self.patterns.timing_terms {
            if full_text.contains(&term.to_lowercase()) {
                flags.push(NewsFlag {
                    flag_type: FlagType::TimingSuspicion,
                    description: format!("Suspicious timing language: '{}'", term),
                    confidence: 0.5,
                    context: term.clone(),
                });
            }
        }

        // Passive voice analysis
        let passive_indicators = ["was", "were", "been", "has been", "had been"];
        let passive_count = passive_indicators.iter().filter(|&&w| full_text.contains(w)).count();
        if passive_count >= 5 {
            flags.push(NewsFlag {
                flag_type: FlagType::UnusualFraming,
                description: "Heavy passive voice — may indicate evasion".into(),
                confidence: 0.4,
                context: format!("{} passive constructions", passive_count),
            });
        }

        // Deduplicate flags of the same type (keep highest confidence)
        flags.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        let mut seen_types = HashSet::new();
        let mut deduped = Vec::new();
        for flag in flags {
            if !seen_types.contains(&flag.flag_type) {
                seen_types.insert(flag.flag_type);
                deduped.push(flag);
            }
        }

        deduped
    }

    /// Calculate threat level from flags.
    pub fn calculate_threat(flags: &[NewsFlag]) -> ThreatLevel {
        if flags.is_empty() { return ThreatLevel::Safe; }
        let max_confidence = flags.iter().map(|f| f.confidence).fold(0.0_f64, f64::max);
        let flag_count = flags.len();
        let has_critical = flags.iter().any(|f| f.confidence >= 0.9);

        if has_critical && flag_count >= 3 { ThreatLevel::Critical }
        else if max_confidence >= 0.7 && flag_count >= 2 { ThreatLevel::Flagged }
        else if !flags.is_empty() { ThreatLevel::Suspicious }
        else { ThreatLevel::Safe }
    }

    /// Fetch and parse an article from a URL.
    pub async fn fetch_article(&self, url: &str) -> Result<(String, String), String> {
        // SSRF protection: validate URL before fetching
        Self::validate_url(url).await?;

        let resp = self.client.get(url)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .send().await
            .map_err(|e| format!("HTTP: {}", e))?;
        let html = resp.text().await.map_err(|e| format!("Text: {}", e))?;
        let title = extract_title(&html).unwrap_or_default();
        let content = extract_text(&html).unwrap_or_default();
        Ok((title, content))
    }

    /// Validate URL to prevent SSRF attacks.
    /// Resolves DNS before checking to prevent DNS rebinding attacks.
    async fn validate_url(url: &str) -> Result<(), String> {
        let parsed = url::Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;

        if parsed.scheme() != "http" && parsed.scheme() != "https" {
            return Err("Blocked: only http/https schemes allowed".to_string());
        }

        let host = parsed.host_str().ok_or("No host in URL")?;

        // Block obvious private hosts
        if host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "0.0.0.0" {
            return Err("Blocked: cannot fetch from localhost".to_string());
        }

        // Resolve DNS and check resolved IP
        match tokio::net::lookup_host((host, parsed.port().unwrap_or(80))).await {
            Ok(mut addrs) => {
                if let Some(addr) = addrs.next() {
                    let ip = addr.ip();
                    // Check for loopback/unspecified
                    if ip.is_loopback() || ip.is_unspecified() {
                        return Err(format!("Blocked: resolved to loopback/unspecified: {}", ip));
                    }
                    // Check for private ranges manually (std IpAddr doesn't have is_private)
                    let is_private = match ip {
                        std::net::IpAddr::V4(v4) => {
                            let octets = v4.octets();
                            octets[0] == 10 ||
                            (octets[0] == 172 && (octets[1] >= 16 && octets[1] <= 31)) ||
                            (octets[0] == 192 && octets[1] == 168)
                        }
                        std::net::IpAddr::V6(v6) => v6.octets()[0] == 0xfd || v6.octets()[0] == 0xfc,
                    };
                    if is_private {
                        return Err(format!("Blocked: resolved to private IP: {}", ip));
                    }
                    // Check link-local (169.254.x.x)
                    if let std::net::IpAddr::V4(v4) = ip {
                        if v4.is_link_local() {
                            return Err(format!("Blocked: resolved to link-local IP: {}", ip));
                        }
                    }
                }
            }
            Err(e) => {
                // DNS resolution failed — could be DNS rebinding attempt
                tracing::warn!("[NewsScanner] DNS resolution failed for {}: {}", host, e);
            }
        }

        // Also check for DNS rebinding via known-bad patterns
        if host.contains("metadata") || host.contains("internal") || host.ends_with(".local") {
            return Err(format!("Blocked: suspicious host: {}", host));
        }

        Ok(())
    }

    /// Fetch articles from RSS feeds.
    pub async fn fetch_rss_articles(&self) -> Vec<RssArticle> {
        let mut articles = Vec::new();

        for feed in &self.feed_sources {
            if !feed.enabled { continue; }

            if let Ok(resp) = self.client.get(&feed.url).send().await {
                if let Ok(body) = resp.text().await {
                    let parsed = parse_rss(&body, &feed.name);
                    articles.extend(parsed);
                }
            }
        }

        articles
    }

    /// Scan a URL and return full analysis result.
    pub async fn scan_url(&mut self, url: &str) -> Result<NewsAnalysisResult, String> {
        if self.is_seen(url) {
            return Err(format!("Already scanned: {}", url));
        }

        let (title, content) = self.fetch_article(url).await?;
        let flags = self.analyze(&title, &content).await;
        let threat = Self::calculate_threat(&flags);

        // Mark as seen before returning
        self.mark_seen(url);

        Ok(NewsAnalysisResult {
            url: url.to_string(),
            title: if title.is_empty() { "Unknown".into() } else { title },
            threat_level: threat,
            flags,
            analyzed_at: Utc::now(),
            content_length: content.len(),
        })
    }

    /// Detect URLs in a text message.
    pub fn detect_urls(text: &str) -> Vec<String> {
        let url_pattern = regex::Regex::new(
            r##"https?://[^\s<>"')\]}]+"##
        ).unwrap();
        url_pattern.find_iter(text)
            .map(|m| m.as_str().to_string())
            .collect()
    }

    pub fn is_seen(&self, url: &str) -> bool { self.seen_urls.contains(url) }
    pub fn mark_seen(&mut self, url: &str) { self.seen_urls.insert(url.to_string()); }
    pub fn feed_count(&self) -> usize { self.feed_sources.iter().filter(|f| f.enabled).count() }
    pub fn seen_count(&self) -> usize { self.seen_urls.len() }
}

/// Parse RSS/XML content into articles using quick-xml for proper XML parsing.
/// Supports both RSS 2.0 (<item>) and Atom (<entry>) formats.
fn parse_rss(xml: &str, source_name: &str) -> Vec<RssArticle> {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut articles = Vec::new();
    let mut reader = Reader::from_str(xml);
    reader.trim_text(true);

    let mut buf = Vec::new();
    let mut current_item: Option<(String, String, String, String)> = None; // (title, link, description, pubdate_raw)
    let mut in_item = false;
    let mut current_tag: Option<&str> = None;

    // Detect if Atom or RSS
    let is_atom = xml.contains("<feed") || xml.contains("xmlns=");

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();

                // Check for item/entry start
                if (!is_atom && tag == "item") || (is_atom && tag == "entry") {
                    in_item = true;
                    current_item = Some((String::new(), String::new(), String::new(), String::new()));
                }

                if in_item {
                    if tag == "title" && (!is_atom || current_tag.is_none()) {
                        current_tag = Some("title");
                    } else if tag == "link" && (!is_atom || current_tag.is_none()) {
                        current_tag = Some("link");
                        // For Atom, try to get href attribute immediately
                        if is_atom {
                            if let Ok(Some(attr)) = e.try_get_attribute("href") {
                                if let Ok(val) = String::from_utf8(attr.value.to_vec()) {
                                    if let Some(ref mut item) = current_item {
                                        item.1 = val;
                                    }
                                }
                            }
                        }
                    } else if (tag == "description" || (is_atom && tag == "summary")) && current_tag.is_none() {
                        current_tag = Some("description");
                    } else if (tag == "pubDate" || tag == "published" || tag == "updated") && current_tag.is_none() {
                        current_tag = Some("pubdate");
                    }
                }
            }
            Ok(Event::Text(ref e)) => {
                if in_item {
                    if let Ok(text) = e.unescape() {
                        if let Some(ref mut item) = current_item {
                            match current_tag {
                                Some("title") => item.0.push_str(&text),
                                Some("link") => item.1.push_str(&text),
                                Some("description") => item.2.push_str(&text),
                                Some("pubdate") => item.3.push_str(&text),
                                _ => {}
                            }
                        }
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();

                if in_item {
                    if tag == "title" {
                        current_tag = None;
                        if let Some(ref mut item) = current_item {
                            item.0 = strip_html(&item.0);
                        }
                    } else if tag == "link" {
                        current_tag = None;
                    } else if tag == "description" || (is_atom && tag == "summary") {
                        current_tag = None;
                        if let Some(ref mut item) = current_item {
                            item.2 = strip_html(&item.2);
                        }
                    } else if tag == "pubDate" || tag == "published" || tag == "updated" {
                        current_tag = None;
                    } else if tag == "item" || (is_atom && tag == "entry") {
                        in_item = false;
                        if let Some((title, link, description, pubdate_raw)) = current_item.take() {
                            if !title.is_empty() && !link.is_empty() {
                                let pub_date = chrono::DateTime::parse_from_rfc2822(&pubdate_raw)
                                    .ok()
                                    .map(|dt| dt.with_timezone(&Utc))
                                    .or_else(|| {
                                        chrono::DateTime::parse_from_rfc3339(&pubdate_raw)
                                            .ok()
                                            .map(|dt| dt.with_timezone(&Utc))
                                    });

                                articles.push(RssArticle {
                                    title,
                                    link,
                                    description,
                                    pub_date,
                                    source: source_name.to_string(),
                                });
                            }
                        }
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    articles
}

fn strip_html(s: &str) -> String {
    let re = match regex::Regex::new(r"<[^>]+>") {
        Ok(r) => r,
        Err(_) => return s.to_string(),
    };
    re.replace_all(s, "")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .trim()
        .to_string()
}

fn extract_title(html: &str) -> Option<String> {
    let re = regex::Regex::new(r"<title[^>]*>([^<]+)</title>").ok()?;
    re.captures(html).and_then(|c| c.get(1)).map(|m| m.as_str().trim().to_string())
}

fn extract_text(html: &str) -> Option<String> {
    // Extract content from <article>, <main>, or <body>
    let body_re = regex::Regex::new(r"<(?:article|main|body)[^>]*>(.*?)</(?:article|main|body)>").ok()?;
    let content = if let Some(m) = body_re.captures(html) {
        m.get(1).map(|c| c.as_str()).unwrap_or(html)
    } else {
        html
    };

    let re = regex::Regex::new(r"<[^>]+>").ok()?;
    let text = re.replace_all(content, "").to_string();
    // Clean up whitespace
    Some(text.split_whitespace().collect::<Vec<_>>().join(" "))
}

/// Background news monitor state.
#[derive(Default)]
pub struct NewsMonitorState {
    pub last_poll: Option<SystemTime>,
    pub articles_scanned: u64,
    pub alerts_triggered: u64,
    pub active_feeds: usize,
}
