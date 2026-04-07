use serde::{Deserialize, Serialize};
use rd_types::permission::PermissionLevel;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeSettings {
    pub model: String,
    pub permission_mode: PermissionLevel,
    pub max_tokens_per_turn: u64,
    pub max_iterations: usize,
    pub temperature: f64,
    pub confidence_threshold: f64,
    pub max_fragment_retries: u32,
    pub cooldown_seconds: u64,
    pub max_concurrent_jobs: usize,
    pub pre_tool_hooks: Vec<String>,
    pub post_tool_hooks: Vec<String>,
    pub solana_rpc_url: String,
    pub redis_url: String,
    pub arweave_gateway: String,
}

impl Default for RuntimeSettings {
    fn default() -> Self {
        Self {
            model: "sonnet".into(), permission_mode: PermissionLevel::Reconstructor,
            max_tokens_per_turn: 8192, max_iterations: 50, temperature: 0.3,
            confidence_threshold: 0.85, max_fragment_retries: 3, cooldown_seconds: 300,
            max_concurrent_jobs: 5, pre_tool_hooks: Vec::new(), post_tool_hooks: Vec::new(),
            solana_rpc_url: "https://api.devnet.solana.com".into(),
            redis_url: "redis://localhost:6379".into(),
            arweave_gateway: "https://arweave.net".into(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RawConfig { #[serde(flatten)] pub fields: HashMap<String, serde_json::Value> }

impl RawConfig {
    pub fn get_string(&self, key: &str) -> Option<String> { self.fields.get(key).and_then(|v| v.as_str()).map(|s| s.to_string()) }
    pub fn get_int(&self, key: &str) -> Option<u64> { self.fields.get(key).and_then(|v| v.as_u64()) }
    pub fn get_float(&self, key: &str) -> Option<f64> { self.fields.get(key).and_then(|v| v.as_f64()) }
    pub fn get_array(&self, key: &str) -> Option<Vec<String>> {
        self.fields.get(key).and_then(|v| v.as_array()).map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
    }
    pub fn parse(&self) -> RuntimeSettings {
        let mut s = RuntimeSettings::default();
        if let Some(v) = self.get_string("model") { s.model = v; }
        if let Some(v) = self.get_string("permission_mode") { if let Some(l) = PermissionLevel::parse(&v) { s.permission_mode = l; } }
        if let Some(v) = self.get_int("max_tokens_per_turn") { s.max_tokens_per_turn = v; }
        if let Some(v) = self.get_int("max_iterations") { s.max_iterations = v as usize; }
        if let Some(v) = self.get_float("temperature") { s.temperature = v; }
        if let Some(v) = self.get_float("confidence_threshold") { s.confidence_threshold = v; }
        if let Some(v) = self.get_int("max_fragment_retries") { s.max_fragment_retries = v as u32; }
        if let Some(v) = self.get_int("cooldown_seconds") { s.cooldown_seconds = v; }
        if let Some(v) = self.get_int("max_concurrent_jobs") { s.max_concurrent_jobs = v as usize; }
        if let Some(a) = self.get_array("pre_tool_hooks") { s.pre_tool_hooks = a; }
        if let Some(a) = self.get_array("post_tool_hooks") { s.post_tool_hooks = a; }
        if let Some(v) = self.get_string("solana_rpc_url") { s.solana_rpc_url = v; }
        if let Some(v) = self.get_string("redis_url") { s.redis_url = v; }
        if let Some(v) = self.get_string("arweave_gateway") { s.arweave_gateway = v; }
        s
    }
}

pub fn deep_merge(a: &RawConfig, b: &RawConfig) -> RawConfig {
    let mut merged = a.fields.clone();
    for (k, v) in &b.fields {
        if let (Some(obj_a), Some(obj_b)) = (merged.get(k).and_then(|v| v.as_object()), v.as_object()) {
            let mut mo = obj_a.clone();
            for (kk, vv) in obj_b { mo.insert(kk.clone(), vv.clone()); }
            merged.insert(k.clone(), serde_json::Value::Object(mo));
        } else { merged.insert(k.clone(), v.clone()); }
    }
    RawConfig { fields: merged }
}
