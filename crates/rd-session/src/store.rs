use std::path::PathBuf;
use tokio::fs;
use tracing::info;
use tempfile::NamedTempFile;
use std::io::Write;
use crate::session::Session;

#[derive(Debug, thiserror::Error)]
pub enum SessionStoreError {
    #[error("IO error: {0}")] Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")] Serialization(#[from] serde_json::Error),
    #[error("Session not found: {0}")] NotFound(String),
    #[error("Persist error: {0}")] Persist(#[from] tempfile::PersistError),
}

pub struct SessionStore { directory: PathBuf }

impl SessionStore {
    pub fn new(directory: impl Into<PathBuf>) -> Self { Self { directory: directory.into() } }
    pub fn default_store() -> std::io::Result<Self> {
        let dir = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from(".")).join("rd-agent").join("sessions");
        Ok(Self::new(dir))
    }
    pub async fn ensure_dir(&self) -> std::io::Result<()> { fs::create_dir_all(&self.directory).await }
    pub async fn save(&self, session: &Session) -> Result<PathBuf, SessionStoreError> {
        self.ensure_dir().await?;
        let file_path = self.directory.join(format!("{}.json", &session.id));
        let json = serde_json::to_string_pretty(session)?;
        let mut temp_file = NamedTempFile::new_in(&self.directory)?;
        temp_file.write_all(json.as_bytes())?;
        temp_file.persist(&file_path)?;
        info!("Session saved: {} ({} messages)", session.id, session.messages.len());
        Ok(file_path)
    }
    pub async fn load(&self, session_id: &str) -> Result<Session, SessionStoreError> {
        let file_path = self.directory.join(format!("{}.json", session_id));
        let content = fs::read_to_string(&file_path).await.map_err(|e| match e.kind() {
            std::io::ErrorKind::NotFound => SessionStoreError::NotFound(session_id.to_string()),
            _ => SessionStoreError::Io(e),
        })?;
        let session: Session = serde_json::from_str(&content)?;
        Ok(session)
    }
    pub async fn list_sessions(&self) -> Result<Vec<String>, SessionStoreError> {
        self.ensure_dir().await?;
        let mut entries = fs::read_dir(&self.directory).await?;
        let mut ids = Vec::new();
        while let Some(entry) = entries.next_entry().await? {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".json") { ids.push(name.trim_end_matches(".json").to_string()); }
            }
        }
        Ok(ids)
    }
    pub async fn delete(&self, session_id: &str) -> Result<(), SessionStoreError> {
        let file_path = self.directory.join(format!("{}.json", session_id));
        if file_path.exists() { fs::remove_file(&file_path).await?; }
        Ok(())
    }
    pub async fn load_latest(&self) -> Result<Option<Session>, SessionStoreError> {
        let ids = self.list_sessions().await?;
        if ids.is_empty() { return Ok(None); }
        match self.load(ids.last().unwrap()).await {
            Ok(s) => Ok(Some(s)),
            Err(SessionStoreError::NotFound(_)) => Ok(None),
            Err(e) => Err(e),
        }
    }
}
