use std::collections::HashMap;
use async_trait::async_trait;
use crate::trait_def::*;
use rd_types::provider::ProviderKind;
use rd_types::event::StreamEvent;
use tracing::{warn, info};

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
    pub async fn send_with(&self, kind: ProviderKind, request: LlmRequest) -> Result<LlmResponse, ProviderError> {
        let p = self.get(kind).ok_or_else(|| ProviderError::NotAvailable(format!("Provider {:?} not available", kind)))?;
        p.send(request).await
    }

    /// Send with fallback: try the requested provider, fall back to default.
    pub async fn send_with_fallback(&self, preferred: ProviderKind, request: LlmRequest) -> Result<LlmResponse, ProviderError> {
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
    async fn send(&self, request: LlmRequest) -> Result<LlmResponse, ProviderError> {
        let p = self.default_provider().ok_or_else(|| ProviderError::NotAvailable(format!("No default provider")))?;
        p.send(request).await
    }
    async fn stream(&self, request: LlmRequest) -> Result<Box<dyn futures::Stream<Item = Result<StreamEvent, ProviderError>> + Unpin + Send>, ProviderError> {
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
    // OpenRouter — supports free models (no credit card needed)
    if let Ok(key) = std::env::var("OPENROUTER_API_KEY") {
        let model = std::env::var("OPENROUTER_MODEL")
            .unwrap_or_else(|_| "google/gemini-2.0-flash-exp:free".into());
        router = router.with_openai_compat(ProviderKind::OpenRouter, key, model);
    }
    if router.registered_kinds().is_empty() {
        return Err("No LLM API keys found. For 100% free usage:\n  1. Sign up at https://openrouter.ai (free tier)\n  2. Get your API key\n  3. Set OPENROUTER_API_KEY=<your_key>\n  4. Optionally set OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free".into());
    }
    Ok(router)
}
