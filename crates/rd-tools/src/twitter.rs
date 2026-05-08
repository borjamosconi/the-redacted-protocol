//! Twitter (X) API v2 client for Redacted Protocol
//!
//! Handles autonomous broadcasting of declassified fragments to X.

use reqwest::Client;
use serde_json::json;
use std::time::Duration;

pub struct TwitterClient {
    client: Client,
    bearer_token: String,
}

impl TwitterClient {
    pub fn new(bearer_token: impl Into<String>) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap_or_default(),
            bearer_token: bearer_token.into(),
        }
    }

    pub fn from_env() -> Option<Self> {
        std::env::var("TWITTER_BEARER_TOKEN").ok().map(|t| Self::new(t))
    }

    /// Post a simple text tweet using OAuth 2.0 Bearer Token (if authorized for posting)
    /// Note: Most posting requires OAuth 1.0a or OAuth 2.0 with PKCE (User context).
    /// For a bot, we typically use OAuth 1.0a with Access Token/Secret.
    pub async fn post_tweet(&self, text: &str) -> Result<String, String> {
        let url = "https://api.twitter.com/2/tweets";
        let body = json!({ "text": text });

        let resp = self.client.post(url)
            .header("Authorization", format!("Bearer {}", self.bearer_token))
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("HTTP: {}", e))?;

        let status = resp.status();
        let json: serde_json::Value = resp.json().await.map_err(|e| format!("JSON: {}", e))?;

        if status.is_success() {
            let id = json.get("data").and_then(|d| d.get("id")).and_then(|v| v.as_str()).unwrap_or("unknown");
            Ok(id.to_string())
        } else {
            Err(format!("Twitter API {}: {}", status, json))
        }
    }
}

/// Helper for OAuth 1.0a posting (more common for simple bots)
pub struct TwitterClientV1 {
    client: Client,
    consumer_key: String,
    consumer_secret: String,
    access_token: String,
    access_token_secret: String,
}

impl TwitterClientV1 {
    pub fn new(ck: String, cs: String, at: String, ats: String) -> Self {
        Self {
            client: Client::new(),
            consumer_key: ck,
            consumer_secret: cs,
            access_token: at,
            access_token_secret: ats,
        }
    }

    pub fn from_env() -> Option<Self> {
        let ck = std::env::var("TWITTER_CONSUMER_KEY").ok();
        let cs = std::env::var("TWITTER_CONSUMER_SECRET").ok();
        let at = std::env::var("TWITTER_ACCESS_TOKEN").ok();
        let ats = std::env::var("TWITTER_ACCESS_TOKEN_SECRET").ok();

        if let (Some(ck), Some(cs), Some(at), Some(ats)) = (ck, cs, at, ats) {
            Some(Self::new(ck, cs, at, ats))
        } else {
            None
        }
    }

    /// Post a tweet using OAuth 1.0a.
    pub async fn post_tweet(&self, text: &str) -> Result<String, String> {
        let url = "https://api.twitter.com/2/tweets";
        let body = serde_json::json!({ "text": text });
        let body_str = body.to_string();

        let header = oauth1::authorize(
            "POST",
            url,
            &oauth1::Token::new(&self.consumer_key, &self.consumer_secret),
            Some(&oauth1::Token::new(&self.access_token, &self.access_token_secret)),
            None, // No extra params for now
        );

        let resp = self.client.post(url)
            .header("Authorization", header)
            .header("Content-Type", "application/json")
            .body(body_str)
            .send()
            .await
            .map_err(|e| format!("HTTP: {}", e))?;

        let status = resp.status();
        let json: serde_json::Value = resp.json().await.map_err(|e| format!("JSON: {}", e))?;

        if status.is_success() {
            let id = json.get("data").and_then(|d| d.get("id")).and_then(|v| v.as_str()).unwrap_or("unknown");
            Ok(id.to_string())
        } else {
            Err(format!("Twitter API {}: {}", status, json))
        }
    }
}
