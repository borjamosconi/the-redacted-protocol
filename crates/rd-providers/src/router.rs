use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use async_trait::async_trait;
use crate::trait_def::*;
use rd_types::provider::ProviderKind;
use rd_types::event::StreamEvent;
use tracing::{warn, info};

/// Configuration for a single OpenRouter key
#[derive(Debug, Clone)]
pub(crate) struct OpenRouterKey {
    api_key: String,
    model: String,
    purpose: &'static str,
}

/// Multi-key OpenRouter provider with automatic rotation and fallback
pub struct OpenRouterMultiKey {
    keys: Vec<OpenRouterKey>,
    providers: HashMap<usize, Box<dyn Provider>>,
    current_index: AtomicUsize,
    error_counts: std::sync::Mutex<HashMap<usize, u32>>,
}

impl OpenRouterMultiKey {
    pub(crate) fn new(keys: Vec<OpenRouterKey>) -> Self {
        let mut providers: HashMap<usize, Box<dyn Provider>> = HashMap::new();
        for (i, key_config) in keys.iter().enumerate() {
            use crate::openai_compat::OpenAiCompatProvider;
            providers.insert(
                i,
                Box::new(OpenAiCompatProvider::new(
                    ProviderKind::OpenRouter,
                    key_config.api_key.clone(),
                    key_config.model.clone(),
                )),
            );
        }
        Self {
            keys,
            providers,
            current_index: AtomicUsize::new(0),
            error_counts: std::sync::Mutex::new(HashMap::new()),
        }
    }

    /// Get the next key index with rotation (round-robin)
    fn next_key_index(&self) -> usize {
        let len = self.keys.len();
        if len <= 1 { return 0; }
        let current = self.current_index.fetch_add(1, Ordering::SeqCst);
        current % len
    }

    /// Send with automatic rotation and fallback across all keys
    async fn send_with_rotation(&self, request: InferenceRequest) -> Result<InferenceResponse, ProviderError> {
        let start_index = self.next_key_index();
        let mut last_error: Option<ProviderError> = None;

        // Try all keys in rotation order
        for offset in 0..self.keys.len() {
            let idx = (start_index + offset) % self.keys.len();

            // Skip keys with too many recent errors
            if let Some(errors) = self.error_counts.lock().ok().and_then(|m| m.get(&idx).copied()) {
                if errors >= 5 {
                    warn!("Skipping key {} ({} errors) — {}", idx, errors, self.keys[idx].purpose);
                    continue;
                }
            }

            if let Some(provider) = self.providers.get(&idx) {
                info!("Using OpenRouter key #{} ({})", idx + 1, self.keys[idx].purpose);
                match provider.send(request.clone()).await {
                    Ok(resp) => {
                        // Reset error count on success
                        if let Ok(mut errors) = self.error_counts.lock() {
                            errors.insert(idx, 0);
                        }
                        return Ok(resp);
                    }
                    Err(e) => {
                        warn!("OpenRouter key #{} ({}) failed: {}", idx + 1, self.keys[idx].purpose, e);
                        if let Ok(mut errors) = self.error_counts.lock() {
                            *errors.entry(idx).or_insert(0) += 1;
                        }
                        last_error = Some(e);
                    }
                }
            }
        }

        Err(last_error.unwrap_or_else(|| ProviderError::NotAvailable("All OpenRouter keys exhausted".into())))
    }
}

#[async_trait]
impl Provider for OpenRouterMultiKey {
    async fn send(&self, request: InferenceRequest) -> Result<InferenceResponse, ProviderError> {
        self.send_with_rotation(request).await
    }

    async fn stream(&self, request: InferenceRequest) -> Result<Box<dyn futures::Stream<Item = Result<StreamEvent, ProviderError>> + Unpin + Send>, ProviderError> {
        // Use first available key for streaming
        if let Some((_, provider)) = self.providers.iter().next() {
            provider.stream(request).await
        } else {
            Err(ProviderError::NotAvailable("No OpenRouter keys available".into()))
        }
    }

    fn kind(&self) -> ProviderKind {
        ProviderKind::OpenRouter
    }
}

pub struct ProviderRouter { providers: HashMap<ProviderKind, Box<dyn Provider>>, default: ProviderKind }

impl ProviderRouter {
    pub fn new(default: ProviderKind) -> Self { Self { providers: HashMap::new(), default } }
    pub fn register(&mut self, kind: ProviderKind, provider: Box<dyn Provider>) { self.providers.insert(kind, provider); }
    pub fn with_anthropic(mut self, api_key: impl Into<String>) -> Self {
        use crate::anthropic::AnthropicProvider;
        self.providers.insert(ProviderKind::Anthropic, Box::new(AnthropicProvider::new(api_key)));
        self
    }
    pub fn with_openai_compat(mut self, kind: ProviderKind, api_key: impl Into<String>, model: impl Into<String>) -> Self {
        use crate::openai_compat::OpenAiCompatProvider;
        self.providers.insert(kind, Box::new(OpenAiCompatProvider::new(kind, api_key, model)));
        self
    }
    pub fn get(&self, kind: ProviderKind) -> Option<&dyn Provider> { self.providers.get(&kind).map(|p| p.as_ref()) }
    pub fn default_provider(&self) -> Option<&dyn Provider> { self.get(self.default) }
    pub fn registered_kinds(&self) -> Vec<ProviderKind> { self.providers.keys().cloned().collect() }

