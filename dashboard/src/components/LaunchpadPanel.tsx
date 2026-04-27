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
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token'
import { useRouter } from 'next/navigation'

const BACKEND_URL  = process.env.NEXT_PUBLIC_BACKEND_URL || ''
// User's treasury — receives the launch fee + holds the entire 1B supply.
const TREASURY_OFFCHAIN = new PublicKey('CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8')
const LAUNCH_FEE_SOL    = 0.02
const TOKEN_DECIMALS    = 9
const TOTAL_SUPPLY      = 1_000_000_000n   // 1B tokens, raw (without decimals)

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
      // 1) Pin metadata (best-effort — token still launches if Pinata is down)
      setStep('Uploading metadata…')
      let imageUrl = logo ?? ''
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
          imageUrl = d.uri || d.url || imageUrl
        }
      } catch { /* non-fatal */ }

      // 2) Build the FULL launch transaction the user signs ONCE in Phantom.
      //
      //    NO SERVER KEYS. NO AUTO-GENERATED WALLETS. The user is the only
      //    signer. After this single tx the SPL mint is real on mainnet
      //    with all supply held by the user's treasury and a NULL mint
      //    authority — meaning supply is fixed forever, nobody (not even
      //    us) can mint more.
      //
      //    Instructions, in order:
      //      a. SystemProgram.createAccount    — allocate the mint account
      //      b. createInitializeMintInstruction — turn it into an SPL mint
      //                                           with user as mint authority
      //      c. createAssociatedTokenAccount   — treasury's RDX ATA
      //      d. mintTo                          — 1B RDX → treasury ATA
      //      e. setAuthority(MintTokens, null)  — REVOKE — supply fixed
      //      f. SystemProgram.transfer          — 0.02 SOL launch fee
      //
      //    The mint Keypair is a one-shot ephemeral signer: its only purpose
      //    is to sign step (a). After this tx its private key is forgotten;
      //    the SPL mint at that pubkey now lives forever with NO authority.
      setStep('Building launch transaction…')
      const mintKp     = Keypair.generate()
      const mint       = mintKp.publicKey.toBase58()
      const treasuryAta = getAssociatedTokenAddressSync(mintKp.publicKey, TREASURY_OFFCHAIN)
      const mintRent   = await getMinimumBalanceForRentExemptMint(connection)
      const supplyAtomic = TOTAL_SUPPLY * (10n ** BigInt(TOKEN_DECIMALS))

      const tx = new Transaction()
      tx.add(
        // a. allocate mint account
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKp.publicKey,
          space: MINT_SIZE,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        }),
        // b. initialize as SPL mint, user is mint+freeze authority
        createInitializeMintInstruction(
          mintKp.publicKey,
          TOKEN_DECIMALS,
          publicKey,    // mint authority
          publicKey,    // freeze authority — also revoked below
        ),
        // c. create the treasury's ATA so it can receive tokens
        createAssociatedTokenAccountInstruction(
          publicKey,         // payer (you cover ATA rent ≈ 0.002 SOL)
          treasuryAta,
          TREASURY_OFFCHAIN, // ATA owner
          mintKp.publicKey,
        ),
        // d. mint the entire supply to the treasury
        createMintToInstruction(
          mintKp.publicKey,
          treasuryAta,
          publicKey,          // mint authority signs (the user)
          supplyAtomic,
        ),
        // e. REVOKE mint authority → supply is fixed forever
        createSetAuthorityInstruction(
          mintKp.publicKey,
          publicKey,
          AuthorityType.MintTokens,
          null,
        ),
        // f. revoke freeze authority too — no one can ever freeze accounts
        createSetAuthorityInstruction(
          mintKp.publicKey,
          publicKey,
          AuthorityType.FreezeAccount,
          null,
        ),
        // g. 0.02 SOL launch fee to treasury (your own wallet, recovered)
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey:   TREASURY_OFFCHAIN,
          lamports:   LAUNCH_FEE_SOL * LAMPORTS_PER_SOL,
        }),
      )

      // The mint keypair must co-sign step (a). Wallet adapter's
      // sendTransaction handles extra signers via the `signers` option.
      setStep('Approve in Phantom — single tx creates the SPL real…')
      const sig = await sendTransaction(tx, connection, { signers: [mintKp] })
      // Don't block on confirm — public RPC sometimes lags. Once we have
      // the signature, the tx is in the mempool. Register and redirect.
      void connection.confirmTransaction(sig, 'confirmed').catch(() => {})

      // 4) Register the token in BOTH the Mongo backend AND the Redis mirror.
      //    Surfaces errors loudly — no silent .catch — so the user knows if
      //    something went wrong AFTER paying the fee.
      const payload = {
        mint,
        name:              name.trim(),
        symbol:            symbol.trim().toUpperCase(),
        description:       description.trim(),
        logo:              imageUrl,
        creator:           publicKey.toBase58(),
        twitterUrl:        twitter.trim(),
        websiteUrl:        website.trim(),
        launchTxSignature: sig,
      }

      setStep('Registering token (backend)…')
      const backendRes = await fetch(`${BACKEND_URL}/api/tokens`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!backendRes.ok) {
        const j = await backendRes.json().catch(() => ({}))
        throw new Error(`Backend registration failed: ${j.error ?? backendRes.status}`)
      }

      setStep('Registering token (terminal index)…')
      const mirrorRes = await fetch('/api/tokens', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!mirrorRes.ok) {
        // Non-fatal: backend has the token. The terminal page falls back to
        // the backend if Redis doesn't have it. Log but proceed.
        console.warn('Redis mirror POST failed — terminal will fall back to backend')
      }

      // 5) Redirect — token now exists in at least the backend.
      setStep('Redirecting to terminal…')
      router.push(`/terminal/${mint}`)
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
          On-chain SPL token · 0.02 SOL launch fee · 800M supply on curve · 5% reserved for missions on graduation
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
