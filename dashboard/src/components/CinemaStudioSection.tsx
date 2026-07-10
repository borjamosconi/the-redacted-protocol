'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'

const CAMERAS = [
  { id: 'modular_8k', name: 'Modular 8K Digital' },
  { id: 'full_frame', name: 'Full-Frame Cine Digital' },
  { id: 'grand_70mm', name: 'Grand Format 70mm Film' },
  { id: 's35', name: 'Studio Digital S35' },
  { id: 'classic_16mm', name: 'Classic 16mm Film' },
  { id: 'large_format', name: 'Premium Large Format' },
]

const LENSES = [
  { id: 'creative_tilt', name: 'Creative Tilt' },
  { id: 'compact_anamorphic', name: 'Compact Anamorphic' },
  { id: 'extreme_macro', name: 'Extreme Macro' },
  { id: '70s_prime', name: "70s Cinema Prime" },
  { id: 'classic_anamorphic', name: 'Classic Anamorphic' },
  { id: 'modern_prime', name: 'Premium Modern Prime' },
  { id: 'warm_prime', name: 'Warm Cinema Prime' },
  { id: 'swirl_bokeh', name: 'Swirl Bokeh Portrait' },
  { id: 'vintage', name: 'Vintage Prime' },
  { id: 'halation', name: 'Halation Diffusion' },
  { id: 'clinical', name: 'Clinical Sharp' },
]

const FOCAL_LENGTHS = [
  { value: 8, label: '8mm Ultra-Wide' },
  { value: 14, label: '14mm Wide' },
  { value: 24, label: '24mm Dynamic' },
  { value: 35, label: '35mm Natural' },
  { value: 50, label: '50mm Portrait' },
  { value: 85, label: '85mm Tight' },
]

const APERTURES = [
  { value: 'f/1.4', label: 'f/1.4 — Shallow DOF' },
  { value: 'f/4', label: 'f/4 — Balanced' },
  { value: 'f/11', label: 'f/11 — Deep Focus' },
]

const ASPECT_RATIOS = ['16:9', '21:9', '9:16', '1:1', '4:5']
const RESOLUTIONS = ['1K', '2K', '4K']

const CINEMA_PRESETS = [
  { id: 'classified_brief', label: 'CLASSIFIED BRIEF', icon: '🔴' },
  { id: 'surveillance', label: 'SURVEILLANCE', icon: '📡' },
  { id: 'declassified', label: 'DECLASSIFIED', icon: '📄' },
  { id: 'access_denied', label: 'ACCESS DENIED', icon: '🚫' },
  { id: 'black_ops', label: 'BLACK OPS', icon: '⚫' },
  { id: 'whistleblower', label: 'WHISTLEBLOWER', icon: '🕵️' },
  { id: 'deep_state', label: 'DEEP STATE', icon: '🕸️' },
  { id: 'signal_intercept', label: 'SIGNAL INTERCEPT', icon: '📻' },
]

interface CinemaShot {
  imageUrl: string
  prompt: string
  camera: string
  lens: string
  focalLength: string
  aperture: string
  aspectRatio: string
  resolution: string
}

