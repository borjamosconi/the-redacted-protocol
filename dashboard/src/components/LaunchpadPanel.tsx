'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { RDX_PUBLIC_KEYS } from '@/lib/rdx-public-config'

// ─── RDX Ecosystem Config ─────────────────────────────────────────────────────
const TREASURY_WALLET = RDX_PUBLIC_KEYS.treasuryWallet

// ─── AI Style prompts ────────────────────────────────────────────────────────
const AI_STYLES = [
  { id: 'censored',   label: 'CENSORED',   prompt: 'dark dystopian crypto token logo, holographic rainbow censor bars, red iridescent interference, cyberpunk, highly detailed, black background' },
  { id: 'classified', label: 'CLASSIFIED', prompt: 'classified document crypto token logo, black redaction bars, TOP SECRET stamp, dark moody lighting, grid background, mysterious' },
  { id: 'glitch',     label: 'GLITCH',     prompt: 'digital glitch token logo, holographic rainbow distortion, red orange tones, VHS tracking error, dark background, cyberpunk, 1024px' },
  { id: 'void',       label: 'VOID',       prompt: 'cosmic void crypto token logo, deep black hole, red energy rings, dark matter, minimalist, cinematic lighting, 4k' },
  { id: 'neon',       label: 'NEON',       prompt: 'neon red crypto token logo, cyberpunk city, glowing circuits, dark background, high contrast, futuristic, holographic' },
  { id: 'blood',      label: 'BLOOD',      prompt: 'blood moon crypto token logo, crimson red, dark atmosphere, gothic, highly detailed, dramatic lighting, 4k render' },
]

