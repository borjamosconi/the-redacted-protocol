//! Muapi.ai API Client — Image, Video, Lip Sync & Cinema Generation
//!
//! Provides async functions to generate images and videos via Muapi.ai
//! for use in the Redacted Protocol autonomous news pipeline.
//!
//! API: https://muapi.ai
//! Docs: https://github.com/Anil-matcha/Open-Generative-AI

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, info};

const BASE_URL: &str = "https://api.muapi.ai";

#[derive(Debug, thiserror::Error)]
pub enum MuapiError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("API error: {status} — {body}")]
    Api { status: u16, body: String },
    #[error("Generation failed: {0}")]
    GenerationFailed(String),
    #[error("Polling timeout")]
    Timeout,
    #[error("Parse error: {0}")]
    Parse(#[from] serde_json::Error),
}

/// Image generation models available via Muapi.ai
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageModel {
    /// Fast, good quality — default for news images
    FluxDev,
    /// Google Gemini 3.1 — highest quality
    NanoBanana2,
    /// ByteDance — good for photorealistic
    Seedream5,
    /// Ideogram — good for text-heavy images
    IdeogramV3,
    /// Midjourney v7 — artistic
    MidjourneyV7,
}

impl ImageModel {
    pub fn endpoint(&self) -> &'static str {
        match self {
            ImageModel::FluxDev => "flux-dev",
            ImageModel::NanoBanana2 => "nano-banana-2",
            ImageModel::Seedream5 => "seedream-5.0",
            ImageModel::IdeogramV3 => "ideogram-v3",
            ImageModel::MidjourneyV7 => "midjourney-v7",
        }
    }
}

/// Video generation models
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VideoModel {
    KlingV3,
    Seedance2,
    Wan26,
    Veo3,
    Sora2,
}

impl VideoModel {
    pub fn endpoint(&self) -> &'static str {
        match self {
            VideoModel::KlingV3 => "kling-v3",
            VideoModel::Seedance2 => "seedance-2.0",
            VideoModel::Wan26 => "wan-2.6",
            VideoModel::Veo3 => "veo-3",
            VideoModel::Sora2 => "sora-2",
        }
    }
}

/// Lip sync models
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LipSyncModel {
    InfiniteTalk,
    Wan22Speech,
    Ltx23Lipsync,
    LatentSync,
}

impl LipSyncModel {
    pub fn endpoint(&self) -> &'static str {
        match self {
            LipSyncModel::InfiniteTalk => "infinitetalk-image-to-video",
            LipSyncModel::Wan22Speech => "wan2.2-speech-to-video",
            LipSyncModel::Ltx23Lipsync => "ltx-2.3-lipsync",
            LipSyncModel::LatentSync => "latentsync-video",
        }
    }
}

/// Aspect ratios for image/video generation
#[derive(Debug, Clone, Copy)]
pub enum AspectRatio {
    Square,       // 1:1
    Portrait,     // 9:16
    Landscape,    // 16:9
    Classic,      // 4:3
    Wide,         // 21:9
    Tall,         // 4:5
}

impl AspectRatio {
    pub fn as_str(&self) -> &'static str {
        match self {
            AspectRatio::Square => "1:1",
            AspectRatio::Portrait => "9:16",
            AspectRatio::Landscape => "16:9",
            AspectRatio::Classic => "4:3",
            AspectRatio::Wide => "21:9",
            AspectRatio::Tall => "4:5",
        }
    }
}

/// Virtual camera for Cinema Studio
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CinemaCamera {
    Modular8KDigital,
    FullFrameCineDigital,
    GrandFormat70mmFilm,
    StudioDigitalS35,
    Classic16mmFilm,
    PremiumLargeFormatDigital,
}

impl CinemaCamera {
    pub fn description(&self) -> &'static str {
        match self {
            CinemaCamera::Modular8KDigital => "modular 8K digital cinema camera",
            CinemaCamera::FullFrameCineDigital => "full-frame digital cinema camera",
            CinemaCamera::GrandFormat70mmFilm => "grand format 70mm film camera",
            CinemaCamera::StudioDigitalS35 => "Super 35 studio digital camera",
            CinemaCamera::Classic16mmFilm => "classic 16mm film camera",
            CinemaCamera::PremiumLargeFormatDigital => "premium large-format digital cinema camera",
        }
    }
}

