'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair,
} from '@solana/web3.js'
import { useRouter } from 'next/navigation'
import BN from 'bn.js'
import {
  buildCreatePoolTx, buildBuyTx, quoteBuy, fetchPoolState,
  BONDING_CURVE_PROGRAM_ID, TOKEN_MULT, TREASURY_PUBKEY,
  AnchorWalletLike,
} from '@/lib/rd-bondingcurve/client'

// ── AI Style prompts ────────────────────────────────────────────────────────
const AI_STYLES = [
  { id: 'censored',   label: 'CENSORED',   prompt: 'dark dystopian crypto token logo, holographic rainbow censor bars, red iridescent interference, cyberpunk, highly detailed, black background' },
  { id: 'classified', label: 'CLASSIFIED', prompt: 'classified document crypto token logo, black redaction bars, TOP SECRET stamp, dark moody lighting, grid background, mysterious' },
  { id: 'glitch',     label: 'GLITCH',     prompt: 'digital glitch token logo, holographic rainbow distortion, red orange tones, VHS tracking error, dark background, cyberpunk, 1024px' },
  { id: 'void',       label: 'VOID',       prompt: 'cosmic void crypto token logo, deep black hole, red energy rings, dark matter, minimalist, cinematic lighting' },
  { id: 'neon',       label: 'NEON',       prompt: 'neon red crypto token logo, cyberpunk city, glowing circuits, dark background, high contrast, futuristic, holographic' },
  { id: 'blood',      label: 'BLOOD',      prompt: 'blood moon crypto token logo, crimson red, dark atmosphere, gothic, highly detailed, dramatic lighting' },
]

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || ''