export function CinemaStudioSection() {
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [camera, setCamera] = useState('modular_8k')
  const [lens, setLens] = useState('classic_anamorphic')
  const [focalLength, setFocalLength] = useState(35)
  const [aperture, setAperture] = useState('f/4')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [resolution, setResolution] = useState('4K')
  const [shots, setShots] = useState<CinemaShot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError('')

    try {
      const resp = await fetch('/api/cinema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          preset: selectedPreset,
          camera,
          lens,
          focalLength,
          aperture,
          aspectRatio,
          resolution,
        }),
      })

      const data = await resp.json()

      if (!resp.ok || !data.success) {
        setError(data.error || 'GENERATION FAILED')
        setLoading(false)
        return
      }

      setShots(prev => [data as CinemaShot, ...prev].slice(0, 8))
      setLoading(false)
    } catch {
      setError('NETWORK ERROR')
      setLoading(false)
    }
  }

  return (
    <section id="cinema" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-2 bg-rd-red" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-rd-text">
            CINEMA <span className="text-rd-red text-glow">STUDIO</span>
          </h2>
          <p className="text-rd-muted tracking-widest text-sm">
            PROFESSIONAL CAMERA CONTROLS — MUAPI.AI
          </p>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <label className="block text-xs text-rd-muted tracking-widest mb-3">
            REDACTED PROTOCOL PRESETS
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CINEMA_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={`p-3 text-xs font-mono tracking-wider border transition-all ${
                  selectedPreset === preset.id
                    ? 'border-rd-red bg-rd-red/10 text-rd-red'
                    : 'border-rd-border bg-rd-card/50 text-rd-muted hover:border-rd-red/30'
                }`}
              >
                <span className="text-base">{preset.icon}</span> {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom prompt */}
        <div className="mb-6">
          <label className="block text-xs text-rd-muted tracking-widest mb-2">
            CUSTOM PROMPT (OVERRIDES PRESET)
          </label>
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Describe your cinematic scene..."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 bg-rd-black border border-rd-border text-rd-text font-mono text-sm focus:border-rd-red focus:outline-none placeholder:text-rd-muted/40 resize-none"
          />
          <div className="text-xs text-rd-muted/30 mt-1 text-right">
            {customPrompt.length}/500
          </div>
        </div>

        {/* Advanced controls toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full py-3 border border-rd-border bg-rd-card/30 text-rd-muted text-xs tracking-widest hover:border-rd-red/30 transition-all mb-6"
        >
          {showAdvanced ? '▾' : '▸'} CAMERA CONTROLS
        </button>

        {/* Advanced controls */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border border-rd-border bg-rd-card/30">
                {/* Camera */}
                <div>
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">CAMERA</label>
                  <select
                    value={camera}
                    onChange={e => setCamera(e.target.value)}
                    className="w-full px-3 py-2 bg-rd-black border border-rd-border text-rd-text font-mono text-xs focus:border-rd-red focus:outline-none"
                  >
                    {CAMERAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Lens */}
                <div>
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">LENS</label>
                  <select
                    value={lens}
                    onChange={e => setLens(e.target.value)}
                    className="w-full px-3 py-2 bg-rd-black border border-rd-border text-rd-text font-mono text-xs focus:border-rd-red focus:outline-none"
                  >
                    {LENSES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>

                {/* Focal Length */}
                <div>
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">FOCAL LENGTH</label>
                  <select
                    value={focalLength}
                    onChange={e => setFocalLength(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-rd-black border border-rd-border text-rd-text font-mono text-xs focus:border-rd-red focus:outline-none"
                  >
                    {FOCAL_LENGTHS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>

                {/* Aperture */}
                <div>
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">APERTURE</label>
                  <select
                    value={aperture}
                    onChange={e => setAperture(e.target.value)}
                    className="w-full px-3 py-2 bg-rd-black border border-rd-border text-rd-text font-mono text-xs focus:border-rd-red focus:outline-none"
                  >
                    {APERTURES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">ASPECT RATIO</label>
                  <select
                    value={aspectRatio}
                    onChange={e => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 bg-rd-black border border-rd-border text-rd-text font-mono text-xs focus:border-rd-red focus:outline-none"
                  >
                    {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                  </select>
                </div>

                {/* Resolution */}
                <div>
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">RESOLUTION</label>
                  <select
                    value={resolution}
                    onChange={e => setResolution(e.target.value)}
                    className="w-full px-3 py-2 bg-rd-black border border-rd-border text-rd-text font-mono text-xs focus:border-rd-red focus:outline-none"
                  >
                    {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || (!customPrompt && !selectedPreset)}
          className="w-full py-4 bg-rd-red/20 border border-rd-red/50 text-rd-red font-mono text-sm tracking-widest hover:bg-rd-red/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '🎬 GENERATING CINEMATIC SHOT...' : '🎬 GENERATE CINEMA SHOT'}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 border border-rd-red/30 bg-rd-red/5 text-rd-red font-mono text-xs text-center">
            {error}
          </div>
        )}

        {/* Generated shots gallery */}
        <AnimatePresence>
          {shots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <h3 className="text-sm text-rd-muted tracking-widest mb-4">
                GENERATED SHOTS ({shots.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shots.map((shot, i) => (
                  <motion.div
                    key={`${shot.imageUrl}-${i}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="rd-card p-3"
                  >
                    <div
                      className="w-full overflow-hidden bg-rd-black"
                      style={{ aspectRatio: shot.aspectRatio.replace(':', '/') }}
                    >
                      <img
                        src={shot.imageUrl}
                        alt="Cinema shot"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-3 space-y-1 text-[10px] font-mono text-rd-muted">
                      <div className="flex justify-between">
                        <span>{shot.camera} + {shot.lens}</span>
                        <span>{shot.focalLength} @ {shot.aperture}</span>
                      </div>
                      <div className="flex justify-between text-rd-muted/40">
                        <span>{shot.aspectRatio} — {shot.resolution}</span>
                        <a
                          href={shot.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-rd-red hover:underline"
                        >
                          [FULL SIZE]
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {shots.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-rd-muted/30 text-6xl mb-4">🎬</div>
            <p className="text-rd-muted/40 tracking-widest text-xs">
              SELECT A PRESET OR ENTER A CUSTOM PROMPT
            </p>
            <p className="text-rd-muted/20 text-xs mt-2">
              6 CAMERAS × 11 LENSES × 6 FOCAL LENGTHS × 3 APERTURES
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
