import { NextRequest, NextResponse } from 'next/server'

// Redacted Protocol image style presets (matching images/ folder aesthetic)
const IMAGE_STYLES: Record<string, string> = {
  censored_figure: "dark dystopian figure with holographic rainbow censor bars covering the face, red and orange iridescent interference pattern dripping down, floating redacted documents in background, dark grid background, cinematic lighting, cyberpunk, Solana Hackathon 2026 aesthetic, highly detailed, 8k, photorealistic, mysterious atmosphere",
  access_denied: "red 'ACCESS DENIED' rubber stamp on dark background, glitch effect, VHS distortion, holographic interference, floating classified documents, dark grid pattern, cyberpunk dystopian, dramatic lighting, 8k quality, dark moody atmosphere",
  floating_documents: "floating redacted documents with black bars and censorship symbols, dark grid background, holographic light effects, classified papers scattered in void, cinematic composition, dark aesthetic, ultra detailed, 8k, mysterious",
  circuit_board: "circuit board pattern with redacted elements, glowing red traces, holographic interference, dark background with grid overlay, cyberpunk tech aesthetic, highly detailed, macro photography style, dark and moody",
  classified_doc: "classified document with black redaction bars, TOP SECRET stamp, holographic light effects, dark moody lighting, floating in void, grid background, photorealistic, 8k quality, mysterious atmosphere",
  glitch_interference: "digital glitch interference pattern, holographic rainbow distortion, red and orange tones, VHS tracking error effect, dark background, classified document fragments visible through static, cyberpunk, cinematic, dark and mysterious",
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const style = searchParams.get('style') || 'censored_figure'
  const content = searchParams.get('content') || ''

  const stylePrompt = IMAGE_STYLES[style] || IMAGE_STYLES.censored_figure
  const fullPrompt = content ? `${stylePrompt}, ${content}` : stylePrompt

  // In production, this would call an image generation API
  // For now, return the prompt so the frontend can generate via Puter.js
  return NextResponse.json({
    prompt: fullPrompt,
    style,
    model: 'flux',
    width: 1024,
    height: 1024,
    negative_prompt: "bright, cheerful, colorful, cartoon, anime, clean, minimal, white background, blurry, low quality, deformed, text, words, letters, watermark",
    // Placeholder - in production, generate image here
    image_url: null,
    puter_js_snippet: `
      <script src="https://js.puter.com/v2/"></script>
      <script>
        puter.ai.txt2img("${fullPrompt.replace(/"/g, '\\"')}", {
          model: 'flux',
          width: 1024,
          height: 1024,
        }).then(img => document.body.appendChild(img));
      </script>
    `,
  })
}
