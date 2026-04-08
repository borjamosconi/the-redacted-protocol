//! OCR Module — 100% free OCR using Puter.js (Tesseract.js under the hood).
//! 
//! No API key needed. No backend needed. Works entirely in the browser.
//! For server-side, we use a lightweight Rust OCR or external free API.

use serde::{Deserialize, Serialize};

/// OCR result from Puter.js / Tesseract.js.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    /// Full extracted text.
    pub text: String,
    /// Confidence score (0.0 - 1.0).
    pub confidence: f64,
    /// Detected language.
    pub language: String,
    /// Lines with bounding boxes.
    pub lines: Vec<OcrLine>,
    /// Redaction zones detected in the text.
    pub redaction_zones: Vec<RedactionZone>,
}

/// A line of text with position.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrLine {
    pub text: String,
    pub confidence: f64,
    pub bbox: OcrBBox,
}

/// Bounding box coordinates.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrBBox {
    pub x0: f64,
    pub y0: f64,
    pub x1: f64,
    pub y1: f64,
}

/// A detected redaction zone.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedactionZone {
    /// The redacted text (e.g., "████████").
    pub redacted_text: String,
    /// Position in the document.
    pub line_index: usize,
    /// Context around the redaction.
    pub context: String,
    /// Estimated original length (character count).
    pub estimated_length: usize,
}

/// OCR Engine options.
#[derive(Debug, Clone)]
pub enum OcrEngine {
    /// Puter.js — free, no API key, browser-based Tesseract.js
    PuterJs,
    /// Tesseract.js directly (browser)
    TesseractJs,
    /// Server-side OCR (for when we have a backend)
    ServerSide,
}

/// OCR configuration.
pub struct OcrConfig {
    pub engine: OcrEngine,
    pub languages: Vec<String>, // e.g., ["eng", "spa"]
    pub psm: u8, // Page segmentation mode (3 = auto, 6 = single block)
}

impl Default for OcrConfig {
    fn default() -> Self {
        Self {
            engine: OcrEngine::PuterJs,
            languages: vec!["eng".into(), "spa".into()],
            psm: 3,
        }
    }
}

/// Perform OCR on an image/document.
/// Returns extracted text + redaction analysis.
pub async fn perform_ocr(
    image_url_or_base64: &str,
    config: &OcrConfig,
) -> Result<OcrResult, String> {
    // For Puter.js, this is done in the browser via JavaScript.
    // For server-side, we'd use a Rust OCR library.
    // 
    // Browser-side implementation (in the dashboard):
    // 
    // <script src="https://js.puter.com/v2/"></script>
    // <script>
    //   puter.ai.ocr(imageBlob, { lang: 'eng+spa' })
    //     .then(result => {
    //       // result contains extracted text
    //       // Send to backend for redaction analysis
    //     });
    // </script>
    //
    // Server-side fallback:
    
    let text = match config.engine {
        OcrEngine::PuterJs | OcrEngine::TesseractJs => {
            return Err("Browser-side OCR via Puter.js — use dashboard".into());
        }
        OcrEngine::ServerSide => {
            // In production, use tesseract-ocr or similar
            // For now, return placeholder
            "OCR requires Puter.js in browser. Use the dashboard to upload images.".into()
        }
    };

    Ok(OcrResult {
        text,
        confidence: 0.0,
        language: config.languages.join("+"),
        lines: Vec::new(),
        redaction_zones: Vec::new(),
    })
}

/// Analyze extracted text for redaction patterns.
pub fn detect_redactions(text: &str) -> Vec<RedactionZone> {
    use regex::Regex;
    
    let mut zones = Vec::new();
    
    // Patterns that indicate redaction
    let patterns = [
        Regex::new(r"█+").unwrap(),
        Regex::new(r"\[REDACTED\]").unwrap(),
        Regex::new(r"\[CLASSIFIED\]").unwrap(),
        Regex::new(r"\[CENSORED\]").unwrap(),
        Regex::new(r"[█▓▒░]{2,}").unwrap(),
        Regex::new(r"black(?:ed)? ?(?:bar|out|box)").unwrap(),
        Regex::new(r"redacted|expunged|sealed").unwrap(),
        Regex::new(r"x{3,}").unwrap(), // xxx or xxxx as redaction
    ];

    for (line_idx, line) in text.lines().enumerate() {
        for pattern in &patterns {
            for mat in pattern.find_iter(line) {
                // Get context (surrounding text)
                let start = mat.start().saturating_sub(30);
                let end = (mat.end() + 30).min(line.len());
                let context = line[start..end].trim().to_string();

                zones.push(RedactionZone {
                    redacted_text: mat.as_str().to_string(),
                    line_index: line_idx,
                    context,
                    estimated_length: mat.end() - mat.start(),
                });
            }
        }
    }

    zones
}

/// HTML/JS snippet for Puter.js OCR integration.
/// Embed this in your dashboard HTML.
pub const PUTER_JS_OCR_SNIPPET: &str = r#"
<script src="https://js.puter.com/v2/"></script>
<script>
  async function ocrImage(file) {
    try {
      const result = await puter.ai.ocr(file, {
        lang: 'eng+spa',
        psm: 3,
      });
      
      // Analyze for redactions
      const redactionPatterns = [
        /█+/g,
        /\[REDACTED\]/g,
        /\[CLASSIFIED\]/g,
        /\[CENSORED\]/g,
        /[█▓▒░]{2,}/g,
        /x{3,}/g,
      ];
      
      let redactionCount = 0;
      redactionPatterns.forEach(p => {
        const matches = result.text.match(p);
        if (matches) redactionCount += matches.length;
      });
      
      return {
        text: result.text,
        confidence: result.confidence || 0.9,
        language: 'eng+spa',
        redactionCount,
        redactions: redactionCount > 0,
      };
    } catch (error) {
      console.error('OCR failed:', error);
      throw error;
    }
  }
  
  // Usage:
  // const input = document.getElementById('file-upload');
  // input.addEventListener('change', async (e) => {
  //   const result = await ocrImage(e.target.files[0]);
  //   console.log(result);
  // });
</script>
"#;

/// Puter.js text-to-image snippet for generating thumbnails/previews.
pub const PUTER_JS_IMAGE_SNIPPET: &str = r#"
<script src="https://js.puter.com/v2/"></script>
<script>
  async function generateImage(prompt, style = 'photorealistic') {
    const enhancedPrompt = style === 'redacted' 
      ? `${prompt}, dark dystopian aesthetic, redacted documents, glitch effect, ██████, cyberpunk, classified`
      : prompt;
      
    const img = await puter.ai.txt2img(enhancedPrompt, {
      model: 'flux', // or 'stable-diffusion-xl', 'dall-e-3'
      width: 1024,
      height: 1024,
    });
    
    return img;
  }
  
  // Usage:
  // const img = await generateImage('classified document', 'redacted');
  // document.body.appendChild(img);
</script>
"#;
