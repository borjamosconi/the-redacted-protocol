use async_trait::async_trait;
use futures::stream;
use reqwest::Client;
use crate::trait_def::*;
use rd_types::{block::ContentBlock, event::StreamEvent, event::TokenUsage, provider::ProviderKind};

pub struct AnthropicProvider { http: Client, api_key: String, base_url: String }

impl AnthropicProvider {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self { http: Client::new(), api_key: api_key.into(), base_url: "https://api.anthropic.com".to_string() }
    }
    pub fn with_base(mut self, base: impl Into<String>) -> Self { self.base_url = base.into(); self }
}

#[async_trait]
impl Provider for AnthropicProvider {
    async fn send(&self, request: LlmRequest) -> Result<LlmResponse, ProviderError> {
        let endpoint = format!("{}/v1/messages", self.base_url);
        let body = build_anthropic_body(&request);
        let resp = self.http.post(&endpoint)
            .header("x-api-key", &self.api_key).header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json").json(&body).send().await?;
        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() {
            return Err(ProviderError::Api { code: status.as_u16().to_string(), message: text });
        }
        parse_anthropic_response(&text)
    }
    async fn stream(&self, request: LlmRequest) -> Result<Box<dyn futures::Stream<Item = Result<StreamEvent, ProviderError>> + Unpin + Send>, ProviderError> {
        let resp = self.send(LlmRequest { stream: false, ..request }).await?;
        let mut events = Vec::new();
        for block in &resp.blocks {
            match block {
                ContentBlock::Text { text } => events.push(Ok(StreamEvent::TextDelta { delta: text.clone() })),
                ContentBlock::ToolUse { id, name, input } => {
                    events.push(Ok(StreamEvent::ToolUseStart { id: id.clone(), name: name.clone() }));
                    events.push(Ok(StreamEvent::ToolInputDelta { id: id.clone(), delta: serde_json::to_string(input).unwrap_or_default() }));
                    events.push(Ok(StreamEvent::ToolInputEnd { id: id.clone() }));
                }
                _ => {}
            }
        }
        if let Some(u) = &resp.usage { events.push(Ok(StreamEvent::Usage { input_tokens: u.input_tokens, output_tokens: u.output_tokens })); }
        events.push(Ok(StreamEvent::MessageEnd));
        Ok(Box::new(stream::iter(events)))
    }
    fn kind(&self) -> ProviderKind { ProviderKind::Anthropic }
}

fn build_anthropic_body(request: &LlmRequest) -> serde_json::Value {
    let messages: Vec<_> = request.messages.iter().map(|m| {
        let content: Vec<_> = m.content.iter().map(|b| match b {
            ProviderContentBlock::Text(t) => serde_json::json!({"type": "text", "text": t}),
            ProviderContentBlock::ToolUse { id, name, input } => serde_json::json!({"type": "tool_use", "id": id, "name": name, "input": input}),
            ProviderContentBlock::ToolResult { tool_use_id, output, is_error } => serde_json::json!({"type": "tool_result", "tool_use_id": tool_use_id, "content": output, "is_error": is_error}),
        }).collect();
        serde_json::json!({"role": m.role, "content": content})
    }).collect();
    let mut body = serde_json::json!({
        "model": "claude-sonnet-4-20260101", "max_tokens": request.max_tokens,
        "temperature": request.temperature, "system": request.system_prompt, "messages": messages,
    });
    if !request.tools.is_empty() {
        body["tools"] = serde_json::Value::Array(request.tools.iter().map(|t| serde_json::json!({"name": &t.name, "description": &t.description, "input_schema": &t.input_schema})).collect());
    }
    body
}

fn parse_anthropic_response(text: &str) -> Result<LlmResponse, ProviderError> {
    let json: serde_json::Value = serde_json::from_str(text)?;
    let mut blocks = Vec::new();
    if let Some(arr) = json.get("content").and_then(|c| c.as_array()) {
        for item in arr {
            match item.get("type").and_then(|t| t.as_str()).unwrap_or("") {
                "text" => { if let Some(t) = item.get("text").and_then(|v| v.as_str()) { blocks.push(ContentBlock::text(t.to_string())); } }
                "tool_use" => {
                    let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let input = item.get("input").cloned().unwrap_or(serde_json::json!({}));
                    blocks.push(ContentBlock::tool_use(id, name, input));
                }
                _ => {}
            }
        }
    }
    let usage = json.get("usage").map(|u| TokenUsage {
        input_tokens: u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
        output_tokens: u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
    });
    let stop_reason = json.get("stop_reason").and_then(|s| s.as_str()).map(|s| match s {
        "end_turn" => StopReason::EndTurn, "tool_use" => StopReason::ToolUse, "max_tokens" => StopReason::MaxTokens, other => StopReason::Error(other.to_string()),
    }).unwrap_or(StopReason::EndTurn);
    Ok(LlmResponse { blocks, usage, stop_reason })
}