/// Cinema lens type
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CinemaLens {
    CreativeTilt,
    CompactAnamorphic,
    ExtremeMacro,
    SeventiesCinemaPrime,
    ClassicAnamorphic,
    PremiumModernPrime,
    WarmCinemaPrime,
    SwirlBokehPortrait,
    VintagePrime,
    HalationDiffusion,
    ClinicalSharpPrime,
}

impl CinemaLens {
    pub fn description(&self) -> &'static str {
        match self {
            CinemaLens::CreativeTilt => "creative tilt lens effect",
            CinemaLens::CompactAnamorphic => "compact anamorphic lens",
            CinemaLens::ExtremeMacro => "extreme macro lens",
            CinemaLens::SeventiesCinemaPrime => "1970s cinema prime lens",
            CinemaLens::ClassicAnamorphic => "classic anamorphic lens",
            CinemaLens::PremiumModernPrime => "premium modern prime lens",
            CinemaLens::WarmCinemaPrime => "warm-toned cinema prime lens",
            CinemaLens::SwirlBokehPortrait => "swirl bokeh portrait lens",
            CinemaLens::VintagePrime => "vintage prime lens",
            CinemaLens::HalationDiffusion => "halation diffusion filter",
            CinemaLens::ClinicalSharpPrime => "ultra-sharp clinical prime lens",
        }
    }
}

/// Focal length in mm
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FocalLength {
    UltraWide8,   // 8mm - ultra-wide
    Wide14,       // 14mm
    Wide24,       // 24mm
    Standard35,   // 35mm - human eye
    Portrait50,   // 50mm
    TightPortrait85, // 85mm
}

impl FocalLength {
    pub fn mm(&self) -> u32 {
        match self {
            FocalLength::UltraWide8 => 8,
            FocalLength::Wide14 => 14,
            FocalLength::Wide24 => 24,
            FocalLength::Standard35 => 35,
            FocalLength::Portrait50 => 50,
            FocalLength::TightPortrait85 => 85,
        }
    }

    pub fn perspective(&self) -> &'static str {
        match self {
            FocalLength::UltraWide8 => "ultra-wide perspective",
            FocalLength::Wide14 => "wide-angle perspective",
            FocalLength::Wide24 => "wide-angle dynamic perspective",
            FocalLength::Standard35 => "natural cinematic perspective",
            FocalLength::Portrait50 => "standard portrait perspective",
            FocalLength::TightPortrait85 => "classic portrait perspective",
        }
    }
}

/// Aperture (f-stop)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Aperture {
    F1_4,  // shallow DOF, creamy bokeh
    F4,    // balanced depth
    F11,   // deep focus
}

impl Aperture {
    pub fn description(&self) -> &'static str {
        match self {
            Aperture::F1_4 => "shallow depth of field, creamy bokeh",
            Aperture::F4 => "balanced depth of field",
            Aperture::F11 => "deep focus clarity, sharp foreground to background",
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Aperture::F1_4 => "f/1.4",
            Aperture::F4 => "f/4",
            Aperture::F11 => "f/11",
        }
    }
}

/// Resolution for cinema shots
#[derive(Debug, Clone, Copy)]
pub enum Resolution {
    K1,
    K2,
    K4,
}

impl Resolution {
    pub fn as_str(&self) -> &'static str {
        match self {
            Resolution::K1 => "1K",
            Resolution::K2 => "2K",
            Resolution::K4 => "4K",
        }
    }
}

/// Image generation request payload
#[derive(Debug, Serialize)]
struct ImagePayload {
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    aspect_ratio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    resolution: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    strength: Option<f64>,
}

/// Video generation request payload
#[derive(Debug, Serialize)]
struct VideoPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    aspect_ratio: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    resolution: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    image_url: Option<String>,
}

/// Generated image result
#[derive(Debug, Clone, Deserialize)]
pub struct GeneratedImageResult {
    pub url: String,
    pub prompt: String,
    pub model: String,
}

/// Generated video result
#[derive(Debug, Clone, Deserialize)]
pub struct GeneratedVideoResult {
    pub url: String,
    pub prompt: String,
    pub model: String,
    pub duration_secs: Option<u32>,
}

