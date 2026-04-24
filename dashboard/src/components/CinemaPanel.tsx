'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────
interface GenerationResult {
  success: boolean
  outputUrl: string
  isVideo: boolean
  type: 'image' | 'video'
  model: string
  prompt: string
  keyUsed: number
  camera?: string
  lens?: string
  focalLength?: string
  aperture?: string
  aspectRatio: string
  resolution: string
  error?: string
}

// ── Config (mirrors server) ────────────────────────────────────────────────────
const MODELS = [
  { id: 'nano-banana-2', name: 'Nano Banana 2', type: 'image', icon: '📸', desc: 'Cinematic AI image' },
  { id: 'wan-2.1',       name: 'Wan 2.1 T2V',  type: 'video', icon: '🎬', desc: 'Text → Video' },
  { id: 'wan-2.1-i2v',   name: 'Wan 2.1 I2V',  type: 'video', icon: '▶️', desc: 'Image → Video' },
]

const CAMERAS = [
  { id: 'modular_8k',   name: '8K Digital' },
  { id: 'full_frame',   name: 'Full-Frame' },
  { id: 'grand_70mm',   name: '70mm Film' },
  { id: 's35',          name: 'S35 Digital' },
  { id: 'classic_16mm', name: '16mm Film' },
  { id: 'large_format', name: 'Large Format' },
]

const LENSES = [
  { id: 'compact_anamorphic', name: 'Anamorphic' },
  { id: 'classic_anamorphic', name: 'Classic Ana.' },
  { id: 'modern_prime',       name: 'Modern Prime' },
  { id: 'warm_prime',         name: 'Warm Prime' },
  { id: '70s_prime',          name: '70s Prime' },
  { id: 'vintage',            name: 'Vintage' },
  { id: 'extreme_macro',      name: 'Macro' },
  { id: 'creative_tilt',      name: 'Tilt-Shift' },
  { id: 'swirl_bokeh',        name: 'Swirl Bokeh' },
  { id: 'halation',           name: 'Halation' },
  { id: 'clinical',           name: 'Ultra Sharp' },
]

const FOCAL_LENGTHS = [8, 14, 24, 35, 50, 85]
const APERTURES     = ['f/1.4', 'f/4', 'f/11']
const ASPECT_RATIOS = ['16:9', '21:9', '9:16', '1:1', '4:5']
const RESOLUTIONS   = ['1K', '2K', '4K']

const PRESETS = [
  { id: 'classified_brief',  label: 'Classified Brief',  emoji: '📋' },
  { id: 'surveillance',      label: 'Surveillance',       emoji: '👁️' },
  { id: 'declassified',      label: 'Declassified',       emoji: '📄' },
  { id: 'access_denied',     label: 'Access Denied',      emoji: '🚫' },
  { id: 'black_ops',         label: 'Black Ops',          emoji: '🕵️' },
  { id: 'whistleblower',     label: 'Whistleblower',      emoji: '🌧️' },
  { id: 'deep_state',        label: 'Deep State',         emoji: '🔗' },
  { id: 'signal_intercept',  label: 'Signal Intercept',   emoji: '📡' },
  { id: 'rdx_launch',        label: '$RDX Launch',        emoji: '🔴' },
  { id: 'blockchain_node',   label: 'Blockchain Node',    emoji: '⬡' },
]

const DURATIONS = [3, 5, 8, 10]

