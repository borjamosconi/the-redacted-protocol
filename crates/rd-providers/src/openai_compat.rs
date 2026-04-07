use async_trait::async_trait;
use futures::stream;
use reqwest::Client;
use crate::trait_def::*;
use rd_types::{block::ContentBlock, event::StreamEvent, event::TokenUsage, provider::ProviderKind};

pub struct OpenAiCompatProvider { http: Client, api_key: String, base_url: String, model: String, kind: ProviderKind }

impl OpenAiCompatProvider {
    pub fn new(kind: ProviderKind, api_key: impl Into<String>, model: impl Into<String>) -> Self {
        let base_url = match kind {
            ProviderKind::OpenAi => "https://api.openai.com",
            ProviderKind::Xai => "https://api.x.ai",
            ProviderKind::DashScope => "https://dashscope.aliyuncs.com",
            ProviderKind::OpenRouter => "https://openrouter.ai",
            _ => "https://api.openai.com",
        }.to_string();
        Self { http: Client::new(), api_key: api_key.into(), base_url, model: model.into(), kind }
    }
    pub fn with_base(mut self, base: impl Into<String>) -> Self { self.base_url = base.into(); self }
}

#[async_trait]
impl Provider for OpenAiCompatProvider {
    async fn send(&self, request: LlmRequest) -> Result<LlmResponse, ProviderError> {
        let endpoint = format!("{}/v1/chat/completions", self.base_url);
        let body = build_openai_body(&request, &self.model);
        let mut req = self.http.post(&endpoint).header("Content-Type", "application/json");
        req = match self.kind {
            ProviderKind::OpenRouter => req.header("Authorization", format!("Bearer {}", self.api_key)).header("HTTP-Referer", "https://redacted.protocol").header("X-Title", "Redacted Agent"),
            _ => req.header("Authorization", format!("Bearer {}", self.api_key)),
        };
        let resp = req.json(&body).send().await?;
        let status = resp.status();
        let text = resp.text().await?;
        if !status.is_success() { return Err(ProviderError::Api { code: status.as_u16().to_string(), message: text }); }
        parse_openai_response(&text)
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
    fn kind(&self) -> ProviderKind { self.kind }
}

fn build_openai_body(request: &LlmRequest, model: &str) -> serde_json::Value {
    let mut messages = Vec::new();
    if !request.system_prompt.is_empty() { messages.push(serde_json::json!({"role": "system", "content": request.system_prompt})); }
    for msg in &request.messages {
        for block in &msg.content {
            match block {
                ProviderContentBlock::Text(t) => messages.push(serde_json::json!({"role": msg.role, "content": t})),
                ProviderContentBlock::ToolUse { id, name, input } => messages.push(serde_json::json!({"role": "assistant", "content": null, "tool_calls": [{"id": id, "type": "function", "function": {"name": name, "arguments": serde_json::to_string(input).unwrap_or_default()}}]})),
                ProviderContentBlock::ToolResult { tool_use_id, output, is_error: _ } => messages.push(serde_json::json!({"role": "tool", "tool_call_id": tool_use_id, "content": output})),
            }
        }
    }
    let mut body = serde_json::json!({"model": model, "max_tokens": request.max_tokens, "temperature": request.temperature, "messages": messages});
    if !request.tools.is_empty() {
        body["tools"] = serde_json::Value::Array(request.tools.iter().map(|t| serde_json::json!({"type": "function", "function": {"name": &t.name, "description": &t.description, "parameters": &t.input_schema}})).collect());
    }
    body
}

fn parse_openai_response(text: &str) -> Result<LlmResponse, ProviderError> {
    let json: serde_json::Value = serde_json::from_str(text)?;
    let mut blocks = Vec::new();
    if let Some(choices) = json.get("choices").and_then(|c| c.as_array()) {
        if let Some(choice) = choices.first() {
            if let Some(message) = choice.get("message") {
                if let Some(content) = message.get("content").and_then(|c| c.as_str()) {
                    if !content.is_empty() { blocks.push(ContentBlock::text(content.to_string())); }
                }
                if let Some(tool_calls) = message.get("tool_calls").and_then(|t| t.as_array()) {
                    for tc in tool_calls {
                        let id = tc.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let name = tc.get("function").and_then(|f| f.get("name")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let input = tc.get("function").and_then(|f| f.get("arguments")).and_then(|v| v.as_str()).and_then(|s| serde_json::from_str(s).ok()).unwrap_or(serde_json::json!({}));
                        blocks.push(ContentBlock::tool_use(id, name, input));
                    }
                }
            }
            let stop_reason = choice.get("finish_reason").and_then(|s| s.as_str()).map(|s| match s {
                "stop" => StopReason::EndTurn, "tool_calls" => StopReason::ToolUse, "length" => StopReason::MaxTokens, other => StopReason::Error(other.to_string()),
            }).unwrap_or(StopReason::EndTurn);
            let usage = json.get("usage").map(|u| TokenUsage {
                input_tokens: u.get("prompt_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
                output_tokens: u.get("completion_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
            });
            return Ok(LlmResponse { blocks, usage, stop_reason });
        }
    }
    Err(ProviderError::Api { code: "parse".into(), message: "No choices in response".into() })
}