export function LaunchpadPanel() {
  const { connection }                       = useConnection()
  const { publicKey, signTransaction, signAllTransactions, sendTransaction } = useWallet()
  const router = useRouter()

  // ── AI token builder state ─────────────────────────────────────────────────
  const [tokenData, setTokenData]     = useState({ name: '', symbol: '', description: '', twitterUrl: '', websiteUrl: '' })
  const [imageMode, setImageMode]     = useState<'ai' | 'upload'>('ai')
  const [selectedStyle, setSelectedStyle] = useState(0)
  const [extraPrompt, setExtraPrompt] = useState('')
  const [uploadedImg, setUploadedImg] = useState<string | null>(null)
  const [aiImg, setAiImg]             = useState<string | null>(null)
  const [generating, setGenerating]   = useState(false)
  const [genError, setGenError]       = useState('')
  const [launching, setLaunching]     = useState(false)
  const [launchStatus, setLaunchStatus] = useState<string>('')
  const [launchedMint, setLaunchedMint] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const activeImg = imageMode === 'upload' ? uploadedImg : aiImg

  // Build an AnchorWalletLike from wallet-adapter context (null-safe).
  const anchorWallet: AnchorWalletLike | null =
    publicKey && signTransaction && signAllTransactions
      ? { publicKey, signTransaction: signTransaction as any, signAllTransactions: signAllTransactions as any }
      : null

  // ── AI generate ─────────────────────────────────────────────────────────
  const generateAI = () => {
    setGenerating(true); setGenError('')
    const base  = AI_STYLES[selectedStyle].prompt
    const name  = tokenData.name ? `, named "${tokenData.name}"` : ''
    const extra = extraPrompt.trim() ? `, ${extraPrompt}` : ''
    const seed  = Math.floor(Math.random() * 999999)
    const url   = `https://image.pollinations.ai/prompt/${encodeURIComponent(base + name + extra)}?width=1024&height=1024&seed=${seed}&nologo=true`
    const img   = new Image()
    img.onload  = () => { setAiImg(url); setGenerating(false) }
    img.onerror = () => { setGenError('Generation failed — retry'); setGenerating(false) }
    img.src = url
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setUploadedImg(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  // ── Launch token via rd-bondingcurve on-chain ─────────────────────────────
  const launchToTerminal = async () => {
    if (!publicKey || !anchorWallet) { setLaunchStatus('ERROR: Connect wallet first.'); return }
    if (!tokenData.name.trim() || !tokenData.symbol.trim()) {
      setLaunchStatus('ERROR: Name and symbol are required.')
      return
    }

    setLaunching(true)
    setLaunchStatus('Preparing mint keypair...')

    try {
      const mintKeypair = Keypair.generate()
      const logo = activeImg || ''

      // Upload metadata JSON + image to IPFS (via backend Pinata proxy).
      setLaunchStatus('Uploading metadata to IPFS...')
      let uri = ''
      try {
        const metaRes = await fetch(`${BACKEND_URL}/api/tokens/metadata/pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:        tokenData.name.trim(),
            symbol:      tokenData.symbol.trim().toUpperCase(),
            description: tokenData.description.trim(),
            image:       logo,
            external_url: tokenData.websiteUrl.trim(),
            twitter:     tokenData.twitterUrl.trim(),
          }),
        })
        if (metaRes.ok) {
          const d = await metaRes.json()
          uri = d.uri || d.url || ''
        }
      } catch { /* non-fatal — pool can launch without metadata URI */ }

      setLaunchStatus('Deploying pool on rd-bondingcurve...')
      const { tx, mint } = await buildCreatePoolTx(connection, anchorWallet, {
        mintKeypair,
        name:   tokenData.name.trim(),
        symbol: tokenData.symbol.trim().toUpperCase(),
        uri,
      })
      const sig = await sendTransaction(tx, connection, { signers: [mintKeypair] })
      await connection.confirmTransaction(sig, 'confirmed')

      setLaunchStatus('Registering with terminal...')
      await fetch(`${BACKEND_URL}/api/tokens`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mint:              mint.toBase58(),
          name:              tokenData.name.trim(),
          symbol:            tokenData.symbol.trim().toUpperCase(),
          description:       tokenData.description.trim(),
          logo,
          creator:           publicKey.toBase58(),
          twitterUrl:        tokenData.twitterUrl.trim(),
          websiteUrl:        tokenData.websiteUrl.trim(),
          launchTxSignature: sig,
        }),
      })

      // Also mirror in dashboard Redis index (keeps /tokens list working)
      try {
        await fetch('/api/tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mint: mint.toBase58(),
            name: tokenData.name.trim(),
            symbol: tokenData.symbol.trim().toUpperCase(),
            description: tokenData.description.trim(),
            logo,
            creator: publicKey.toBase58(),
            twitterUrl: tokenData.twitterUrl.trim(),
            websiteUrl: tokenData.websiteUrl.trim(),
            launchTxSignature: sig,
          }),
        })
      } catch { /* ignore */ }

      setLaunchedMint(mint.toBase58())
      setLaunchStatus(`Token launched! Mint: ${mint.toBase58().slice(0, 8)}...`)
      setTimeout(() => router.push(`/terminal/${mint.toBase58()}`), 1500)
    } catch (e: any) {
      setLaunchStatus(`ERROR: ${e.message ?? String(e)}`)
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── AI TOKEN BUILDER ──────────────────────────────────────────────────── */}
      <div className="rd-card p-5 sm:p-8 relative overflow-hidden border-red-500/10">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-red-600/5 blur-[80px] pointer-events-none" />
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <span className="text-red-500">⊕</span> Launch Token on RDX Terminal
          </h3>
          <a href="/terminal" className="text-[9px] text-red-400/70 font-mono hover:text-red-400 transition-colors">
            View Terminal →
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-4">
            {[
              { label: 'Token Name', key: 'name',   placeholder: 'e.g. Shadow Protocol' },
              { label: 'Symbol',     key: 'symbol',  placeholder: 'e.g. SHDW' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">{f.label}</label>
                <input type="text" placeholder={f.placeholder}
                  value={(tokenData as any)[f.key]}
                  onChange={e => setTokenData({ ...tokenData, [f.key]: f.key === 'symbol' ? e.target.value.toUpperCase() : e.target.value })}
                  className="w-full bg-black/50 border border-red-950/30 p-3 text-white font-mono text-sm focus:border-red-500/50 outline-none transition-all rounded-sm" />
              </div>
            ))}
            <div>
              <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">Description</label>
              <textarea rows={3} placeholder="Protocol objective..."
                value={tokenData.description}
                onChange={e => setTokenData({ ...tokenData, description: e.target.value })}
                className="w-full bg-black/50 border border-red-950/30 p-3 text-white font-mono text-sm focus:border-red-500/50 outline-none transition-all resize-none rounded-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Twitter URL (optional)', key: 'twitterUrl', placeholder: 'https://x.com/...' },
                { label: 'Website (optional)',     key: 'websiteUrl', placeholder: 'https://...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">{f.label}</label>
                  <input type="text" placeholder={f.placeholder}
                    value={(tokenData as any)[f.key]}
                    onChange={e => setTokenData({ ...tokenData, [f.key]: e.target.value })}
                    className="w-full bg-black/50 border border-red-950/30 p-2.5 text-white font-mono text-xs focus:border-red-500/50 outline-none transition-all rounded-sm" />
                </div>
              ))}
            </div>

            {/* Fee info box */}
            <div className="bg-black/40 border border-red-900/10 rounded-sm p-3 text-[9px] font-mono space-y-1.5">
              <div className="text-gray-500 font-bold uppercase tracking-widest mb-2">Fee Structure — Pump.fun Economics</div>
              <div className="flex justify-between text-gray-700"><span>Curve supply</span><span className="text-white">800M tokens</span></div>
              <div className="flex justify-between text-gray-700"><span>LP reserve (at graduation)</span><span className="text-white">200M tokens</span></div>
              <div className="flex justify-between text-gray-700"><span>Graduation threshold</span><span className="text-white">85 SOL raised</span></div>
              <div className="flex justify-between text-gray-700"><span>Creator reward</span><span className="text-green-400">0.5% per trade</span></div>
              <div className="flex justify-between text-gray-700"><span>RDX treasury fee</span><span className="text-red-400/70">1% per trade</span></div>
              <div className="text-gray-700 pt-1 border-t border-red-900/10">Mint authority handed to pool PDA on launch — fully permissionless.</div>
            </div>

            {/* Launch button */}
            {!launchedMint ? (
              <button
                onClick={launchToTerminal}
                disabled={launching || !publicKey || !tokenData.name || !tokenData.symbol}
                className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-[0_0_20px_rgba(255,26,26,0.2)] hover:shadow-[0_0_40px_rgba(255,26,26,0.35)] rounded-sm"
              >
                {launching ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Launching...
                  </span>
                ) : !publicKey ? 'Connect Wallet to Launch' : '⊕ Deploy Pool & List on Terminal'}
              </button>
            ) : (
              <a href={`/terminal/${launchedMint}`}
                className="w-full py-4 flex items-center justify-center gap-2 bg-green-600/20 border border-green-500/30 text-green-400 font-black text-[11px] uppercase tracking-widest rounded-sm hover:bg-green-600/30 transition-all">
                ✓ View on Terminal →
              </a>
            )}

            {launchStatus && (
              <p className={`text-[9px] font-mono text-center ${launchStatus.startsWith('ERROR') ? 'text-red-400' : launchStatus.includes('launched') ? 'text-green-400' : 'text-yellow-500'}`}>
                {launchStatus}
              </p>
            )}
          </div>

          {/* Image generator */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {(['ai','upload'] as const).map(m => (
                <button key={m} onClick={() => setImageMode(m)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest border transition-all rounded-sm ${
                    imageMode === m ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-red-900/20 text-gray-600 hover:text-white'
                  }`}>
                  {m === 'ai' ? '✦ AI Generate' : '📁 Upload'}
                </button>
              ))}
            </div>

            <div className="aspect-square w-full bg-black/80 border-2 border-dashed border-red-900/20 relative flex items-center justify-center overflow-hidden cursor-pointer hover:border-red-500/20 transition-all"
              onClick={() => imageMode === 'upload' && fileRef.current?.click()}>
              {activeImg
                ? <img src={activeImg} alt="Token Logo" className="w-full h-full object-cover" />
                : <div className="text-center p-4">
                    <div className="text-red-500/20 text-4xl mb-2">███</div>
                    <p className="text-[10px] text-gray-700 uppercase tracking-widest">
                      {imageMode === 'ai' ? 'Select style & generate' : 'Click to upload'}
                    </p>
                  </div>
              }
              <AnimatePresence>
                {generating && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] text-red-400 font-mono uppercase tracking-widest">Generating...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

            {imageMode === 'ai' && (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {AI_STYLES.map((s, i) => (
                    <button key={s.id} onClick={() => setSelectedStyle(i)}
                      className={`py-2 text-[8px] font-black uppercase tracking-widest border transition-all rounded-sm ${
                        selectedStyle === i ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-red-900/15 text-gray-700 hover:text-white hover:border-red-900/30'
                      }`}>{s.label}</button>
                  ))}
                </div>
                <input type="text" value={extraPrompt} onChange={e => setExtraPrompt(e.target.value)}
                  placeholder="Extra description (optional)..."
                  className="w-full px-3 py-2.5 bg-black/50 border border-red-950/20 text-white font-mono text-xs outline-none focus:border-red-500/40 transition-all rounded-sm"
                  onKeyDown={e => e.key === 'Enter' && generateAI()} />
                {genError && <p className="text-[9px] text-red-500 font-mono">{genError}</p>}
                <button onClick={generateAI} disabled={generating}
                  className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50 rounded-sm">
                  {generating ? 'Generating...' : '█ Generate AI Logo'}
                </button>
              </>
            )}
            {imageMode === 'upload' && (
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-3 border border-red-500/20 text-gray-600 text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-red-500/30 transition-all rounded-sm">
                {uploadedImg ? '↺ Change Image' : '+ Select File'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