// ── Component ──────────────────────────────────────────────────────────────────
export function CinemaPanel() {
  // Form state
  const [model,       setModel]       = useState('nano-banana-2')
  const [preset,      setPreset]      = useState<string>('')
  const [customPrompt,setCustomPrompt]= useState('')
  const [camera,      setCamera]      = useState('modular_8k')
  const [lens,        setLens]        = useState('classic_anamorphic')
  const [focalLength, setFocalLength] = useState(35)
  const [aperture,    setAperture]    = useState('f/4')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [resolution,  setResolution]  = useState('4K')
  const [duration,    setDuration]    = useState(5)

  // Generation state
  const [generating,  setGenerating]  = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [result,      setResult]      = useState<GenerationResult | null>(null)
  const [error,       setError]       = useState('')
  const [history,     setHistory]     = useState<GenerationResult[]>([])

  const selectedModel = MODELS.find(m => m.id === model) || MODELS[0]
  const isVideo       = selectedModel.type === 'video'

  // ── Generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!preset && !customPrompt.trim()) {
      setError('Choose a preset or enter a custom prompt.')
      return
    }
    setGenerating(true)
    setError('')
    setResult(null)
    setProgress(0)

    // Simulate progress bar while waiting
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + (isVideo ? 1.2 : 2.5), 92))
    }, 1500)

    try {
      const body: Record<string, any> = {
        model,
        preset:      preset || undefined,
        prompt:      customPrompt.trim() || undefined,
        camera,
        lens,
        focalLength,
        aperture,
        aspectRatio,
        resolution,
      }
      if (isVideo) body.duration = duration

      const res  = await fetch('/api/cinema', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data: GenerationResult = await res.json()

      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok || !data.success) {
        setError(data.error || 'Generation failed.')
        return
      }

      setResult(data)
      setHistory(h => [data, ...h].slice(0, 20))
    } catch (e: any) {
      setError(e.message || 'Request failed.')
    } finally {
      clearInterval(progressInterval)
      setGenerating(false)
      setTimeout(() => setProgress(0), 800)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="rd-card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-red-600/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ff1a1a]" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500/70">Muapi.ai — 7 Keys Active</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Classified Cinema Studio</h2>
            <p className="text-[10px] text-gray-600 font-mono mt-1">Generate cinematic images & videos — keys rotate automatically</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest border rounded transition-all ${
                  model === m.id
                    ? 'border-red-500/60 bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(255,26,26,0.15)]'
                    : 'border-red-900/20 text-gray-600 hover:text-white hover:border-red-900/40'
                }`}
              >
                <span>{m.icon}</span>
                <span className="hidden sm:inline">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">

        {/* ── Left: Controls ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Presets */}
          <div className="rd-card p-5">
            <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-3">Quick Presets</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPreset(preset === p.id ? '' : p.id); setCustomPrompt('') }}
                  className={`flex items-center gap-2 px-3 py-2.5 text-[9px] font-bold border rounded transition-all text-left ${
                    preset === p.id
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : 'border-red-900/15 text-gray-600 hover:text-white hover:border-red-900/30'
                  }`}
                >
                  <span className="flex-shrink-0">{p.emoji}</span>
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div className="rd-card p-5">
            <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">
              Custom Prompt <span className="text-gray-700">(overrides preset)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe your scene... e.g. 'shadowy figure decrypting classified files in neon-lit server room'"
              value={customPrompt}
              onChange={e => { setCustomPrompt(e.target.value); if (e.target.value) setPreset('') }}
              className="w-full bg-black/50 border border-red-950/30 p-3 text-white font-mono text-xs focus:border-red-500/50 outline-none transition-all resize-none rounded-sm"
            />
          </div>

          {/* Camera / Lens (only for image model) */}
          {!isVideo && (
            <div className="rd-card p-5 space-y-4">
              <div>
                <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">Camera</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CAMERAS.map(c => (
                    <button key={c.id} onClick={() => setCamera(c.id)}
                      className={`py-2 text-[8px] font-bold border rounded-sm transition-all ${
                        camera === c.id ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-900/15 text-gray-700 hover:text-white hover:border-red-900/30'
                      }`}>{c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">Lens</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {LENSES.map(l => (
                    <button key={l.id} onClick={() => setLens(l.id)}
                      className={`py-2 text-[8px] font-bold border rounded-sm transition-all ${
                        lens === l.id ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-900/15 text-gray-700 hover:text-white hover:border-red-900/30'
                      }`}>{l.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">Focal Length</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {FOCAL_LENGTHS.map(f => (
                      <button key={f} onClick={() => setFocalLength(f)}
                        className={`px-2.5 py-1.5 text-[9px] font-bold border rounded-sm transition-all ${
                          focalLength === f ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-900/15 text-gray-700 hover:text-white'
                        }`}>{f}mm
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">Aperture</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {APERTURES.map(a => (
                      <button key={a} onClick={() => setAperture(a)}
                        className={`px-2.5 py-1.5 text-[9px] font-bold border rounded-sm transition-all ${
                          aperture === a ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-900/15 text-gray-700 hover:text-white'
                        }`}>{a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video duration (video models only) */}
          {isVideo && (
            <div className="rd-card p-5">
              <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">Duration (seconds)</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`flex-1 py-2.5 text-[10px] font-black border rounded-sm transition-all ${
                      duration === d ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-900/20 text-gray-600 hover:text-white'
                    }`}>{d}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Output settings */}
          <div className="rd-card p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">Aspect Ratio</label>
                <div className="flex gap-1.5 flex-wrap">
                  {ASPECT_RATIOS.map(r => (
                    <button key={r} onClick={() => setAspectRatio(r)}
                      className={`px-2.5 py-1.5 text-[9px] font-bold border rounded-sm transition-all ${
                        aspectRatio === r ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-900/15 text-gray-700 hover:text-white'
                      }`}>{r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">Resolution</label>
                <div className="flex gap-1.5">
                  {RESOLUTIONS.map(r => (
                    <button key={r} onClick={() => setResolution(r)}
                      className={`flex-1 py-1.5 text-[9px] font-bold border rounded-sm transition-all ${
                        resolution === r ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-900/15 text-gray-700 hover:text-white'
                      }`}>{r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div>
            {error && (
              <p className="text-[10px] font-mono text-red-400 mb-3 px-1">{error}</p>
            )}
            <button
              onClick={generate}
              disabled={generating}
              className="w-full py-5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-[0_0_30px_rgba(255,26,26,0.2)] hover:shadow-[0_0_50px_rgba(255,26,26,0.35)] rounded-sm relative overflow-hidden"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isVideo ? 'Rendering Video...' : 'Generating Image...'}
                </span>
              ) : (
                `${selectedModel.icon} Generate ${isVideo ? 'Video' : 'Image'}`
              )}

              {/* Progress bar */}
              {generating && progress > 0 && (
                <motion.div
                  className="absolute bottom-0 left-0 h-[3px] bg-white/40"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </button>
            <p className="text-[9px] text-gray-700 text-center mt-2 font-mono">
              {isVideo
                ? `~${duration * 15}–${duration * 20}s generation time · Key ${_keyDisplay()}/7 active`
                : `~20–40s generation time · Key ${_keyDisplay()}/7 active`
              }
            </p>
          </div>
        </div>

        {/* ── Right: Output ───────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Preview area */}
          <div className={`rd-card relative overflow-hidden bg-black/80 flex items-center justify-center border-2 border-dashed border-red-900/20 ${
            aspectRatio === '9:16' ? 'aspect-[9/16]' :
            aspectRatio === '1:1'  ? 'aspect-square' :
            aspectRatio === '4:5'  ? 'aspect-[4/5]' :
            aspectRatio === '21:9' ? 'aspect-[21/9]' :
            'aspect-video'
          }`}>
            <AnimatePresence mode="wait">
              {/* Generating overlay */}
              {generating && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-2 border-red-900/30 border-t-red-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-xl">
                      {selectedModel.icon}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-red-400 font-mono uppercase tracking-widest mb-1">
                      {isVideo ? 'Rendering cinematic video...' : 'Generating classified image...'}
                    </p>
                    <p className="text-[9px] text-gray-700 font-mono">{Math.round(progress)}% complete</p>
                  </div>
                  <div className="w-48 h-1 bg-red-950/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-700 to-red-400"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Result */}
              {!generating && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full"
                >
                  {result.isVideo ? (
                    <video
                      src={result.outputUrl}
                      controls
                      autoPlay
                      loop
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={result.outputUrl}
                      alt="Generated"
                      className="w-full h-full object-contain"
                    />
                  )}
                </motion.div>
              )}

              {/* Empty state */}
              {!generating && !result && (
                <motion.div
                  key="empty"
                  className="text-center p-8"
                >
                  <div className="text-red-500/10 text-5xl mb-4 font-black">
                    {isVideo ? '▶' : '◈'}
                  </div>
                  <p className="text-[10px] text-gray-700 uppercase tracking-widest font-mono">
                    {isVideo ? 'Video will appear here' : 'Image will appear here'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Result metadata */}
          {result && !generating && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rd-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-gray-600 uppercase tracking-widest font-mono">Output Info</span>
                <div className="flex gap-2">
                  <a
                    href={result.outputUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all rounded-sm"
                  >
                    ↓ Download
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.outputUrl)}
                    className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest border border-white/10 text-gray-500 hover:text-white transition-all rounded-sm"
                  >
                    Copy URL
                  </button>
                </div>
              </div>

              {[
                { label: 'Model',   value: result.model },
                { label: 'Type',    value: result.isVideo ? '🎬 Video' : '📸 Image' },
                result.camera && { label: 'Camera',  value: result.camera },
                result.lens   && { label: 'Lens',    value: result.lens },
                { label: 'Size',    value: `${result.resolution} · ${result.aspectRatio}` },
                { label: 'API Key', value: `Key ${result.keyUsed}/7` },
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} className="flex justify-between text-[9px] font-mono border-b border-red-900/10 pb-2">
                  <span className="text-gray-700 uppercase tracking-widest">{item.label}</span>
                  <span className="text-gray-400">{item.value}</span>
                </div>
              ))}

              <div>
                <span className="text-[8px] text-gray-700 uppercase tracking-widest font-mono block mb-1">Prompt Used</span>
                <p className="text-[9px] font-mono text-gray-600 leading-relaxed line-clamp-3">{result.prompt}</p>
              </div>
            </motion.div>
          )}

          {/* History */}
          {history.length > 1 && (
            <div className="rd-card p-4">
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-mono mb-3">History ({history.length})</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-1.5">
                {history.slice(1).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setResult(h)}
                    className="aspect-square overflow-hidden border border-red-900/20 hover:border-red-500/30 transition-all relative group rounded-sm"
                  >
                    {h.isVideo
                      ? <video src={h.outputUrl} className="w-full h-full object-cover" />
                      : <img src={h.outputUrl} alt="" className="w-full h-full object-cover" />
                    }
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs">{h.isVideo ? '▶' : '◈'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper — doesn't expose actual key, just current slot number
// This is called client-side but _keyIndex is server-side; we just show a placeholder
function _keyDisplay() {
  return '—'
}