    /// Send a request using a specific provider (per-request provider selection).
    pub async fn send_with(&self, kind: ProviderKind, request: InferenceRequest) -> Result<InferenceResponse, ProviderError> {
        let p = self.get(kind).ok_or_else(|| ProviderError::NotAvailable(format!("Provider {:?} not available", kind)))?;
        p.send(request).await
    }

    /// Send with fallback: try the requested provider, fall back to default.
    pub async fn send_with_fallback(&self, preferred: ProviderKind, request: InferenceRequest) -> Result<InferenceResponse, ProviderError> {
        if let Some(p) = self.get(preferred) {
            match p.send(request.clone()).await {
                Ok(resp) => return Ok(resp),
                Err(e) => {
                    warn!("Provider {:?} failed, falling back to default: {}", preferred, e);
                }
            }
        }
        let p = self.default_provider().ok_or_else(|| ProviderError::NotAvailable("No providers available".into()))?;
        info!("Using default provider {:?}", self.default);
        p.send(request).await
    }
}

#[async_trait]
impl Provider for ProviderRouter {
    async fn send(&self, request: InferenceRequest) -> Result<InferenceResponse, ProviderError> {
        let p = self.default_provider().ok_or_else(|| ProviderError::NotAvailable(format!("No default provider")))?;
        p.send(request).await
    }
    async fn stream(&self, request: InferenceRequest) -> Result<Box<dyn futures::Stream<Item = Result<StreamEvent, ProviderError>> + Unpin + Send>, ProviderError> {
        let p = self.default_provider().ok_or_else(|| ProviderError::NotAvailable(format!("No default provider")))?;
        p.stream(request).await
    }
    fn kind(&self) -> ProviderKind { self.default }
}

pub fn from_env(default: ProviderKind) -> Result<ProviderRouter, String> {
    let mut router = ProviderRouter::new(default);
    if let Ok(key) = std::env::var("ANTHROPIC_API_KEY") { router = router.with_anthropic(key); }
    if let Ok(key) = std::env::var("OPENAI_API_KEY") {
        let model = std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4o-mini".into());
        router = router.with_openai_compat(ProviderKind::OpenAi, key, model);
    }
    if let Ok(key) = std::env::var("XAI_API_KEY") {
        let model = std::env::var("XAI_MODEL").unwrap_or_else(|_| "grok-3-fast".into());
        router = router.with_openai_compat(ProviderKind::Xai, key, model);
    }

    // OpenRouter — supports multi-key rotation with fallback
    let openrouter_keys: Vec<OpenRouterKey> = {
        let mut keys = Vec::new();

        // Key 1: Principal
        if let Ok(key) = std::env::var("OPENROUTER_API_KEY") {
            let model = std::env::var("OPENROUTER_MODEL")
                .unwrap_or_else(|_| "google/gemini-2.5-flash:free".into());
            keys.push(OpenRouterKey { api_key: key, model, purpose: "Principal — Telegram + Text" });
        }

        // Key 2: Backup
        if let Ok(key) = std::env::var("OPENROUTER_API_KEY_2") {
            let model = std::env::var("OPENROUTER_MODEL_2")
                .unwrap_or_else(|_| "meta-llama/llama-3.3-70b-instruct:free".into());
            keys.push(OpenRouterKey { api_key: key, model, purpose: "Backup — Document Reconstruction" });
        }

        // Key 3: Emergency
        if let Ok(key) = std::env::var("OPENROUTER_API_KEY_3") {
            let model = std::env::var("OPENROUTER_MODEL_3")
                .unwrap_or_else(|_| "qwen/qwen-2.5-72b-instruct:free".into());
            keys.push(OpenRouterKey { api_key: key, model, purpose: "Emergency — Fallback" });
        }

        keys
    };

    if !openrouter_keys.is_empty() {
        info!("OpenRouter: {} key(s) loaded for rotation", openrouter_keys.len());
        let multi_key_provider = OpenRouterMultiKey::new(openrouter_keys);
        router.providers.insert(ProviderKind::OpenRouter, Box::new(multi_key_provider));
    }

    if router.registered_kinds().is_empty() {
        return Err("No inference relay keys found. For 100% free usage:\n  1. Sign up at https://openrouter.ai (free tier)\n  2. Get your API key\n  3. Set OPENROUTER_API_KEY=<your_key>".into());
    }
    Ok(router)
}
