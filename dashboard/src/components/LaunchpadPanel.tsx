'use client'

/**
 * LaunchpadPanel — single-flow, minimal token launch UX.
 *
 * Product decisions:
 *   - One vertical step-by-step form, no tabs / no AI styles / no extra prompts
 *   - 4 inputs only: name, symbol, description, logo (upload OR single AI generate)
 *   - Twitter / Website tucked into a collapsible "Optional links"
 *   - Single big LAUNCH TOKEN button
 *   - Single inline progress indicator (no modals)
 *   - On success: immediate redirect to /terminal/<MINT>
 *   - Off-chain mode by default (NEXT_PUBLIC_LAUNCH_MODE=offchain)
 *     — on-chain rd-bondingcurve client is dynamically imported only when
 *       LAUNCH_MODE === 'onchain' so the off-chain bundle stays lean.
 */

import { useState, useRef } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import {
  PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair,
} from '@solana/web3.js'
import { useRouter } from 'next/navigation'

const BACKEND_URL  = process.env.NEXT_PUBLIC_BACKEND_URL || ''
const LAUNCH_MODE  = process.env.NEXT_PUBLIC_LAUNCH_MODE ?? 'offchain'
// Off-chain treasury (mirrors TREASURY_PUBKEY from rd-bondingcurve client).
// Hard-coded here so we don't pull in the on-chain client in off-chain mode.
const TREASURY_OFFCHAIN = new PublicKey('BWhHF85ZNoR3x7GhoxhXEK6C4bBZvCyMFDZfMWNRXiME')
const LAUNCH_FEE_SOL = 0.02

// Single AI prompt — the on-brand look. No more 6-style picker.
const AI_PROMPT_BASE =
  'minimal crypto token logo, dark dystopian, deep red and black palette, holographic interference, ' +
  'cyberpunk classified document aesthetic, high contrast, square 1024x1024, no text'

