//! Redacted Protocol Image & Video Generator
//!
//! Generates images and videos in the signature Redacted Protocol aesthetic:
//! - Dark dystopian backgrounds
//! - Holographic rainbow censor bars
//! - Floating redacted documents
//! - VHS/glitch effects
//! - Grid backgrounds
//! - "ACCESS DENIED" stamps
//! - Circuit board patterns
//!
//! Uses Muapi.ai for server-side generation (200+ models).

use serde::{Deserialize, Serialize};

/// Image generation style presets matching the Redacted Protocol aesthetic.
#[derive(Debug, Clone, Copy)]
pub enum RedactedStyle {
    /// Main aesthetic: holographic censor bars, dark background, floating docs
    CensoredFigure,
    /// "ACCESS DENIED" stamp with glitch effects
    AccessDenied,
    /// Floating redacted documents with grid background
    FloatingDocuments,
    /// Circuit board with redacted elements
    CircuitBoard,
    /// Classified document with black bars
    ClassifiedDoc,
    /// Glitch interference pattern
    GlitchInterference,
}

impl RedactedStyle {
    /// Get the prompt template for this style.
    pub fn prompt(&self, content: &str) -> String {
        match self {
            RedactedStyle::CensoredFigure => format!(
                "dark dystopian figure with holographic rainbow censor bars \
                covering the face, red and orange iridescent interference pattern \
                dripping down, floating redacted documents in background, \
                dark grid background, cinematic lighting, cyberpunk, \
                Solana Hackathon 2026 aesthetic, {}, \
                highly detailed, 8k, unreal engine style, photorealistic, mysterious atmosphere",
                content
            ),
            RedactedStyle::AccessDenied => format!(
                "red 'ACCESS DENIED' rubber stamp on dark background, \
                glitch effect, VHS distortion, holographic interference, \
                floating classified documents, dark grid pattern, \
                cyberpunk dystopian, {}, \
                dramatic lighting, 8k quality, dark moody atmosphere",
                content
            ),
            RedactedStyle::FloatingDocuments => format!(
                "floating redacted documents with black bars and ███ symbols, \
                dark grid background, holographic light effects, \
                classified papers scattered in void, \
                cinematic composition, dark aesthetic, {}, \
                ultra detailed, 8k, mysterious",
                content
            ),
            RedactedStyle::CircuitBoard => format!(
                "circuit board pattern with redacted elements, \
                glowing red traces, holographic interference, \
                dark background with grid overlay, \
                cyberpunk tech aesthetic, {}, \
                highly detailed, macro photography style, dark and moody",
                content
            ),
            RedactedStyle::ClassifiedDoc => format!(
                "classified document with black redaction bars, \
                TOP SECRET stamp, holographic light effects, \
                dark moody lighting, floating in void, \
                grid background, {}, \
                photorealistic, 8k quality, mysterious atmosphere",
                content
            ),
            RedactedStyle::GlitchInterference => format!(
                "digital glitch interference pattern, \
                holographic rainbow distortion, red and orange tones, \
                VHS tracking error effect, dark background, \
                classified document fragments visible through static, \
                {}, cyberpunk, cinematic, dark and mysterious",
                content
            ),
        }
    }

    /// Get a negative prompt to avoid unwanted elements.
    pub fn negative_prompt(&self) -> String {
        "bright, cheerful, colorful, cartoon, anime, \
         clean, minimal, white background, \
         text, words, letters, watermark, \
         blurry, low quality, deformed"
            .into()
    }
}

/// Generated image result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedImage {
    /// URL of the generated image.
    pub url: String,
    /// Width in pixels.
    pub width: u32,
    /// Height in pixels.
    pub height: u32,
    /// Style used.
    pub style: String,
    /// Prompt used.
    pub prompt: String,
    /// Model used for generation.
    pub model: String,
}

/// Video frame for animation generation.
#[derive(Debug, Clone)]
pub struct VideoFrame {
    pub image: GeneratedImage,
    pub duration_ms: u32,
    pub transition: TransitionType,
}

#[derive(Debug, Clone)]
pub enum TransitionType {
    Cut,
    Fade(u32), // fade duration in ms
    Glitch,
}

/// Animated video result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedVideo {
    /// URL of the generated video.
    pub url: String,
    /// Duration in seconds.
    pub duration_secs: u32,
    /// Resolution.
    pub width: u32,
    pub height: u32,
    /// Model used.
    pub model: String,
}

/// Image generation configuration.
pub struct ImageConfig {
    pub width: u32,
    pub height: u32,
    pub style: RedactedStyle,
}

impl Default for ImageConfig {
    fn default() -> Self {
        Self {
            width: 1024,
            height: 1024,
            style: RedactedStyle::CensoredFigure,
        }
    }
}

/// Build a Muapi-ready prompt from content + style.
pub fn build_prompt(content: &str, style: RedactedStyle) -> String {
    style.prompt(content)
}

/// Pre-built prompts for common Redacted Protocol content.
pub const PROMPT_LIBRARY: &[(&str, RedactedStyle)] = &[
    ("classified intelligence report", RedactedStyle::CensoredFigure),
    ("secret military operation", RedactedStyle::AccessDenied),
    ("redacted government document", RedactedStyle::ClassifiedDoc),
    ("covert surveillance data", RedactedStyle::GlitchInterference),
    ("black budget program files", RedactedStyle::FloatingDocuments),
    ("TS/SCI compartmented intel", RedactedStyle::CircuitBoard),
    ("NOFORN classified brief", RedactedStyle::AccessDenied),
    ("enhanced interrogation records", RedactedStyle::ClassifiedDoc),
    ("extraordinary rendition files", RedactedStyle::GlitchInterference),
    ("deep state communications", RedactedStyle::CensoredFigure),
    ("false flag operation evidence", RedactedStyle::FloatingDocuments),
    ("mass surveillance database", RedactedStyle::CircuitBoard),
    ("predictive programming materials", RedactedStyle::GlitchInterference),
    ("manufactured consent documents", RedactedStyle::CensoredFigure),
    ("controlled opposition files", RedactedStyle::AccessDenied),
];
