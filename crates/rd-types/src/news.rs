//! News Intelligence types — shared across all crates.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashSet;

/// Threat level based on conspiracy indicators.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThreatLevel {
    Safe,
    Suspicious,
    Flagged,
    Critical,
}

/// Flag type for news analysis.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
}

/// Individual flag raised by detection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsFlag {
    pub flag_type: FlagType,
    pub description: String,
    pub confidence: f64,
    pub context: String,
}

/// Conspiracy pattern database.
pub struct ConspiracyPatterns {
    pub keywords: HashSet<String>,
    pub redaction_patterns: Vec<regex::Regex>,
    pub coverup_phrases: Vec<String>,
    pub classified_terms: Vec<String>,
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
        ].into_iter().map(String::from).collect();

        let redaction_patterns: Vec<regex::Regex> = vec![
            regex::Regex::new(r"█+").unwrap(),
            regex::Regex::new(r"\[REDACTED\]").unwrap(),
            regex::Regex::new(r"\[CLASSIFIED\]").unwrap(),
            regex::Regex::new(r"\[CENSORED\]").unwrap(),
            regex::Regex::new(r"[█▓▒░]{3,}").unwrap(),
            regex::Regex::new(r"black(?:ed)? out").unwrap(),
            regex::Regex::new(r"redacted|expunged|sealed|classified").unwrap(),
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

        Self { keywords, redaction_patterns, coverup_phrases, classified_terms }
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
}

impl NewsScanner {
    pub fn new() -> Self {
        Self { client: reqwest::Client::new(), patterns: ConspiracyPatterns::new(), seen_urls: HashSet::new() }
    }

    pub async fn analyze(&self, title: &str, content: &str) -> Vec<NewsFlag> {
        let mut flags = Vec::new();
        let full_text = format!("{} {}", title, content).to_lowercase();

        for pattern in &self.patterns.redaction_patterns {
            if let Some(m) = pattern.find(&full_text) {
                flags.push(NewsFlag { flag_type: FlagType::RedactionMarker, description: "Redaction/censorship markers detected".into(), confidence: 0.95, context: full_text[m.start()..(m.start() + 50).min(full_text.len())].to_string() });
            }
        }

        for term in &self.patterns.classified_terms {
            if full_text.contains(&term.to_lowercase()) {
                flags.push(NewsFlag { flag_type: FlagType::ClassifiedLanguage, description: format!("Classified terminology: '{}'", term), confidence: 0.7, context: term.clone() });
            }
        }

        for phrase in &self.patterns.coverup_phrases {
            if full_text.contains(&phrase.to_lowercase()) {
                flags.push(NewsFlag { flag_type: FlagType::CoverUpPattern, description: format!("Cover-up language: '{}'", phrase), confidence: 0.65, context: phrase.clone() });
            }
        }

        for keyword in &self.patterns.keywords {
            if full_text.contains(&keyword.to_lowercase()) {
                flags.push(NewsFlag { flag_type: FlagType::PatternMatch, description: format!("Conspiracy keyword match: '{}'", keyword), confidence: 0.6, context: keyword.clone() });
            }
        }

        let passive_indicators = ["was", "were", "been", "has been", "had been"];
        let passive_count = passive_indicators.iter().filter(|&&w| full_text.contains(w)).count();
        if passive_count >= 5 {
            flags.push(NewsFlag { flag_type: FlagType::UnusualFraming, description: "Heavy passive voice — may indicate evasion".into(), confidence: 0.4, context: format!("{} passive constructions", passive_count) });
        }

        flags
    }

    pub fn calculate_threat(flags: &[NewsFlag]) -> ThreatLevel {
        if flags.is_empty() { return ThreatLevel::Safe; }
        let max_confidence = flags.iter().map(|f| f.confidence).fold(0.0_f64, f64::max);
        let flag_count = flags.len();
        if max_confidence >= 0.9 && flag_count >= 3 { ThreatLevel::Critical }
        else if max_confidence >= 0.7 && flag_count >= 2 { ThreatLevel::Flagged }
        else if !flags.is_empty() { ThreatLevel::Suspicious }
        else { ThreatLevel::Safe }
    }

    pub async fn fetch_article(&self, url: &str) -> Result<(String, String), String> {
        let resp = self.client.get(url).header("User-Agent", "RedactedProtocol/1.0").send().await.map_err(|e| format!("HTTP: {}", e))?;
        let html = resp.text().await.map_err(|e| format!("Text: {}", e))?;
        let title = extract_title(&html).unwrap_or_default();
        let content = extract_text(&html).unwrap_or_default();
        Ok((title, content))
    }

    pub fn is_seen(&self, url: &str) -> bool { self.seen_urls.contains(url) }
    pub fn mark_seen(&mut self, url: &str) { self.seen_urls.insert(url.to_string()); }
}

fn extract_title(html: &str) -> Option<String> {
    let re = regex::Regex::new(r"<title[^>]*>([^<]+)</title>").ok()?;
    re.captures(html).and_then(|c| c.get(1)).map(|m| m.as_str().trim().to_string())
}

fn extract_text(html: &str) -> Option<String> {
    let re = regex::Regex::new(r"<[^>]+>").ok()?;
    let text = re.replace_all(html, "").to_string();
    Some(text.split_whitespace().collect::<Vec<_>>().join(" "))
}
