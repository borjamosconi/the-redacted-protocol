'use client'

import { useState, useRef } from 'react'
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

const MODELS = [
  { id: 'nano-banana-2', name: 'Neural Genesis 2.0', type: 'image', icon: '🧠', desc: 'High-fidelity neural synthesis' },
  { id: 'flux-cinematic', name: 'Flux Cinematic', type: 'video', icon: '🎬', desc: '4K Motion synthesis (Coming Soon)', disabled: true },
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
  { id: 'macro',              name: 'Macro' },
  { id: 'tilt_shift',         name: 'Tilt-Shift' },
]

const FOCAL_LENGTHS = [8, 14, 24, 35, 50, 85, 135]
const APERTURES     = ['f/1.4', 'f/2.8', 'f/4', 'f/8', 'f/11']
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

export function CinemaPanel() {
  const [model,       setModel]       = useState('nano-banana-2')
  const [preset,      setPreset]      = useState<string>('')
  const [customPrompt,setCustomPrompt]= useState('')
  const [camera,      setCamera]      = useState('modular_8k')
  const [lens,        setLens]        = useState('compact_anamorphic')
  const [focalLength, setFocalLength] = useState(35)
  const [aperture,    setAperture]    = useState('f/2.8')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [resolution,  setResolution]  = useState('4K')

  const [generating,  setGenerating]  = useState(false)
  const [progress,    setProgress]    = useState(0)
  const [result,      setResult]      = useState<GenerationResult | null>(null)
  const [error,       setError]       = useState('')
  const [history,     setHistory]     = useState<GenerationResult[]>([])

  const selectedModel = MODELS.find(m => m.id === model) || MODELS[0]

  const generate = async () => {
    if (!preset && !customPrompt.trim()) {
      setError('SELECT PRESET OR ENTER CUSTOM PROMPT')
      return
    }
    setGenerating(true)
    setError('')
    setResult(null)
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 1.8, 95))
    }, 1000)

    try {
      const body = { model, preset: preset || undefined, prompt: customPrompt.trim() || undefined, camera, lens, focalLength, aperture, aspectRatio, resolution }
      const res  = await fetch('/api/cinema', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data: GenerationResult = await res.json()

      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok || !data.success) {
        setError(data.error || 'GENERATION FAILED')
        return
      }

      setResult(data)
      setHistory(h => [data, ...h].slice(0, 24))
    } catch (e: any) {
      setError(e.message || 'CONNECTION ERROR')
    } finally {
      setGenerating(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
      
      {/* ── Side Console: Parameters ─────────────────────────────────────── */}
      <aside className="space-y-6">
        
        {/* Model Selector */}
        <div className="rd-card p-6 border-l-4 border-l-red-600">
          <label className="block text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-4">Neural Engine</label>
          <div className="space-y-2">
            {MODELS.map(m => (
              <button 
                key={m.id}
                disabled={m.disabled}
                onClick={() => setModel(m.id)}
                className={`w-full p-4 flex items-center gap-4 border transition-all ${
                  model === m.id 
                    ? 'border-red-600 bg-red-600/10 text-white' 
                    : 'border-white/5 bg-white/[0.02] text-white/40 hover:border-white/20'
                } ${m.disabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
              >
                <span className="text-xl">{m.icon}</span>
                <div className="text-left">
                  <div className="text-[10px] font-black uppercase tracking-widest">{m.name}</div>
                  <div className="text-[8px] font-mono opacity-50">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Controls */}
        <div className="rd-card p-6 space-y-6">
          
          {/* Custom Prompt */}
          <div>
            <label className="block text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Custom Command</label>
            <textarea
              rows={4}
              placeholder="INPUT SCENE COORDINATES..."
              value={customPrompt}
              onChange={e => { setCustomPrompt(e.target.value); if (e.target.value) setPreset('') }}
              className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-[11px] focus:border-red-600/50 outline-none transition-all resize-none uppercase tracking-wider"
            />
          </div>

          {/* Quick Presets Grid */}
          <div>
            <label className="block text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Synthetic Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPreset(preset === p.id ? '' : p.id); setCustomPrompt('') }}
                  className={`p-3 text-[9px] font-black border transition-all text-left uppercase tracking-tighter ${
                    preset === p.id
                      ? 'border-red-600 bg-red-600 text-black'
                      : 'border-white/5 bg-white/[0.02] text-white/40 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className="mr-2">{p.emoji}</span> {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optical Configuration */}
        <div className="rd-card p-6 space-y-5">
           <label className="block text-[10px] font-black text-white uppercase tracking-[0.3em]">Optical Parameters</label>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[8px] font-mono text-white/20 uppercase">Aperture</span>
                <select 
                  value={aperture} 
                  onChange={e => setAperture(e.target.value)}
                  className="w-full bg-black border border-white/10 p-2 text-[10px] font-mono text-red-500 outline-none"
                >
                  {APERTURES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-[8px] font-mono text-white/20 uppercase">Focal</span>
                <select 
                  value={focalLength} 
                  onChange={e => setFocalLength(Number(e.target.value))}
                  className="w-full bg-black border border-white/10 p-2 text-[10px] font-mono text-red-500 outline-none"
                >
                  {FOCAL_LENGTHS.map(f => <option key={f} value={f}>{f}mm</option>)}
                </select>
              </div>
           </div>

           <div className="space-y-2">
             <span className="text-[8px] font-mono text-white/20 uppercase">Camera Sensor</span>
             <div className="grid grid-cols-2 gap-1.5">
               {CAMERAS.slice(0, 4).map(c => (
                 <button 
                  key={c.id} 
                  onClick={() => setCamera(c.id)}
                  className={`py-2 text-[8px] font-black border transition-all ${
                    camera === c.id ? 'border-red-600 text-red-600 bg-red-600/5' : 'border-white/5 text-white/30'
                  }`}
                 >
                   {c.name}
                 </button>
               ))}
             </div>
           </div>
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          {error && <p className="text-[9px] font-black text-red-600 text-center animate-pulse tracking-[0.2em]">{error}</p>}
          <button
            onClick={generate}
            disabled={generating}
            className="btn-premium w-full group"
          >
            {generating ? (
              <span className="flex items-center gap-3">
                <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              'EXECUTE_SYNTHESIS'
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Canvas: Results ─────────────────────────────────────────── */}
      <main className="space-y-6">
        
        {/* Live Viewport */}
        <div className="cinematic-container aspect-video group">
          <div className="cinematic-overlay" />
          <div className="absolute inset-0 z-0 bg-black">
            {/* Background static or scanline */}
            {!result && !generating && (
               <div className="absolute inset-0 opacity-20 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-white uppercase tracking-[1em] animate-flicker">Idle_Waiting_For_Input</span>
               </div>
            )}
            
            <AnimatePresence mode="wait">
              {generating && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80"
                >
                  <div className="scanline" />
                  <div className="text-center space-y-4">
                    <div className="text-[40px] animate-bounce">{selectedModel.icon}</div>
                    <div className="text-[10px] font-black text-red-600 uppercase tracking-[0.5em] animate-pulse">Neural Reconstructing...</div>
                    <div className="w-64 h-1 bg-white/5 relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="absolute h-full bg-red-600 shadow-[0_0_15px_#ff0000]"
                      />
                    </div>
                    <div className="text-[8px] font-mono text-white/30">{Math.round(progress)}% DECRYPTED</div>
                  </div>
                </motion.div>
              )}

              {result && !generating && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full relative"
                >
                  <img
                    src={result.outputUrl}
                    alt="Synthesis"
                    className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110"
                  />
                  {/* Result HUD Overlay */}
                  <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none">
                     <span className="badge-premium border-red-600/40 text-red-600">Conf_Rating: 98.2%</span>
                     <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest bg-black/40 px-2 py-1">Type: {result.type}</span>
                  </div>
                  <div className="absolute bottom-6 left-6 flex flex-col gap-1 pointer-events-none">
                     <span className="text-[8px] font-mono text-white uppercase tracking-[0.3em] font-black">Subject: {preset || 'Custom_Prompt'}</span>
                     <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest max-w-xs">{result.prompt}</span>
                  </div>
                  <div className="absolute bottom-6 right-6 flex gap-3">
                     <a href={result.outputUrl} download className="btn-outline !px-4 !py-2 !text-[8px]">Export</a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Viewport Corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-600/30 z-30" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-600/30 z-30" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-600/30 z-30" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-600/30 z-30" />
        </div>

        {/* Synthetic History Gallery */}
        <div className="rd-card p-6">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Decryption History</h3>
              <span className="text-[8px] font-mono text-red-600/50 uppercase">{history.length} ITEMS_STORED</span>
           </div>
           
           {history.length > 0 ? (
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
               {history.map((h, i) => (
                 <button
                   key={i}
                   onClick={() => setResult(h)}
                   className={`aspect-square relative overflow-hidden border transition-all hover:scale-105 active:scale-95 ${
                     result?.outputUrl === h.outputUrl ? 'border-red-600 shadow-[0_0_15px_#ff000033]' : 'border-white/5'
                   }`}
                 >
                   <img src={h.outputUrl} alt="" className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[8px] font-black text-white uppercase tracking-tighter">View</span>
                   </div>
                 </button>
               ))}
             </div>
           ) : (
             <div className="h-24 flex items-center justify-center border border-dashed border-white/5 text-[9px] font-mono text-white/10 uppercase tracking-[0.5em]">No history found</div>
           )}
        </div>

      </main>
    </div>
  )
}