/// Muapi.ai client
pub struct MuapiClient {
    client: Client,
    api_key: String,
}

impl MuapiClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap_or_default(),
            api_key,
        }
    }

    pub fn from_env() -> Option<Self> {
        std::env::var("MUAPI_API_KEY").ok().map(Self::new)
    }

    /// Submit a request and poll for result
    async fn submit_and_poll(
        &self,
        endpoint: &str,
        payload: serde_json::Value,
        max_attempts: usize,
        interval_ms: u64,
    ) -> Result<serde_json::Value, MuapiError> {
        let url = format!("{}/api/v1/{}", BASE_URL, endpoint);

        debug!("Muapi submit: {} {:?}", endpoint, payload);

        let resp = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("x-api-key", &self.api_key)
            .json(&payload)
            .send()
            .await?;

        let status = resp.status();
        let body = resp.text().await?;

        if !status.is_success() {
            return Err(MuapiError::Api {
                status: status.as_u16(),
                body: body.chars().take(200).collect(),
            });
        }

        let submit_data: serde_json::Value = serde_json::from_str(&body)?;
        let request_id = submit_data
            .get("request_id")
            .or_else(|| submit_data.get("id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| MuapiError::GenerationFailed("No request_id in response".into()))?
            .to_string();

        debug!("Muapi request_id: {}", request_id);

        // Poll for result
        let poll_url = format!("{}/api/v1/predictions/{}/result", BASE_URL, request_id);
        for attempt in 1..=max_attempts {
            tokio::time::sleep(Duration::from_millis(interval_ms)).await;

            let poll_resp = self
                .client
                .get(&poll_url)
                .header("x-api-key", &self.api_key)
                .send()
                .await?;

            if !poll_resp.status().is_success() {
                let status = poll_resp.status();
                if status.as_u16() >= 500 {
                    debug!("Muapi poll {} — server error, retrying", status);
                    continue;
                }
                let err_body = poll_resp.text().await?;
                return Err(MuapiError::Api {
                    status: status.as_u16(),
                    body: err_body.chars().take(200).collect(),
                });
            }

            let poll_data: serde_json::Value = poll_resp.json().await?;
            let status_str = poll_data
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_lowercase();

            match status_str.as_str() {
                "completed" | "succeeded" | "success" => {
                    info!("Muapi generation complete (attempt {})", attempt);
                    return Ok(poll_data);
                }
                "failed" | "error" => {
                    let err = poll_data
                        .get("error")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown error")
                        .to_string();
                    return Err(MuapiError::GenerationFailed(err));
                }
                _ => {
                    debug!("Muapi poll attempt {}/{} — status: {}", attempt, max_attempts, status_str);
                }
            }
        }

        Err(MuapiError::Timeout)
    }

    /// Generate an image from a text prompt
    pub async fn generate_image(
        &self,
        prompt: &str,
        model: ImageModel,
        aspect_ratio: Option<AspectRatio>,
    ) -> Result<GeneratedImageResult, MuapiError> {
        let payload = ImagePayload {
            prompt: prompt.to_string(),
            aspect_ratio: aspect_ratio.map(|ar| ar.as_str().to_string()),
            resolution: None,
            quality: Some("high".to_string()),
            image_url: None,
            strength: None,
        };

        let json_payload = serde_json::to_value(&payload)?;
        let result = self.submit_and_poll(model.endpoint(), json_payload, 60, 2000).await?;

        let url = result
            .get("outputs")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|v| v.as_str())
            .or_else(|| result.get("url").and_then(|v| v.as_str()))
            .or_else(|| result.get("output").and_then(|v| v.get("url")).and_then(|v| v.as_str()))
            .unwrap_or("")
            .to_string();

        if url.is_empty() {
            return Err(MuapiError::GenerationFailed("No image URL in response".into()));
        }

        Ok(GeneratedImageResult {
            url,
            prompt: prompt.to_string(),
            model: model.endpoint().to_string(),
        })
    }

    /// Generate an image from another image (image-to-image)
    pub async fn generate_i2i(
        &self,
        prompt: &str,
        image_url: &str,
        model: ImageModel,
    ) -> Result<GeneratedImageResult, MuapiError> {
        let payload = serde_json::json!({
            "prompt": prompt,
            "image_url": image_url,
            "quality": "high",
        });

        let result = self.submit_and_poll(model.endpoint(), payload, 60, 2000).await?;

        let url = result
            .get("outputs")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|v| v.as_str())
            .or_else(|| result.get("url").and_then(|v| v.as_str()))
            .unwrap_or("")
            .to_string();

        if url.is_empty() {
            return Err(MuapiError::GenerationFailed("No image URL in response".into()));
        }

        Ok(GeneratedImageResult {
            url,
            prompt: prompt.to_string(),
            model: model.endpoint().to_string(),
        })
    }

    /// Generate a video from a text prompt
    pub async fn generate_video(
        &self,
        prompt: &str,
        model: VideoModel,
        aspect_ratio: Option<AspectRatio>,
        duration_secs: Option<u32>,
    ) -> Result<GeneratedVideoResult, MuapiError> {
        let duration = duration_secs.map(|s| match s {
            d if d <= 5 => "5s".to_string(),
            d if d <= 10 => "10s".to_string(),
            _ => "15s".to_string(),
        });

        let payload = VideoPayload {
            prompt: Some(prompt.to_string()),
            aspect_ratio: aspect_ratio.map(|ar| ar.as_str().to_string()),
            duration,
            resolution: None,
            quality: Some("high".to_string()),
            image_url: None,
        };

        let json_payload = serde_json::to_value(&payload)?;
        let result = self.submit_and_poll(model.endpoint(), json_payload, 900, 3000).await?;

        let url = result
            .get("outputs")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|v| v.as_str())
            .or_else(|| result.get("url").and_then(|v| v.as_str()))
            .unwrap_or("")
            .to_string();

        if url.is_empty() {
            return Err(MuapiError::GenerationFailed("No video URL in response".into()));
        }

        Ok(GeneratedVideoResult {
            url,
            prompt: prompt.to_string(),
            model: model.endpoint().to_string(),
            duration_secs,
        })
    }

    /// Generate a video from an image (image-to-video)
    pub async fn generate_i2v(
        &self,
        prompt: &str,
        image_url: &str,
        model: VideoModel,
        aspect_ratio: Option<AspectRatio>,
    ) -> Result<GeneratedVideoResult, MuapiError> {
        let payload = serde_json::json!({
            "prompt": prompt,
            "image_url": image_url,
            "aspect_ratio": aspect_ratio.map(|ar| ar.as_str()),
            "duration": "5s",
            "quality": "high",
        });

        let result = self.submit_and_poll(model.endpoint(), payload, 900, 3000).await?;

        let url = result
            .get("outputs")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|v| v.as_str())
            .or_else(|| result.get("url").and_then(|v| v.as_str()))
            .unwrap_or("")
            .to_string();

        if url.is_empty() {
            return Err(MuapiError::GenerationFailed("No video URL in response".into()));
        }

        Ok(GeneratedVideoResult {
            url,
            prompt: prompt.to_string(),
            model: model.endpoint().to_string(),
            duration_secs: Some(5),
        })
    }

    /// Generate a lip sync video (image + audio → talking video)
    pub async fn generate_lipsync(
        &self,
        image_url: &str,
        audio_url: &str,
        model: LipSyncModel,
        resolution: Option<&str>,
    ) -> Result<GeneratedVideoResult, MuapiError> {
        let payload = serde_json::json!({
            "image_url": image_url,
            "audio_url": audio_url,
            "resolution": resolution.unwrap_or("720p"),
        });

        let result = self.submit_and_poll(model.endpoint(), payload, 900, 3000).await?;

        let url = result
            .get("outputs")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|v| v.as_str())
            .or_else(|| result.get("url").and_then(|v| v.as_str()))
            .unwrap_or("")
            .to_string();

        if url.is_empty() {
            return Err(MuapiError::GenerationFailed("No video URL in response".into()));
        }

        Ok(GeneratedVideoResult {
            url,
            prompt: "Lip sync generation".to_string(),
            model: model.endpoint().to_string(),
            duration_secs: None,
        })
    }

    /// Upload a file to Muapi.ai for use in generation
    pub async fn upload_file(&self, file_bytes: &[u8], filename: &str) -> Result<String, MuapiError> {
        use reqwest::multipart::{Form, Part};

        let part = Part::bytes(file_bytes.to_vec()).file_name(filename.to_string());
        let form = Form::new().part("file", part);

        let url = format!("{}/api/v1/upload_file", BASE_URL);
        let resp = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .multipart(form)
            .send()
            .await?;

        let status = resp.status();
        let text = resp.text().await?;

        if !status.is_success() {
            return Err(MuapiError::Api {
                status: status.as_u16(),
                body: text.chars().take(200).collect(),
            });
        }

        let data: serde_json::Value = serde_json::from_str(&text)?;
        let file_url = data
            .get("url")
            .or_else(|| data.get("file_url"))
            .or_else(|| data.get("data").and_then(|d| d.get("url")))
            .and_then(|v| v.as_str())
            .ok_or_else(|| MuapiError::GenerationFailed("No URL in upload response".into()))?;

        Ok(file_url.to_string())
    }

    /// Generate a cinematic shot with professional camera controls.
    /// Uses Nano Banana 2 model which supports camera/lens/focal/aperture parameters.
    pub async fn generate_cinema(
        &self,
        base_prompt: &str,
        camera: CinemaCamera,
        lens: CinemaLens,
        focal_length: FocalLength,
        aperture: Aperture,
        aspect_ratio: AspectRatio,
        resolution: Resolution,
    ) -> Result<GeneratedImageResult, MuapiError> {
        // Build professional cinema prompt
        let perspective = focal_length.perspective();
        let cinema_prompt = format!(
            "{base_prompt}, shot on a {camera_desc}, \
            using a {lens_desc} at {focal}mm ({perspective}), \
            aperture {aperture_str}, {depth_effect}, \
            cinematic lighting, natural color science, \
            high dynamic range, professional photography, \
            ultra-detailed, {resolution} resolution",
            camera_desc = camera.description(),
            lens_desc = lens.description(),
            focal = focal_length.mm(),
            perspective = perspective,
            aperture_str = aperture.as_str(),
            depth_effect = aperture.description(),
            resolution = resolution.as_str(),
        );

        // Nano Banana 2 supports the best cinema-style generation
        let payload = serde_json::json!({
            "prompt": cinema_prompt,
            "aspect_ratio": aspect_ratio.as_str(),
            "resolution": resolution.as_str(),
        });

        let result = self.submit_and_poll("nano-banana-2", payload, 60, 2000).await?;

        let url = result
            .get("outputs")
            .and_then(|v| v.as_array())
            .and_then(|arr| arr.first())
            .and_then(|v| v.as_str())
            .or_else(|| result.get("url").and_then(|v| v.as_str()))
            .unwrap_or("")
            .to_string();

        if url.is_empty() {
            return Err(MuapiError::GenerationFailed("No image URL in response".into()));
        }

        Ok(GeneratedImageResult {
            url,
            prompt: cinema_prompt,
            model: "nano-banana-2".to_string(),
        })
    }

    /// Check account balance
    pub async fn get_balance(&self) -> Result<serde_json::Value, MuapiError> {
        let url = format!("{}/api/v1/account/balance", BASE_URL);
        let resp = self
            .client
            .get(&url)
            .header("x-api-key", &self.api_key)
            .send()
            .await?;

        let status = resp.status();
        let text = resp.text().await?;

        if !status.is_success() {
            return Err(MuapiError::Api {
                status: status.as_u16(),
                body: text.chars().take(200).collect(),
            });
        }

        Ok(serde_json::from_str(&text)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_endpoints() {
        assert_eq!(ImageModel::FluxDev.endpoint(), "flux-dev");
        assert_eq!(VideoModel::KlingV3.endpoint(), "kling-v3");
        assert_eq!(LipSyncModel::InfiniteTalk.endpoint(), "infinitetalk-image-to-video");
    }

    #[test]
    fn test_aspect_ratios() {
        assert_eq!(AspectRatio::Landscape.as_str(), "16:9");
        assert_eq!(AspectRatio::Portrait.as_str(), "9:16");
    }
}
