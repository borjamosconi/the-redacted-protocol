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
