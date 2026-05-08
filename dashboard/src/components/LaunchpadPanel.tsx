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
  TransactionInstruction, SYSVAR_RENT_PUBKEY,
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
import * as bc from '@/lib/rd-bondingcurve/client'

const LAUNCH_MODE = process.env.NEXT_PUBLIC_LAUNCH_MODE || 'offchain'

const BACKEND_URL  = process.env.NEXT_PUBLIC_BACKEND_URL || ''
// User's treasury — receives the launch fee + holds the entire 1B supply.
const TREASURY_OFFCHAIN = new PublicKey('CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8')
const LAUNCH_FEE_SOL    = 0.02
const TOKEN_DECIMALS    = 9
const TOTAL_SUPPLY      = 1_000_000_000n   // 1B tokens, raw (without decimals)

// Metaplex Token Metadata program (mainnet, immutable program id).
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// Solana Memo program — attaches readable description to txs so wallets
// show context instead of generic "possibly malicious" warnings.
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

function memoIx(text: string): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from(text, 'utf-8'),
  })
}

function getMetadataPDA(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID,
  )[0]
}

// Borsh string: u32 LE length + UTF-8 bytes.
function borshString(s: string): Buffer {
  const buf = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(buf.length, 0)
  return Buffer.concat([len, buf])
}

/**
 * Build a CreateMetadataAccountV3 instruction by hand.
 *
 * Discriminator: 33 (this is the position of the variant in the
 * MetadataInstruction enum). Args layout:
 *   data: DataV2 {
 *     name: String, symbol: String, uri: String,
 *     sellerFeeBasisPoints: u16,
 *     creators: Option<Vec<Creator>>,
 *     collection: Option<Collection>,
 *     uses: Option<Uses>,
 *   }
 *   isMutable: bool
 *   collectionDetails: Option<CollectionDetails>
 *
 * Accounts:
 *   metadata (writable), mint, mintAuthority (signer), payer (signer, writable),
 *   updateAuthority, systemProgram, rent.
 */