export function LaunchpadPanel() {
  const { connection } = useConnection()
  const { publicKey, signTransaction, signAllTransactions, sendTransaction } = useWallet()
  const router = useRouter()

  const [name, setName]               = useState('')
  const [symbol, setSymbol]           = useState('')
  const [description, setDescription] = useState('')
  const [twitter, setTwitter]         = useState('')
  const [website, setWebsite]         = useState('')
  const [showOptional, setShowOptional] = useState(false)

  const [logo, setLogo]               = useState<string | null>(null)
  const [generating, setGenerating]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [launching, setLaunching]     = useState(false)
  const [step, setStep]               = useState<string>('')
  const [error, setError]             = useState<string>('')

  // ── helpers ──────────────────────────────────────────────────────────────
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = ev => setLogo(ev.target?.result as string)
    r.readAsDataURL(f)
  }

  const generateAI = () => {
    setGenerating(true)
    setError('')
    const named = name ? `${AI_PROMPT_BASE}, named "${name}"` : AI_PROMPT_BASE
    const seed = Math.floor(Math.random() * 999999)
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(named)}?width=1024&height=1024&seed=${seed}&nologo=true`
    const img = new Image()
    img.onload  = () => { setLogo(url); setGenerating(false) }
    img.onerror = () => { setError('AI generation failed — try again or upload'); setGenerating(false) }
    img.src = url
  }

  // ── launch ───────────────────────────────────────────────────────────────
  const launch = async () => {
    setError('')
    if (!publicKey)            return setError('Connect your wallet first.')
    if (!name.trim())          return setError('Name is required.')
    if (!symbol.trim())        return setError('Symbol is required.')

    setLaunching(true)
    try {
      const mintKeypair = Keypair.generate()
      const mint        = mintKeypair.publicKey

      // 1) Pin metadata (best-effort — token still launches if Pinata is down)
      setStep('Uploading metadata…')
      let uri = ''
      try {
        const metaRes = await fetch(`${BACKEND_URL}/api/tokens/metadata/pin`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name:         name.trim(),
            symbol:       symbol.trim().toUpperCase(),
            description:  description.trim(),
            image:        logo ?? '',
            external_url: website.trim(),
            twitter:      twitter.trim(),
          }),
        })
        if (metaRes.ok) {
          const d = await metaRes.json()
          uri = d.uri || d.url || ''
        }
      } catch { /* non-fatal */ }

      // 2) Send creation fee / deploy pool
      let sig = ''
      if (LAUNCH_MODE === 'onchain') {
        // On-chain mode is currently disabled at build time — the
        // rd-bondingcurve Anchor client requires @coral-xyz/anchor which is
        // intentionally not in this dashboard's deps (off-chain bundle stays
        // small). To re-enable: install @coral-xyz/anchor and dynamic-import
        // '@/lib/rd-bondingcurve/client' here.
        throw new Error('On-chain launch mode is not enabled in this build.')
      } else {
        setStep(`Sending ${LAUNCH_FEE_SOL} SOL launch fee…`)
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey:   TREASURY_OFFCHAIN,
            lamports:   LAUNCH_FEE_SOL * LAMPORTS_PER_SOL,
          }),
        )
        sig = await sendTransaction(tx, connection)
        await connection.confirmTransaction(sig, 'confirmed')
      }

      // 3) Register with backend
      setStep('Registering token…')
      const payload = {
        mint:              mint.toBase58(),
        name:              name.trim(),
        symbol:            symbol.trim().toUpperCase(),
        description:       description.trim(),
        logo:              logo ?? '',
        creator:           publicKey.toBase58(),
        twitterUrl:        twitter.trim(),
        websiteUrl:        website.trim(),
        launchTxSignature: sig,
      }
      await fetch(`${BACKEND_URL}/api/tokens`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      }).catch(() => {})

      // 4) Mirror in dashboard Redis (so /tokens listing works)
      setStep('Syncing terminal index…')
      await fetch('/api/tokens', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      }).catch(() => {})

      // 5) Redirect — no intermediate "success" screen, no modal.
      setStep('Redirecting to terminal…')
      router.push(`/terminal/${mint.toBase58()}`)
    } catch (e: any) {
      setError(e?.message ?? String(e))
      setLaunching(false)
      setStep('')
    }
  }

  const canLaunch = !!publicKey && !!name.trim() && !!symbol.trim() && !launching

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="rd-card p-6 sm:p-8 max-w-2xl mx-auto border-red-500/10">
      <div className="mb-6">
        <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
          <span className="text-red-500">⊕</span> Launch Token
        </h2>
        <p className="text-[10px] text-gray-600 font-mono mt-2">
          Off-chain bonding curve · 0.02 SOL launch fee · 800M supply on curve · 5% reserved for missions on graduation
        </p>
      </div>

      {/* 1. NAME */}
      <Field label="Token name">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Shadow Protocol"
          className="rd-input"
          disabled={launching}
        />
      </Field>

      {/* 2. SYMBOL */}
      <Field label="Symbol">
        <input
          type="text"
          value={symbol}
          onChange={e => setSymbol(e.target.value.toUpperCase().slice(0, 10))}
          placeholder="e.g. SHDW"
          className="rd-input"
          disabled={launching}
        />
      </Field>

      {/* 3. DESCRIPTION */}
      <Field label="Description">
        <textarea
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Protocol objective…"
          className="rd-input resize-none"
          disabled={launching}
        />
      </Field>

      {/* 4. LOGO */}
      <Field label="Logo">
        <div className="flex gap-3 items-start">
          <div
            className="w-24 h-24 flex-shrink-0 bg-black/60 border-2 border-dashed border-red-900/30 rounded-sm flex items-center justify-center overflow-hidden"
            onClick={() => fileRef.current?.click()}
            role="button"
          >
            {logo
              ? <img src={logo} alt="logo" className="w-full h-full object-cover" />
              : <span className="text-red-500/30 text-2xl">███</span>}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={launching}
              className="py-2 px-3 text-[10px] font-mono uppercase tracking-widest border border-red-900/30 text-gray-400 hover:text-white hover:border-red-500/40 rounded-sm transition-all disabled:opacity-40"
            >
              {logo ? 'Change image' : 'Upload image'}
            </button>
            <button
              type="button"
              onClick={generateAI}
              disabled={launching || generating}
              className="py-2 px-3 text-[10px] font-mono uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm transition-all disabled:opacity-40"
            >
              {generating ? 'Generating…' : 'Generate AI image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>
      </Field>

      {/* OPTIONAL LINKS — collapsible */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => setShowOptional(s => !s)}
          className="text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors"
        >
          {showOptional ? '−' : '+'} Optional links (Twitter, Website)
        </button>
        {showOptional && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text" value={twitter} onChange={e => setTwitter(e.target.value)}
              placeholder="https://x.com/…" className="rd-input text-xs" disabled={launching}
            />
            <input
              type="text" value={website} onChange={e => setWebsite(e.target.value)}
              placeholder="https://…" className="rd-input text-xs" disabled={launching}
            />
          </div>
        )}
      </div>

      {/* LAUNCH BUTTON */}
      <button
        onClick={launch}
        disabled={!canLaunch}
        className="w-full py-5 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-[0.4em] transition-all shadow-[0_0_20px_rgba(255,26,26,0.2)] hover:shadow-[0_0_40px_rgba(255,26,26,0.4)] rounded-sm"
      >
        {launching ? (
          <span className="flex items-center justify-center gap-3">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {step || 'Launching…'}
          </span>
        ) : !publicKey ? 'Connect wallet to launch' : '⊕ Launch token'}
      </button>

      {error && (
        <p className="mt-4 text-[10px] font-mono text-red-400 text-center break-all">⚠ {error}</p>
      )}

      <style jsx>{`
        .rd-input {
          width: 100%;
          background: rgba(0,0,0,0.55);
          border: 1px solid rgba(127,29,29,0.25);
          padding: 0.7rem;
          color: white;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 0.85rem;
          border-radius: 2px;
          outline: none;
          transition: border-color 0.15s;
        }
        .rd-input:focus { border-color: rgba(239,68,68,0.5); }
        .rd-input:disabled { opacity: 0.5; }
      `}</style>
    </div>
  )
}

// Local field wrapper — keeps each row consistent.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[9px] text-gray-600 uppercase tracking-[0.25em] mb-2">{label}</label>
      {children}
    </div>
  )
}
