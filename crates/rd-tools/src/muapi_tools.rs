use async_trait::async_trait;
use rd_muapi::{MuapiClient, ImageModel, VideoModel, AspectRatio, CinemaCamera, CinemaLens, FocalLength, Aperture, Resolution};
use crate::registry::{ToolHandler, ToolError};
use serde_json::Value;

pub struct GenImageTool;
#[async_trait]
impl ToolHandler for GenImageTool {
    async fn execute(&self, input: Value) -> Result<String, ToolError> {
        let prompt = input.get("prompt").and_then(|v| v.as_str()).ok_or_else(|| ToolError::InvalidInput("missing 'prompt'".into()))?;
        let client = MuapiClient::from_env().ok_or_else(|| ToolError::ExecutionFailed("MUAPI_API_KEY not set".into()))?;
        
        let result = client.generate_image(prompt, ImageModel::FluxDev, Some(AspectRatio::Landscape)).await
            .map_err(|e| ToolError::ExecutionFailed(format!("Muapi: {}", e)))?;
        
        Ok(format!("Generated image: {}\nModel: {}", result.url, result.model))
    }
}

pub struct GenVideoTool;
#[async_trait]
impl ToolHandler for GenVideoTool {
    async fn execute(&self, input: Value) -> Result<String, ToolError> {
        let prompt = input.get("prompt").and_then(|v| v.as_str()).ok_or_else(|| ToolError::InvalidInput("missing 'prompt'".into()))?;
        let client = MuapiClient::from_env().ok_or_else(|| ToolError::ExecutionFailed("MUAPI_API_KEY not set".into()))?;
        
        let result = client.generate_video(prompt, VideoModel::KlingV3, Some(AspectRatio::Landscape), Some(5)).await
            .map_err(|e| ToolError::ExecutionFailed(format!("Muapi: {}", e)))?;
        
        Ok(format!("Generated video: {}\nModel: {}", result.url, result.model))
    }
}

pub struct GenCinemaTool;
#[async_trait]
impl ToolHandler for GenCinemaTool {
    async fn execute(&self, input: Value) -> Result<String, ToolError> {
        let prompt = input.get("prompt").and_then(|v| v.as_str()).ok_or_else(|| ToolError::InvalidInput("missing 'prompt'".into()))?;
        let client = MuapiClient::from_env().ok_or_else(|| ToolError::ExecutionFailed("MUAPI_API_KEY not set".into()))?;
        
        let result = client.generate_cinema(
            prompt,
            CinemaCamera::Modular8KDigital,
            CinemaLens::PremiumModernPrime,
            FocalLength::Standard35,
            Aperture::F1_4,
            AspectRatio::Landscape,
            Resolution::K2
        ).await.map_err(|e| ToolError::ExecutionFailed(format!("Muapi: {}", e)))?;
        
        Ok(format!("Generated cinema shot: {}\nModel: {}", result.url, result.model))
    }
}
