'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Redacted Protocol style presets matching the images/ folder aesthetic
const STYLES = {
  censoredFigure: {
    name: 'CENSORED FIGURE',
    prompt: (content: string) => `dark dystopian figure with holographic rainbow censor bars covering the face, red and orange iridescent interference pattern dripping down, floating redacted documents in background, dark grid background, cinematic lighting, cyberpunk, Solana Hackathon 2026 aesthetic, ${content}, highly detailed, 8k, photorealistic`,
    negative: 'bright, cheerful, colorful, cartoon, anime, clean, minimal, white background, blurry, low quality, deformed, text, words, letters, watermark',
  },
  accessDenied: {
    name: 'ACCESS DENIED',
    prompt: (content: string) => `red 'ACCESS DENIED' rubber stamp on dark background, glitch effect, VHS distortion, holographic interference, floating classified documents, dark grid pattern, cyberpunk dystopian, ${content}, dramatic lighting, 8k quality, dark moody atmosphere`,
    negative: 'bright, cheerful, clean, minimal, white background, blurry, low quality, cartoon',
  },
  floatingDocuments: {
    name: 'FLOATING DOCUMENTS',
    prompt: (content: string) => `floating redacted documents with black bars and censorship symbols, dark grid background, holographic light effects, classified papers scattered in void, cinematic composition, dark aesthetic, ${content}, ultra detailed, 8k, mysterious`,
    negative: 'bright, clean, minimal, organized, white background, blurry, cheerful',
  },
  circuitBoard: {
    name: 'CIRCUIT BOARD',
    prompt: (content: string) => `circuit board pattern with redacted elements, glowing red traces, holographic interference, dark background with grid overlay, cyberpunk tech aesthetic, ${content}, highly detailed, macro photography style, dark and moody`,
    negative: 'bright, clean, simple, white background, blurry, low quality, cheerful',
  },
  classifiedDoc: {
    name: 'CLASSIFIED DOCUMENT',
    prompt: (content: string) => `classified document with black redaction bars, TOP SECRET stamp, holographic light effects, dark moody lighting, floating in void, grid background, ${content}, photorealistic, 8k quality, mysterious atmosphere`,
    negative: 'bright, cheerful, clean, white background, blurry, cartoon, simple',
  },
  glitchInterference: {
    name: 'GLITCH INTERFERENCE',
    prompt: (content: string) => `digital glitch interference pattern, holographic rainbow distortion, red and orange tones, VHS tracking error effect, dark background, classified document fragments visible through static, ${content}, cyberpunk, cinematic, dark and mysterious`,
    negative: 'bright, clean, stable, white background, blurry, low quality, cheerful',
  },
}

type StyleKey = keyof typeof STYLES