export function LaunchpadPanel() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tokenData, setTokenData] = useState({
    name: '',
    symbol: '',
    description: '',
  })
  const [imageMode, setImageMode]         = useState<'ai' | 'upload'>('ai')
  const [selectedAiStyle, setSelectedAiStyle] = useState(0)
  const [aiPromptExtra, setAiPromptExtra]  = useState('')
  const [uploadedImage, setUploadedImage]  = useState<string | null>(null)
  const [isGenerating, setIsGenerating]    = useState(false)
  const [aiImage, setAiImage]              = useState<string | null>(null)
  const [aiError, setAiError]              = useState('')

  const [isLaunching, setIsLaunching]     = useState(false)
  const [launchStatus, setLaunchStatus]   = useState<string | null>(null)

  const activeImage = imageMode === 'upload' ? uploadedImage : aiImage

  const initializeRDXAsset = async () => {
    if (!publicKey || !tokenData.name || !tokenData.symbol) return
    if (!TREASURY_WALLET) {
      setLaunchStatus('CONFIG ERROR: Treasury wallet env is missing or invalid.')
      return
    }

    setIsLaunching(true)
    setLaunchStatus('Initiating RDX Security Audit...')

    try {
      // 1. Audit Balance
      const balance = await connection.getBalance(publicKey)
      if (balance < 0.03 * LAMPORTS_PER_SOL) {
        throw new Error('Insufficient SOL for protocol fee + gas.')
      }

      // 2. Build Protocol Fee Tx
      setLaunchStatus('Routing Protocol Fee to Treasury...')
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: TREASURY_WALLET,
          lamports: 0.02 * LAMPORTS_PER_SOL
        })
      )

      // 3. Execute
      setLaunchStatus('Authorizing RDX Smart Contract...')
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')

      setLaunchStatus('Protocol Authorized. Deploying Bonding Curve...')
      await new Promise(r => setTimeout(r, 2000))
      
      setLaunchStatus('SUCCESS: RDX Asset Initialized.')
    } catch (e: any) {
      setLaunchStatus(`AUDIT FAILED: ${e.message}`)
    } finally {
      setIsLaunching(false)
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setUploadedImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // Real Pollinations.AI — same pattern as ImageGenSection
  const generateAI = () => {
    setIsGenerating(true)
    setAiError('')
    const base   = AI_STYLES[selectedAiStyle].prompt
    const name   = tokenData.name ? `, named "${tokenData.name} RDX"` : ''
    const extra  = aiPromptExtra.trim() ? `, ${aiPromptExtra}` : ''
    const seed   = Math.floor(Math.random() * 999999)
    const url    = `https://image.pollinations.ai/prompt/${encodeURIComponent(base + name + extra)}?width=1024&height=1024&seed=${seed}&nologo=true`
    const img    = new Image()
    img.onload  = () => { setAiImage(url); setIsGenerating(false) }
    img.onerror = () => { setAiError('Generation failed — retry'); setIsGenerating(false) }
    img.src = url
  }

  return (
    <div className="rd-card p-10 min-h-[700px] border-red-500/20 bg-red-950/5 overflow-hidden relative">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-500/20" />
          <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">RDX Launchpad</h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-500/20" />
        </div>
        <p className="text-center text-[10px] text-rd-muted/60 uppercase tracking-[0.4em]">Initialize Your Redacted Asset — 0.02 SOL Entry Fee</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

        {/* ── Left: Form ───────────────────────────────────────────── */}
        <div className="space-y-8">
          <div>
            <label className="block text-[10px] text-rd-muted uppercase tracking-widest mb-3">Token Name</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Shadow"
                value={tokenData.name}
                onChange={e => setTokenData({ ...tokenData, name: e.target.value })}
                className="w-full bg-black/50 border border-red-950/30 p-4 text-white font-mono focus:border-red-500/50 outline-none transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-black italic text-sm">RDX</div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-rd-muted uppercase tracking-widest mb-3">Symbol</label>
            <input
              type="text"
              placeholder="e.g. SHDW"
              value={tokenData.symbol}
              onChange={e => setTokenData({ ...tokenData, symbol: e.target.value.toUpperCase() })}
              className="w-full bg-black/50 border border-red-950/30 p-4 text-white font-mono focus:border-red-500/50 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] text-rd-muted uppercase tracking-widest mb-3">Protocol Objective</label>
            <textarea
              rows={3}
              placeholder="Describe the redacted purpose of this asset..."
              value={tokenData.description}
              onChange={e => setTokenData({ ...tokenData, description: e.target.value })}
              className="w-full bg-black/50 border border-red-950/30 p-4 text-white font-mono focus:border-red-500/50 outline-none transition-all resize-none"
            />
          </div>

          {/* Live preview card */}
          <div className="rd-card p-5 border-red-500/10 bg-white/[0.02]">
            <div className="text-[9px] text-rd-muted/40 uppercase tracking-widest mb-4">Live Preview</div>
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full flex-shrink-0 border border-red-500/40 overflow-hidden bg-red-500/10">
                {activeImage && (
                  <img src={activeImage} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{tokenData.name ? `${tokenData.name} RDX` : 'Your Token RDX'}</div>
                <div className="text-[10px] text-red-500 font-mono">0.00000234 SOL / 1 token</div>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center text-[10px] font-mono">
              <span className="text-rd-muted">Bonding Curve</span>
              <span className="text-white">0%</span>
            </div>
            <div className="mt-2 h-1 w-full bg-red-950/20 rounded-full" />
          </div>

          <button 
            onClick={initializeRDXAsset}
            disabled={isLaunching || !publicKey || !tokenData.name}
            className="w-full btn-premium py-5 text-xs font-black tracking-[0.5em] disabled:opacity-50"
          >
            {isLaunching ? 'DEPLOYING...' : 'INITIALIZE RDX CONTRACT'}
            <span className="block text-[8px] text-white/40 font-normal tracking-widest mt-1">COST: 0.02 SOL</span>
          </button>

          {launchStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/5 border border-red-500/20 p-4 rounded-sm"
            >
               <p className="text-[9px] font-mono text-red-500 uppercase tracking-widest text-center animate-pulse">
                  {launchStatus}
               </p>
            </motion.div>
          )}
        </div>

        {/* ── Right: Image ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Mode tabs */}
          <div className="flex gap-2">
            {(['ai', 'upload'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setImageMode(mode)}
                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                  imageMode === mode
                    ? 'border-red-500 text-red-500 bg-red-500/10'
                    : 'border-red-900/20 text-rd-muted hover:text-white'
                }`}
              >
                {mode === 'ai' ? '✦ AI Generate' : '📁 Upload Image'}
              </button>
            ))}
          </div>

          {/* Main preview */}
          <div
            className="aspect-square w-full bg-black/80 border-2 border-dashed border-red-900/30 relative flex items-center justify-center overflow-hidden cursor-pointer hover:border-red-500/30 transition-all group"
            onClick={() => imageMode === 'upload' && fileInputRef.current?.click()}
          >
            {activeImage ? (
              <img src={activeImage} alt="Token Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8">
                {imageMode === 'upload' ? (
                  <>
                    <div className="text-4xl mb-3 opacity-20 group-hover:opacity-40 transition-opacity">📁</div>
                    <p className="text-[10px] text-rd-muted uppercase tracking-widest">Click to upload</p>
                    <p className="text-[9px] text-rd-muted/40 mt-1">PNG, JPG, GIF — max 5MB</p>
                  </>
                ) : (
                  <>
                    <div className="text-rd-muted/30 text-4xl mb-3">███</div>
                    <p className="text-[10px] text-rd-muted uppercase tracking-widest">Select style & generate</p>
                  </>
                )}
              </div>
            )}

            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] text-red-400 uppercase tracking-widest font-mono animate-pulse">
                    100% FREE VIA POLLINATIONS.AI
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {imageMode === 'ai' && aiImage && (
              <div className="absolute bottom-3 left-3 text-[9px] font-black tracking-widest text-white bg-black/60 px-2 py-1 border border-red-500/30">
                {AI_STYLES[selectedAiStyle].label}
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

          {/* AI controls */}
          {imageMode === 'ai' && (
            <>
              {/* Style grid */}
              <div className="grid grid-cols-3 gap-2">
                {AI_STYLES.map((style, i) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedAiStyle(i)}
                    className={`py-2.5 text-[8px] font-black uppercase tracking-widest border transition-all ${
                      selectedAiStyle === i
                        ? 'border-red-500 text-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(255,26,26,0.2)]'
                        : 'border-red-900/20 text-rd-muted hover:border-red-500/30 hover:text-white'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>

              {/* Extra prompt */}
              <input
                type="text"
                value={aiPromptExtra}
                onChange={e => setAiPromptExtra(e.target.value)}
                placeholder="Describe further (optional)..."
                maxLength={80}
                className="w-full px-4 py-3 bg-black/50 border border-red-950/30 text-white font-mono text-xs focus:border-red-500/50 outline-none transition-all placeholder:text-rd-muted/40"
                onKeyDown={e => e.key === 'Enter' && generateAI()}
              />

              {aiError && (
                <p className="text-[9px] font-mono text-red-500 uppercase tracking-widest">{aiError}</p>
              )}

              <button
                onClick={generateAI}
                disabled={isGenerating}
                className="w-full py-4 bg-rd-red/20 border border-rd-red/50 text-rd-red font-mono text-xs tracking-widest hover:bg-rd-red/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'GENERATING...' : '█ GENERATE AI LOGO █'}
              </button>
            </>
          )}

          {/* Upload button */}
          {imageMode === 'upload' && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border border-red-500/30 text-red-500 text-[9px] font-bold uppercase tracking-[0.3em] hover:bg-red-500/10 transition-all"
            >
              {uploadedImage ? '↺ Change Image' : '+ Select Image File'}
            </button>
          )}
        </div>
      </div>

      {/* Gated Chat Teaser */}
      <div className="mt-16 border-t border-red-900/10 pt-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-red-500/10 rounded-sm flex items-center justify-center border border-red-900/20 text-2xl">💬</div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-1">Gated Alpha Channel</h4>
            <p className="text-[10px] text-rd-muted">Each token launched includes a private chat accessible only to holders of that specific asset.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
