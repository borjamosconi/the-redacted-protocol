use async_trait::async_trait;
use reqwest::Client;
use std::pin::Pin;
use std::task::{Context, Poll};
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
        let endpoint = format!("{}/v1/chat/completions", self.base_url);
        let mut body = build_openai_body(&LlmRequest { stream: true, ..request.clone() }, &self.model);
        body["stream"] = serde_json::json!(true);
        body["stream_options"] = serde_json::json!({"include_usage": true});

        let mut req = self.http.post(&endpoint).header("Content-Type", "application/json");
        req = match self.kind {
            ProviderKind::OpenRouter => req.header("Authorization", format!("Bearer {}", self.api_key)).header("HTTP-Referer", "https://redacted.protocol").header("X-Title", "Redacted Agent"),
            _ => req.header("Authorization", format!("Bearer {}", self.api_key)),
        };

        let resp = req.json(&body).send().await?;
        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await?;
            return Err(ProviderError::Api { code: status.as_u16().to_string(), message: text });
        }

        let stream = OpenAiSSEStream::new(resp.bytes_stream());
        Ok(Box::new(stream))
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

/// Real SSE stream parser for OpenAI-compatible Server-Sent Events.
pub struct OpenAiSSEStream {
    buffer: String,
    stream: Pin<Box<dyn futures::Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Send>>,
    done: bool,
}

impl OpenAiSSEStream {
    pub fn new(stream: impl futures::Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Send + Unpin + 'static) -> Self {
        Self {
            buffer: String::new(),
            stream: Box::pin(stream),
            done: false,
        }
    }

    fn parse_sse_data(&self, data: &str) -> Option<Result<StreamEvent, ProviderError>> {
        if data.trim().is_empty() { return None; }
        if data == "[DONE]" { return Some(Ok(StreamEvent::MessageEnd)); }

        let json: serde_json::Value = match serde_json::from_str(data) {
            Ok(j) => j,
            Err(e) => return Some(Err(ProviderError::Serialization(e))),
        };

        // Check for usage info (stream_options: include_usage)
        if let Some(usage) = json.get("usage") {
            if let (Some(prompt), Some(completion)) = (
                usage.get("prompt_tokens").and_then(|v| v.as_u64()),
                usage.get("completion_tokens").and_then(|v| v.as_u64()),
            ) {
                return Some(Ok(StreamEvent::Usage {
                    input_tokens: prompt,
                    output_tokens: completion,
                }));
            }
        }

        let choice = json.get("choices").and_then(|c| c.as_array()).and_then(|c| c.first());
        let delta = choice.and_then(|c| c.get("delta"))?;

        let mut events = Vec::new();

        // Text delta
        if let Some(content) = delta.get("content").and_then(|v| v.as_str()) {
            if !content.is_empty() {
                events.push(Ok(StreamEvent::TextDelta { delta: content.to_string() }));
            }
        }

        // Tool calls
        if let Some(tool_calls) = delta.get("tool_calls").and_then(|t| t.as_array()) {
            for tc in tool_calls {
                let index = tc.get("index").and_then(|v| v.as_u64()).unwrap_or(0);
                if let Some(function) = tc.get("function") {
                    if let Some(name) = function.get("name").and_then(|v| v.as_str()) {
                        let id = tc.get("id").and_then(|v| v.as_str()).unwrap_or(&index.to_string()).to_string();
                        events.push(Ok(StreamEvent::ToolUseStart { id: id.clone(), name: name.to_string() }));
                    }
                    if let Some(arguments) = function.get("arguments").and_then(|v| v.as_str()) {
                        let id = tc.get("id").and_then(|v| v.as_str()).unwrap_or(&index.to_string()).to_string();
                        events.push(Ok(StreamEvent::ToolInputDelta { id: id.clone(), delta: arguments.to_string() }));
                        events.push(Ok(StreamEvent::ToolInputEnd { id }));
                    }
                }
            }
        }

        // Check finish reason
        if let Some(finish) = choice.and_then(|c| c.get("finish_reason")).and_then(|v| v.as_str()) {
            if finish != "null" {
                events.push(Ok(StreamEvent::MessageEnd));
            }
        }

        if events.is_empty() { None } else { Some(events.remove(0)) }
    }
}

impl futures::Stream for OpenAiSSEStream {
    type Item = Result<StreamEvent, ProviderError>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        if self.done {
            return Poll::Ready(None);
        }

        loop {
            match Pin::new(&mut self.stream).poll_next(cx) {
                Poll::Ready(Some(Ok(chunk))) => {
                    let text = String::from_utf8_lossy(&chunk).to_string();
                    self.buffer.push_str(&text);

                    let mut result = None;
                    let lines: Vec<&str> = self.buffer.split("\n\n").collect();
                    if lines.len() > 1 {
                        let complete: String = lines[..lines.len() - 1].join("\n\n");
                        self.buffer = lines[lines.len() - 1].to_string();

                        for sse_msg in complete.split("\n\n") {
                            if sse_msg.trim().is_empty() { continue; }
                            for line in sse_msg.lines() {
                                if let Some(data) = line.strip_prefix("data: ") {
                                    if let Some(event) = self.parse_sse_data(data) {
                                        result = Some(event);
                                        break;
                                    }
                                }
                            }
                            if result.is_some() { break; }
                        }
                    }

                    if let Some(evt) = result {
                        return Poll::Ready(Some(evt));
                    }
                }
                Poll::Ready(Some(Err(e))) => {
                    return Poll::Ready(Some(Err(ProviderError::Http(e))));
                }
                Poll::Ready(None) => {
                    self.done = true;
                    if !self.buffer.trim().is_empty() {
                        for line in self.buffer.lines() {
                            if let Some(data) = line.strip_prefix("data: ") {
                                if let Some(event) = self.parse_sse_data(data) {
                                    return Poll::Ready(Some(event));
                                }
                            }
                        }
                    }
                    return Poll::Ready(Some(Ok(StreamEvent::MessageEnd)));
                }
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}