export function ImageGenSection() {
  const [selectedStyle, setSelectedStyle] = useState<StyleKey>('censoredFigure')
  const [content, setContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [error, setError] = useState('')
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [videoFrames, setVideoFrames] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleGenerate = async () => {
    if (!content.trim()) {
      setError('CONTENT REQUIRED')
      return
    }

    setError('')
    setGenerating(true)

    try {
      // Load Puter.js if not already loaded
      if (typeof (window as any).puter === 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://js.puter.com/v2/'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Puter.js'))
          document.head.appendChild(script)
        })
      }

      const style = STYLES[selectedStyle]
      const prompt = style.prompt(content)

      // Generate image via Puter.js (100% free)
      const img = await (window as any).puter.ai.txt2img(prompt, {
        model: 'flux',
        width: 1024,
        height: 1024,
        negative_prompt: style.negative,
      })

      // Convert to base64 for display
      const canvas = document.createElement('canvas')
      canvas.width = img.width || 1024
      canvas.height = img.height || 1024
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const base64 = canvas.toDataURL('image/jpeg', 0.9)

      setGeneratedImages(prev => [base64, ...prev].slice(0, 6)) // Keep last 6
    } catch (err: any) {
      setError(err.message || 'Image generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!content.trim()) {
      setError('CONTENT REQUIRED')
      return
    }

    setError('')
    setGeneratingVideo(true)
    setVideoFrames([])

    try {
      if (typeof (window as any).puter === 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://js.puter.com/v2/'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Puter.js'))
          document.head.appendChild(script)
        })
      }

      const style = STYLES[selectedStyle]
      const frameCount = 8
      const frames: string[] = []

      for (let i = 0; i < frameCount; i++) {
        const frameContent = `${content} (variation ${i + 1}/${frameCount})`
        const prompt = style.prompt(frameContent)

        const img = await (window as any).puter.ai.txt2img(prompt, {
          model: 'flux',
          width: 512,
          height: 512,
          negative_prompt: style.negative,
        })

        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        frames.push(canvas.toDataURL('image/jpeg', 0.8))

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000))
      }

      setVideoFrames(frames)

      // Create animated GIF using canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')!
        canvas.width = 512
        canvas.height = 512

        // Simple animation preview (in production, use gif.js)
        let frameIndex = 0
        const animate = () => {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 512, 512)
          }
          img.src = frames[frameIndex]
          frameIndex = (frameIndex + 1) % frames.length
        }

        const interval = setInterval(animate, 200)
        // Stop after 10 seconds
        setTimeout(() => clearInterval(interval), 10000)
      }
    } catch (err: any) {
      setError(err.message || 'Video generation failed')
    } finally {
      setGeneratingVideo(false)
    }
  }

  const downloadImage = (dataUrl: string, index: number) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `redacted-${selectedStyle}-${Date.now()}-${index}.jpg`
    a.click()
  }

  return (
    <section id="images" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">
            FILE #0006
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-red">IMAGE</span>{' '}
            <span className="text-rd-text">GENERATOR</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm">
            GENERATE REDACTED PROTOCOL STYLED IMAGES & VIDEOS — 100% FREE VIA PUTER.JS
          </p>
        </div>

        {/* Style Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {(Object.entries(STYLES) as [StyleKey, typeof STYLES.censoredFigure][]).map(([key, style]) => (
            <button
              key={key}
              onClick={() => setSelectedStyle(key)}
              className={`p-3 border text-xs tracking-wider transition-all ${
                selectedStyle === key
                  ? 'border-rd-red bg-rd-red/10 text-rd-red'
                  : 'border-rd-border text-rd-muted hover:border-rd-muted/50'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>

        {/* Content Input */}
        <div className="rd-card max-w-2xl mx-auto mb-12">
          <div className="mb-6">
            <label className="block text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">
              CONTENT / THEME
            </label>
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="e.g., classified intelligence report, secret operation..."
              className="input-rd"
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 border border-rd-red/40 bg-rd-red/10 text-rd-red text-xs tracking-wider">
              ⚠ {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleGenerate}
              disabled={generating || !content.trim()}
              className="flex-1 btn-redacted disabled:opacity-40"
            >
              {generating ? 'GENERATING...' : '█ GENERATE IMAGE █'}
            </button>
            <button
              onClick={handleGenerateVideo}
              disabled={generatingVideo || !content.trim()}
              className="flex-1 btn-ghost disabled:opacity-40"
            >
              {generatingVideo ? 'GENERATING...' : '█ GENERATE VIDEO █'}
            </button>
          </div>
        </div>

        {/* Generated Images Grid */}
        {generatedImages.length > 0 && (
          <div className="mb-16">
            <div className="text-xs text-rd-muted/50 tracking-widest mb-4 text-center">
              GENERATED IMAGES
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {generatedImages.map((img, i) => (
                <motion.div
                  key={`${i}-${img.slice(0, 20)}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rd-card p-2 group relative"
                >
                  <img
                    src={img}
                    alt={`Generated ${i + 1}`}
                    className="w-full aspect-square object-cover"
                  />
                  <button
                    onClick={() => downloadImage(img, i)}
                    className="absolute inset-0 bg-rd-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <span className="btn-ghost text-xs">DOWNLOAD</span>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Video Frames Preview */}
        {videoFrames.length > 0 && (
          <div className="mb-16">
            <div className="text-xs text-rd-muted/50 tracking-widest mb-4 text-center">
              VIDEO FRAMES (ANIMATION PREVIEW)
            </div>
            <div className="rd-card">
              {/* Animation Canvas */}
              <canvas
                ref={canvasRef}
                className="w-full max-w-md mx-auto block"
              />
              <div className="grid grid-cols-4 gap-2 mt-4">
                {videoFrames.map((frame, i) => (
                  <img
                    key={i}
                    src={frame}
                    alt={`Frame ${i + 1}`}
                    className="w-full aspect-square object-cover border border-rd-border"
                  />
                ))}
              </div>
              <div className="text-center mt-4">
                <button
                  onClick={() => {
                    // Download all frames as a zip (in production)
                    videoFrames.forEach((frame, i) => {
                      const a = document.createElement('a')
                      a.href = frame
                      a.download = `redacted-video-frame-${i + 1}.jpg`
                      a.click()
                    })
                  }}
                  className="btn-ghost text-xs"
                >
                  DOWNLOAD ALL FRAMES
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rd-card max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-[10px] text-rd-muted/50 tracking-[0.2em] mb-1">
              HOW IT WORKS
            </div>
            <div className="text-lg font-bold text-rd-text">
              FREE IMAGE GENERATION
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { step: '1', label: 'CHOOSE STYLE', desc: 'Select from 6 Redacted Protocol styles' },
              { step: '2', label: 'ENTER CONTENT', desc: 'Describe the theme or topic' },
              { step: '3', label: 'PUTER.JS AI', desc: '100% free, no API key needed' },
              { step: '4', label: 'DOWNLOAD', desc: 'Save images or video frames' },
            ].map((item, i) => (
              <div key={i}>
                <div className="text-rd-red text-2xl font-bold mb-1">{item.step}</div>
                <div className="text-xs font-bold text-rd-text mb-1">{item.label}</div>
                <div className="text-[10px] text-rd-muted/40">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Style reference */}
        <div className="mt-12 text-center">
          <p className="text-xs text-rd-muted/30 tracking-widest">
            BASED ON THE REDACTED PROTOCOL AESTHETIC — HOLOGRAPHIC CENSOR BARS, DARK GRIDS, FLOATING DOCUMENTS
          </p>
        </div>
      </div>
    </section>
  )
}
