'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'

const PROMPTS = [
  {
    id: 'censored',
    label: 'CENSORED FIGURE',
    prompt: 'dark dystopian figure with holographic rainbow censor bars covering the face, red iridescent interference pattern, dark grid background, cinematic lighting, cyberpunk, highly detailed',
  },
  {
    id: 'denied',
    label: 'ACCESS DENIED',
    prompt: 'red ACCESS DENIED rubber stamp on dark background, glitch effect, VHS distortion, holographic interference, dark grid pattern, cyberpunk dystopian, dramatic lighting',
  },
  {
    id: 'classified',
    label: 'CLASSIFIED DOC',
    prompt: 'classified document with black redaction bars, TOP SECRET stamp, dark moody lighting, floating in void, grid background, mysterious atmosphere',
  },
  {
    id: 'glitch',
    label: 'GLITCH STATIC',
    prompt: 'digital glitch interference pattern, holographic rainbow distortion, red and orange tones, VHS tracking error, dark background, classified document fragments, cyberpunk',
  },
]

export function ImageGenSection() {
  const { publicKey } = useWallet()
  const [selectedPrompt, setSelectedPrompt] = useState(0)
  const [customText, setCustomText] = useState('')
  const [generated, setGenerated] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = () => {
    setLoading(true)
    setError('')

    const base = PROMPTS[selectedPrompt].prompt
    const custom = customText.trim() ? `, ${customText.trim()}` : ''
    const seed = Math.floor(Math.random() * 999999)
    const fullPrompt = encodeURIComponent(`${base}${custom}`)

    // Direct Pollinations URL — always works
    const url = `https://image.pollinations.ai/prompt/${fullPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`

    // Preload image
    const img = new Image()
    img.onload = () => {
      setGenerated(prev => [url, ...prev].slice(0, 4))
      setLoading(false)
    }
    img.onerror = () => {
      setError('IMAGE GENERATION FAILED — RETRY')
      setLoading(false)
    }
    img.src = url
  }

  return (
    <section id="images" className="py-24 relative">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-2 bg-rd-red" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-rd-text">
            IMAGE <span className="text-rd-red text-glow">GENERATOR</span>
          </h2>
          <p className="text-rd-muted tracking-widest text-sm">
            100% FREE VIA POLLINATIONS.AI
            {publicKey && (
              <span className="text-rd-red ml-2">
                ({publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)})
              </span>
            )}
          </p>
        </div>

        {/* Style Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {PROMPTS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedPrompt(i)}
              className={`p-3 text-[10px] font-mono tracking-widest border transition-all ${
                selectedPrompt === i
                  ? 'border-rd-red bg-rd-red/10 text-rd-red'
                  : 'border-rd-border bg-rd-card/50 text-rd-muted hover:border-rd-red/30'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom text */}
        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder="Add custom text (optional)..."
          maxLength={100}
          className="w-full px-4 py-3 bg-rd-black border border-rd-border text-rd-text font-mono text-sm focus:border-rd-red focus:outline-none placeholder:text-rd-muted/40 mb-6"
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
        />

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-4 bg-rd-red/20 border border-rd-red/50 text-rd-red font-mono text-sm tracking-widest hover:bg-rd-red/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'GENERATING...' : '█ GENERATE █'}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 border border-rd-red/30 bg-rd-red/5 text-rd-red font-mono text-xs text-center">
            {error}
          </div>
        )}

        {/* Generated Images */}
        <AnimatePresence>
          {generated.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {generated.map((url, i) => (
                <motion.div
                  key={`${url}-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="rd-card p-2"
                >
                  <img
                    src={url}
                    alt={`Generated ${i + 1}`}
                    className="w-full h-64 object-cover rounded"
                  />
                  <div className="mt-2 flex justify-between items-center text-[10px] text-rd-muted">
                    <span>{PROMPTS[selectedPrompt].label}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rd-red hover:underline"
                    >
                      [FULL SIZE]
                    </a>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {generated.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-rd-muted/30 text-6xl mb-4">███</div>
            <p className="text-rd-muted/40 tracking-widest text-xs">
              SELECT A STYLE AND CLICK GENERATE
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