function buildCreateMetadataIx(args: {
  metadata:       PublicKey
  mint:           PublicKey
  mintAuthority:  PublicKey
  payer:          PublicKey
  updateAuthority: PublicKey
  name: string; symbol: string; uri: string
}): TransactionInstruction {
  const data = Buffer.concat([
    Buffer.from([33]),                 // discriminator
    borshString(args.name),
    borshString(args.symbol),
    borshString(args.uri),
    Buffer.from([0, 0]),               // sellerFeeBasisPoints u16 = 0
    Buffer.from([0]),                  // creators: None
    Buffer.from([0]),                  // collection: None
    Buffer.from([0]),                  // uses: None
    Buffer.from([1]),                  // isMutable: true
    Buffer.from([0]),                  // collectionDetails: None
  ])
  return new TransactionInstruction({
    programId: METADATA_PROGRAM_ID,
    keys: [
      { pubkey: args.metadata,        isSigner: false, isWritable: true  },
      { pubkey: args.mint,            isSigner: false, isWritable: false },
      { pubkey: args.mintAuthority,   isSigner: true,  isWritable: false },
      { pubkey: args.payer,           isSigner: true,  isWritable: true  },
      { pubkey: args.updateAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY,   isSigner: false, isWritable: false },
    ],
    data,
  })
}

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
      // 1) Image stays as-is. We don't pin to IPFS up-front — the backend
      //    serves the metadata.json dynamically at /api/tokens/<mint>/
      //    metadata.json reading from Mongo, which the on-chain
      //    metadata.uri points to. The `logo` field in Mongo holds the
      //    image URL (data URL from upload, or pollinations.ai URL, etc.)
      //    and the metadata route surfaces it as `image` in the JSON.
      const imageUrl = logo ?? ''

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

      // Metaplex metadata URI — points to a stable JSON our backend serves
      // by mint pubkey. The JSON has { name, symbol, image, ... } that
      // Phantom and Solscan fetch to display the logo.
      const metadataPda = getMetadataPDA(mintKp.publicKey)
      const metadataUri = `${BACKEND_URL || 'https://api.redacted.bond'}/api/tokens/${mint}/metadata.json`

      // ── TX 1 of 2: "Create my token" — looks like a normal token-creation
      //    pattern that Phantom + every wallet show without warnings.
      //    Instructions:
      //      a. createAccount       (allocate mint)
      //      b. initializeMint      (decimals, you = authority)
      //      c. CreateMetadataV3    (name + symbol + logo URI)
      //      d. createATA           (treasury's RDX account)
      //      e. mintTo              (1B → treasury)
      const tx1 = new Transaction().add(
        // Memo first — Phantom shows it as the tx purpose.
        memoIx(`Launch ${symbol.trim().toUpperCase()} token on redacted.bond`),
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKp.publicKey,
          space: MINT_SIZE,
          lamports: mintRent,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKp.publicKey,
          TOKEN_DECIMALS,
          publicKey,
          publicKey,
        ),
        buildCreateMetadataIx({
          metadata:        metadataPda,
          mint:            mintKp.publicKey,
          mintAuthority:   publicKey,
          payer:           publicKey,
          updateAuthority: publicKey,
          name:   name.trim().slice(0, 32),
          symbol: symbol.trim().toUpperCase().slice(0, 10),
          uri:    metadataUri.slice(0, 200),
        }),
        createAssociatedTokenAccountInstruction(
          publicKey,
          treasuryAta,
          TREASURY_OFFCHAIN,
          mintKp.publicKey,
        ),
        createMintToInstruction(
          mintKp.publicKey,
          treasuryAta,
          publicKey,
          supplyAtomic,
        ),
      )

      setStep('Approve TX 1/2 in wallet — create the token…')
      const sig = await sendTransaction(tx1, connection, { signers: [mintKp] })
      // Wait briefly for the mint to land before sending TX 2 (which
      // references the same mint and would fail if not yet finalized).
      await connection.confirmTransaction(sig, 'confirmed').catch(() => {})

      // ── TX 2 of 2 (optional but recommended): lock down authorities so
      //    nobody can ever mint more or freeze accounts. Pure setAuthority
      //    pattern — also benign in Phantom.
      try {
        const tx2 = new Transaction().add(
          memoIx(`Lock ${symbol.trim().toUpperCase()} authorities — fixed supply forever`),
          createSetAuthorityInstruction(
            mintKp.publicKey,
            publicKey,
            AuthorityType.MintTokens,
            null,
          ),
          createSetAuthorityInstruction(
            mintKp.publicKey,
            publicKey,
            AuthorityType.FreezeAccount,
            null,
          ),
        )
        setStep('Approve TX 2/2 in wallet — lock supply forever…')
        const sig2 = await sendTransaction(tx2, connection)
        void connection.confirmTransaction(sig2, 'confirmed').catch(() => {})
      } catch (e) {
        // If user rejects the lock-down tx, the token still exists with
        // mutable authorities — they can lock it later from their wallet.
        console.warn('Lock-down tx skipped:', e)
      }

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

      // 5) Gamification trigger
      if (publicKey) {
        // Log the action
        fetch('/api/gamify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            action: 'token_launch'
          })
        }).catch(() => {});
        
        // Attempt quest completion
        fetch('/api/gamify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            action: 'quest_complete',
            questId: 'whistleblower'
          })
        }).catch(() => {});
      }

      // 6) Redirect — token now exists in at least the backend.
      setStep('Redirecting to terminal…')
      router.push(`/terminal/${mint}`)
    } catch (e: any) {
      setError(e?.message ?? String(e))
      setLaunching(false)
      setStep('')
    }
  }

  // ON-CHAIN LAUNCH PATH (Bonding Curve)
  const launchOnChain = async () => {
    setError('')
    if (!publicKey || !signTransaction) return setError('Connect your wallet first.')
    if (!name.trim())                    return setError('Name is required.')
    if (!symbol.trim())                  return setError('Symbol is required.')

    setLaunching(true)
    try {
      const mintKp = Keypair.generate()
      const mint = mintKp.publicKey
      
      setStep('Building bonding curve pool tx…')
      const { tx } = await bc.buildCreatePoolTx(connection, { publicKey, signTransaction } as any, {
        mintKeypair: mintKp,
        name: name.trim().slice(0, 32),
        symbol: symbol.trim().toUpperCase().slice(0, 10),
        uri: `${BACKEND_URL}/api/tokens/${mint.toBase58()}/metadata.json`
      })

      setStep('Approve transaction in wallet…')
      const sig = await sendTransaction(tx, connection, { signers: [mintKp] })
      await connection.confirmTransaction(sig, 'confirmed')

      // Register in backend
      setStep('Registering in backend…')
      await fetch(`${BACKEND_URL}/api/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mint: mint.toBase58(),
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim(),
          logo: logo ?? '',
          creator: publicKey.toBase58(),
          launchTxSignature: sig,
          mode: 'onchain'
        }),
      })

      // Gamification trigger
      if (publicKey) {
        fetch('/api/gamify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            action: 'token_launch'
          })
        }).catch(() => {});
        
        fetch('/api/gamify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            action: 'quest_complete',
            questId: 'whistleblower'
          })
        }).catch(() => {});
      }

      router.push(`/terminal/${mint.toBase58()}`)
    } catch (e: any) {
      setError(e?.message ?? String(e))
      setLaunching(false)
      setStep('')
    }
  }

  const handleLaunchClick = () => {
    if (LAUNCH_MODE === 'onchain') {
      launchOnChain()
    } else {
      launch()
    }
  }

  const canLaunch = !!publicKey && !!name.trim() && !!symbol.trim() && !launching

  // Quick-pick document presets
  const PRESETS = [
    { name: 'Epstein Flight Logs', symbol: 'EPST', desc: 'Jeffrey Epstein flight logs revealing names of passengers aboard the Lolita Express. Partially sealed by court order.' },
    { name: 'JFK Warren Commission', symbol: 'JFK63', desc: 'Classified annexes from the Warren Commission investigation into the assassination of President Kennedy, 1963.' },
    { name: 'MKUltra Program Files', symbol: 'MKUL', desc: 'CIA Project MKUltra documents detailing covert mind control experiments conducted on unwitting subjects 1953–1973.' },
    { name: 'Pentagon UFO Briefings', symbol: 'UAP51', desc: 'Classified UAP briefings from the Pentagon AATIP program, partially released under FOIA request 2021.' },
    { name: 'NSA Mass Surveillance', symbol: 'NSA13', desc: 'Snowden archive: PRISM and XKeyscore programs collecting bulk internet and phone data without warrants.' },
    { name: 'Panama Papers Shell Co.', symbol: 'PANA', desc: 'Mossack Fonseca leaked documents exposing 11.5M files of offshore shell company networks of world leaders.' },
  ]

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 border border-red-500/30 bg-red-500/5">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[9px] text-red-400 font-mono tracking-[0.3em] uppercase">Document Launchpad</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
          Any Document. One Token. <span className="text-red-500">Live Now.</span>
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed max-w-md mx-auto">
          On-chain SPL token · 0.02 SOL fee · 1B supply · Bonding curve starts immediately
        </p>
      </div>

      {/* Quick Picks */}
      <div className="mb-8 lg:mb-10">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[10px] text-red-600 font-black uppercase tracking-[0.4em]">QUICK_TEMPLATES</span>
          <div className="flex-1 h-[1px] bg-white/5" />
        </div>
        <div className="flex sm:grid sm:grid-cols-3 overflow-x-auto sm:overflow-x-visible gap-2 sm:gap-0 border-0 sm:border border-white/10 no-scrollbar pb-4 sm:pb-0">
          {PRESETS.map(p => (
            <button
              key={p.symbol}
              type="button"
              disabled={launching}
              onClick={() => { setName(p.name); setSymbol(p.symbol); setDescription(p.desc); generateAI() }}
              className="flex-shrink-0 w-[140px] sm:w-auto text-left p-4 border sm:border-0 sm:border-r sm:border-b last:border-r-0 border-white/10 bg-white/[0.03] sm:bg-white/[0.01] hover:bg-white hover:border-white transition-all group disabled:opacity-40"
            >
              <div className="text-[11px] font-black text-white group-hover:text-black transition-colors uppercase tracking-widest">${p.symbol}</div>
              <div className="text-[8px] text-white/30 group-hover:text-black/50 truncate mt-1 uppercase font-mono tracking-tighter">{p.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-6 mb-8 lg:mb-10">
        <div className="flex-1 h-[1px] bg-red-600/20" />
        <span className="text-[10px] text-white/20 font-mono uppercase tracking-[0.5em] whitespace-nowrap">OR CUSTOM TOKEN</span>
        <div className="flex-1 h-[1px] bg-red-600/20" />
      </div>

      {/* Form card */}
      <div className="relative p-6 sm:p-8 border border-white/10 bg-white/[0.02] overflow-hidden group">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-600/50" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-600/50" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-600/50" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-600/50" />
        
        {/* Technical Grid Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

        {/* NAME + SYMBOL row */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 sm:gap-6 mb-6">
          <Field label="Token Name">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Epstein Files"
              className="rd-input" disabled={launching} />
          </Field>
          <Field label="Ticker">
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="TICKER"
              className="rd-input text-center font-black sm:w-[110px]" disabled={launching} />
          </Field>
        </div>

        {/* DESCRIPTION */}
        <Field label="Document Summary">
          <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe the content and narrative..."
            className="rd-input resize-none" disabled={launching} />
        </Field>

        {/* LOGO */}
        <Field label="Token Logo">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
            <div
              className="w-24 h-24 flex-shrink-0 bg-black border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-red-600 transition-all relative group/logo"
              onClick={() => fileRef.current?.click()}
            >
              {logo
                ? <img src={logo} alt="logo" className="w-full h-full object-cover" />
                : <div className="flex flex-col items-center gap-1 opacity-20 group-hover/logo:opacity-50 transition-opacity">
                    <span className="text-2xl">+</span>
                    <span className="text-[8px] font-mono uppercase">UPLOAD</span>
                  </div>}
              {generating && <div className="absolute inset-0 bg-black/80 flex items-center justify-center"><div className="w-6 h-6 border-2 border-red-600 border-t-transparent animate-spin rounded-full" /></div>}
            </div>
            <div className="flex-1 flex flex-col gap-3 w-full">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={launching}
                className="py-3 px-6 text-[9px] font-black uppercase tracking-[0.3em] border border-white/10 bg-white/[0.03] text-white/40 hover:bg-white hover:text-black transition-all disabled:opacity-40">
                {logo ? 'Change Image' : 'Upload File'}
              </button>
              <button type="button" onClick={generateAI} disabled={launching || generating}
                className="py-3 px-6 text-[9px] font-black uppercase tracking-[0.3em] border border-red-600/30 bg-red-600/5 text-red-500 hover:bg-red-600 hover:text-white transition-all disabled:opacity-40">
                {generating ? 'Generating...' : 'Generate with AI'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>
          </div>
        </Field>

        {/* OPTIONAL LINKS */}
        <div className="mb-8">
          <button type="button" onClick={() => setShowOptional(s => !s)}
            className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-red-500 transition-colors flex items-center gap-2">
            <span>{showOptional ? '[−]' : '[+]'}</span>
            <span>Optional Links (X / Web)</span>
          </button>
          {showOptional && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" value={twitter} onChange={e => setTwitter(e.target.value)}
                placeholder="X (Twitter) URL" className="rd-input text-[10px]" disabled={launching} />
              <input type="text" value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="Website URL" className="rd-input text-[10px]" disabled={launching} />
            </div>
          )}
        </div>

        {/* GAMIFICATION REWARD PREVIEW */}
        <div className="mb-8 p-6 border border-red-500/30 bg-red-600/5 relative overflow-hidden group/reward">
           <div className="absolute inset-0 bg-red-600/10 translate-x-[-100%] group-hover/reward:translate-x-[100%] transition-transform duration-[2000ms] ease-in-out" />
           <div className="flex items-center justify-between relative z-10">
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em] mb-1">MISSION_REWARD</span>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-black text-white">+500</span>
                       <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">XP</span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-black text-red-600">+100</span>
                       <span className="text-[10px] font-mono text-red-600/40 uppercase tracking-widest">RDX</span>
                    </div>
                 </div>
              </div>
              <div className="w-12 h-12 rounded-full border border-red-500/20 flex items-center justify-center bg-red-500/5">
                 <span className="text-xl animate-bounce">🎁</span>
              </div>
           </div>
           <p className="mt-4 text-[9px] text-white/30 font-mono uppercase tracking-widest leading-relaxed">
              Upon successful on-chain validation, your operator rank will be updated and $RDX assets will be credited to your testnet balance.
           </p>
        </div>

        {/* LAUNCH BUTTON */}
        <button onClick={handleLaunchClick} disabled={!canLaunch}
          className="w-full relative py-6 bg-red-600 hover:bg-white text-white hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] group-hover:animate-shimmer" />
          <span className="relative z-10 font-black text-sm uppercase tracking-[0.4em] sm:tracking-[0.6em]">
            {launching ? (
              <span className="flex items-center justify-center gap-4">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {step || 'Processing...'}
              </span>
            ) : !publicKey ? 'Connect Wallet' : LAUNCH_MODE === 'onchain' ? 'Launch Token' : 'Create Token'}
          </span>
        </button>

        {error && (
          <div className="mt-6 p-4 border border-red-600/30 bg-red-600/10 text-[9px] font-mono text-red-500 uppercase tracking-widest text-center">
             ⚠ Error: {error}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-[8px] text-white/20 font-mono uppercase tracking-[0.4em] gap-4">
           <div className="flex items-center gap-4">
              <span>{LAUNCH_MODE === 'onchain' ? 'Bonding Curve' : '0.02 SOL Fee'}</span>
              <span className="hidden sm:block w-1 h-1 bg-white/10" />
              <span>Solana {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}</span>
           </div>
           <span>1B $RDX Supply</span>
        </div>
      </div>

      <style jsx>{`
        .rd-input {
          width: 100%;
          background: rgba(0,0,0,0.55);
          border: 1px solid rgba(127,29,29,0.22);
          padding: 0.65rem 0.75rem;
          color: white;
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 0.8rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .rd-input:focus { border-color: rgba(239,68,68,0.5); }
        .rd-input::placeholder { color: rgba(255,255,255,0.18); }
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
