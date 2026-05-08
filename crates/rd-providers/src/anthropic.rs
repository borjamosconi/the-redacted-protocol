use async_trait::async_trait;
use reqwest::Client;
use std::pin::Pin;
use std::task::{Context, Poll};
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
    async fn send(&self, request: InferenceRequest) -> Result<InferenceResponse, ProviderError> {
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
    async fn stream(&self, request: InferenceRequest) -> Result<Box<dyn futures::Stream<Item = Result<StreamEvent, ProviderError>> + Unpin + Send>, ProviderError> {
        let endpoint = format!("{}/v1/messages", self.base_url);
        let mut body = build_anthropic_body(&InferenceRequest { stream: true, ..request.clone() });
        body["stream"] = serde_json::json!(true);

        let resp = self.http.post(&endpoint)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .header("Accept", "text/event-stream")
            .json(&body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await?;
            return Err(ProviderError::Api { code: status.as_u16().to_string(), message: text });
        }

        let stream = AnthropicSSEStream::new(resp.bytes_stream());
        Ok(Box::new(stream))
    }
    fn kind(&self) -> ProviderKind { ProviderKind::Anthropic }
}

fn build_anthropic_body(request: &InferenceRequest) -> serde_json::Value {
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

fn parse_anthropic_response(text: &str) -> Result<InferenceResponse, ProviderError> {
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
    Ok(InferenceResponse { blocks, usage, stop_reason })
}

/// Real SSE stream parser for Anthropic Server-Sent Events.
pub struct AnthropicSSEStream {
    buffer: String,
    stream: Pin<Box<dyn futures::Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Send>>,
    done: bool,
}

impl AnthropicSSEStream {
    pub fn new(stream: impl futures::Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Send + Unpin + 'static) -> Self {
        Self {
            buffer: String::new(),
            stream: Box::pin(stream),
            done: false,
        }
    }

    fn parse_sse_line(&self, data: &str) -> Option<Result<StreamEvent, ProviderError>> {
        if data.is_empty() { return None; }

        let json: serde_json::Value = match serde_json::from_str(data) {
            Ok(j) => j,
            Err(e) => return Some(Err(ProviderError::Serialization(e))),
        };

        let event_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");

        match event_type {
            "content_block_start" => {
                let content_type = json.get("content_block").and_then(|c| c.get("type")).and_then(|v| v.as_str());
                match content_type {
                    Some("text") => Some(Ok(StreamEvent::TextDelta { delta: String::new() })),
                    Some("tool_use") => {
                        let id = json.get("content_block").and_then(|c| c.get("id")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let name = json.get("content_block").and_then(|c| c.get("name")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                        Some(Ok(StreamEvent::ToolUseStart { id, name }))
                    }
                    _ => None,
                }
            }
            "content_block_delta" => {
                let delta_type = json.get("delta").and_then(|d| d.get("type")).and_then(|v| v.as_str());
                match delta_type {
                    Some("text_delta") => {
                        let text = json.get("delta").and_then(|d| d.get("text")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                        Some(Ok(StreamEvent::TextDelta { delta: text }))
                    }
                    Some("input_json_delta") => {
                        let id = json.get("index").and_then(|v| v.as_u64()).unwrap_or(0).to_string();
                        let delta = json.get("delta").and_then(|d| d.get("partial_json")).and_then(|v| v.as_str()).unwrap_or("").to_string();
                        Some(Ok(StreamEvent::ToolInputDelta { id, delta }))
                    }
                    _ => None,
                }
            }
            "content_block_stop" => {
                let id = json.get("index").and_then(|v| v.as_u64()).unwrap_or(0).to_string();
                Some(Ok(StreamEvent::ToolInputEnd { id }))
            }
            "message_delta" => {
                let usage = json.get("usage").map(|u| TokenUsage {
                    input_tokens: u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
                    output_tokens: u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0),
                });
                if let Some(u) = usage {
                    return Some(Ok(StreamEvent::Usage { input_tokens: u.input_tokens, output_tokens: u.output_tokens }));
                }
                None
            }
            "message_stop" => Some(Ok(StreamEvent::MessageEnd)),
            _ => None,
        }
    }
}

impl futures::Stream for AnthropicSSEStream {
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

                    // Process complete SSE messages in buffer
                    let mut result = None;
                    let lines: Vec<&str> = self.buffer.split("\n\n").collect();
                    if lines.len() > 1 {
                        // Keep the last (possibly incomplete) chunk in buffer
                        let complete: String = lines[..lines.len() - 1].join("\n\n");
                        self.buffer = lines[lines.len() - 1].to_string();

                        for sse_msg in complete.split("\n\n") {
                            if sse_msg.trim().is_empty() { continue; }

                            // Extract "data: " prefix
                            for line in sse_msg.lines() {
                                if let Some(data) = line.strip_prefix("data: ") {
                                    if let Some(event) = self.parse_sse_line(data) {
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
                    // Continue polling for more data
                }
                Poll::Ready(Some(Err(e))) => {
                    return Poll::Ready(Some(Err(ProviderError::Http(e))));
                }
                Poll::Ready(None) => {
                    // Stream ended, flush buffer
                    self.done = true;
                    if !self.buffer.trim().is_empty() {
                        for line in self.buffer.lines() {
                            if let Some(data) = line.strip_prefix("data: ") {
                                if let Some(event) = self.parse_sse_line(data) {
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
