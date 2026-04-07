use std::path::{Path, PathBuf};
use tokio::fs;
use tracing::{debug, info};
use crate::settings::*;

pub struct ConfigLoader { search_paths: Vec<PathBuf> }

impl ConfigLoader {
    pub fn new() -> Self {
        let mut paths = Vec::new();
        if let Some(home) = dirs::home_dir() {
            let ud = home.join(".rd-agent");
            paths.push(ud.join("config.json"));
            paths.push(ud.join("settings.json"));
        }
        Self { search_paths: paths }
    }
    pub fn set_cwd(&mut self, cwd: impl Into<PathBuf>) {
        let cwd = cwd.into();
        self.search_paths.push(cwd.join(".rd-agent.json"));
        self.search_paths.push(cwd.join("settings.json"));
        self.search_paths.push(cwd.join("settings.local.json"));
    }
    pub async fn load(&self) -> RuntimeSettings {
        let mut merged = RawConfig::default();
        for path in &self.search_paths {
            match self.load_file(path).await {
                Ok(c) => { debug!("Loaded: {}", path.display()); merged = deep_merge(&merged, &c); }
                Err(_) => { debug!("Config not found: {}", path.display()); }
            }
        }
        let settings = merged.parse();
        info!("Settings: model={}, permission={:?}", settings.model, settings.permission_mode);
        settings
    }
    async fn load_file(&self, path: &Path) -> anyhow::Result<RawConfig> {
        if !path.exists() { anyhow::bail!("not found"); }
        let content = fs::read_to_string(path).await?;
        Ok(serde_json::from_str(&content)?)
    }
}

impl Default for ConfigLoader { fn default() -> Self { Self::new() } }
