'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { 
  Keypair, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { 
  MINT_SIZE, 
  TOKEN_PROGRAM_ID, 
  createInitializeMintInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  createMintToInstruction, 
  createSetAuthorityInstruction,
  AuthorityType 
} from '@solana/spl-token'
import Image from 'next/image'
import { RDX_PUBLIC_KEYS } from '@/lib/rdx-public-config'

// ─── Wallet Config ────────────────────────────────────────────────────────────
const TREASURY_WALLET = RDX_PUBLIC_KEYS.treasuryWallet
const AIRDROP_WALLET = RDX_PUBLIC_KEYS.airdropWallet
const MAIN_AUTHORITY = RDX_PUBLIC_KEYS.mainAuthority

// ─── Official Token Config (read-only) ───────────────────────────────────────
const TOKEN_CONFIG = {
  name:        'The Redacted Protocol',
  symbol:      'RDX',
  decimals:    9,
  totalSupply: '1,000,000,000',
  description: 'A sovereign AI agent infrastructure built on Solana. A declassified system that autonomously generates, archives and distributes intelligence fragments on-chain. Every interaction is immutable. Every fragment, classified.',
  website:     'https://redacted.bond',
  twitter:     'https://x.com/theredacted_sol',
  github:      'https://github.com/redacted-protocol',
  logo:        '/logo.png',
}

// ─── Tokenomics ───────────────────────────────────────────────────────────────
const DECIMALS    = 9
const MULT        = BigInt(10 ** DECIMALS)
const DIST = {
  AIRDROP:   BigInt(400_000_000), // 40% → CMESXEN...
  TEAM:      BigInt(200_000_000), // 20% → H4C2G...
  LIQUIDITY: BigInt(200_000_000), // 20% → Main wallet (LP)
  STAKING:   BigInt(100_000_000), // 10% → Main wallet (staking)
  DAO:       BigInt(100_000_000), // 10% → H4C2G... (DAO vote)
}

const TOKENOMICS = [
  { label: 'Community Airdrop', pct: '40%', amount: '400M', color: 'bg-red-500',    dest: 'CMESXEN...Kc5X8' },
  { label: 'Team (6mo cliff)',   pct: '20%', amount: '200M', color: 'bg-purple-500', dest: 'H4C2G...KXMeu'   },
  { label: 'Liquidity Pool',     pct: '20%', amount: '200M', color: 'bg-blue-500',   dest: 'Main + LP Burn'  },
  { label: 'Staking Rewards',    pct: '10%', amount: '100M', color: 'bg-orange-500', dest: 'Main → Pool'     },
  { label: 'Treasury / DAO',     pct: '10%', amount: '100M', color: 'bg-green-500',  dest: 'H4C2G...KXMeu'  },
]

export function TokenLaunchPanel() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const [loading, setLoading]         = useState(false)
  const [status, setStatus]           = useState<string | null>(null)
  const [mintAddress, setMintAddress] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [checkBalance, setCheckBalance] = useState<boolean | null>(null)

  const verifySecurity = async () => {
    if (!publicKey) return
    setLoading(true)
    setStatus('Running security audit...')
    
    try {
      if (!MAIN_AUTHORITY) {
        throw new Error('CONFIG ERROR: Missing NEXT_PUBLIC_RDX_MAIN_AUTHORITY.')
      }

      // 1. Verify Wallet Identity
      if (!publicKey.equals(MAIN_AUTHORITY)) {
        throw new Error('UNAUTHORIZED WALLET: Deployment locked to Master Authority.')
      }

      // 2. Verify wallet addresses are configured
      if (!TREASURY_WALLET || !AIRDROP_WALLET) {
        throw new Error('CONFIG ERROR: Treasury or airdrop wallet is missing/invalid.')
      }

      // 3. Verify SOL Balance
      const balance = await connection.getBalance(publicKey)
      const required = 0.05 * LAMPORTS_PER_SOL // 0.02 fee + rent + buffers
      if (balance < required) {
        setCheckBalance(false)
        throw new Error(`INSUFFICIENT FUNDS: Need ~0.05 SOL for protocol deployment.`)
      }
      setCheckBalance(true)
      
      setStatus(null)
      setShowConfirm(true)
    } catch (e: any) {
      setStatus(`SECURITY ALERT: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const launchToken = async () => {
    setShowConfirm(false)
    setLoading(true)

    try {
      if (!publicKey) return
      if (!TREASURY_WALLET || !AIRDROP_WALLET || !MAIN_AUTHORITY) {
        throw new Error('CONFIG ERROR: Missing or invalid RDX wallet environment variables.')
      }

      const mintKeypair = Keypair.generate()
      const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)

      const wallet = publicKey

      setStatus('Building transaction...')
      const tx1 = new Transaction().add(
        // Pay fee to treasury
        SystemProgram.transfer({ fromPubkey: wallet, toPubkey: TREASURY_WALLET, lamports: Math.floor(0.02 * LAMPORTS_PER_SOL) }),
        SystemProgram.createAccount({ fromPubkey: wallet, newAccountPubkey: mintKeypair.publicKey, space: MINT_SIZE, lamports, programId: TOKEN_PROGRAM_ID }),
        createInitializeMintInstruction(mintKeypair.publicKey, DECIMALS, wallet, wallet)
      )

      setStatus('Waiting for wallet approval (1/3)...')
      const sig1 = await sendTransaction(tx1, connection, { signers: [mintKeypair] })
      await connection.confirmTransaction(sig1, 'confirmed')
      setStatus('✓ Mint created. Distributing per tokenomics (2/3)...')

      // Distribute per tokenomics
      const dists = [
        { wallet: AIRDROP_WALLET,  amount: DIST.AIRDROP,   label: 'Airdrop 40%'   },
        { wallet: TREASURY_WALLET, amount: DIST.TEAM,      label: 'Team 20%'      },
        { wallet: wallet,          amount: DIST.LIQUIDITY, label: 'Liquidity 20%' },
        { wallet: wallet,          amount: DIST.STAKING,   label: 'Staking 10%'   },
        { wallet: TREASURY_WALLET, amount: DIST.DAO,       label: 'DAO 10%'       },
      ]
      for (const d of dists) {
        const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, d.wallet)
        const tx = new Transaction().add(
          createAssociatedTokenAccountInstruction(wallet, ata, d.wallet, mintKeypair.publicKey),
          createMintToInstruction(mintKeypair.publicKey, ata, wallet, d.amount * MULT)
        )
        const s = await sendTransaction(tx, connection)
        await connection.confirmTransaction(s, 'confirmed')
        setStatus(`✓ ${d.label} distributed...`)
      }

      setStatus('Revoking mint authority (3/3)...')
      const tx3 = new Transaction().add(
        createSetAuthorityInstruction(mintKeypair.publicKey, wallet, AuthorityType.MintTokens, null)
      )
      const sig3 = await sendTransaction(tx3, connection)
      await connection.confirmTransaction(sig3, 'confirmed')

      setMintAddress(mintKeypair.publicKey.toBase58())
      setStatus('🔴 $RDX IS LIVE. Protocol launched.')
    } catch (e: any) {
      console.error(e)
      setStatus(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rd-card border-red-500/40 bg-red-950/5 overflow-hidden relative">
      {/* Top glow */}
      <div className="absolute -top-16 right-1/2 translate-x-1/2 w-96 h-32 bg-red-500/10 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="p-6 border-b border-red-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ff1a1a]" />
          <span className="text-[10px] font-black tracking-[0.4em] text-rd-muted uppercase">Admin — Official Token Deployment</span>
        </div>
        <span className="text-[9px] font-mono bg-red-500/10 border border-red-500/20 px-3 py-1 text-red-500 tracking-widest">OWNER ONLY</span>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-10">

        {/* ── Left: Token Identity ─────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="relative w-40 h-40 rounded-full overflow-hidden border-2 border-red-500/40 shadow-[0_0_40px_rgba(255,26,26,0.2)]">
            <Image src="/logo.png" alt="RDX Logo" fill className="object-cover" />
          </div>

          {/* Name & symbol */}
          <div className="text-center">
            <div className="text-2xl font-black text-white tracking-tight">{TOKEN_CONFIG.name}</div>
            <div className="text-red-500 font-mono font-bold tracking-widest">${TOKEN_CONFIG.symbol}</div>
          </div>

          {/* Description */}
          <p className="text-[10px] text-rd-muted/70 text-center leading-relaxed font-mono max-w-xs">
            {TOKEN_CONFIG.description}
          </p>

          {/* Links */}
          <div className="flex gap-3 flex-wrap justify-center">
            <a href={TOKEN_CONFIG.website} target="_blank" rel="noopener noreferrer"
              className="text-[9px] font-bold uppercase tracking-widest px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all">
              🌐 redacted.bond
            </a>
            <a href={TOKEN_CONFIG.twitter} target="_blank" rel="noopener noreferrer"
              className="text-[9px] font-bold uppercase tracking-widest px-4 py-2 border border-white/10 text-white hover:bg-white/5 transition-all">
              𝕏 @theredacted_sol
            </a>
            <a href={TOKEN_CONFIG.github} target="_blank" rel="noopener noreferrer"
              className="text-[9px] font-bold uppercase tracking-widest px-4 py-2 border border-white/10 text-white hover:bg-white/5 transition-all">
              ⌥ GitHub
            </a>
          </div>

          {/* Readonly fields */}
          <div className="w-full space-y-2">
            {[
              { label: 'Decimals', value: String(TOKEN_CONFIG.decimals) },
              { label: 'Total Supply', value: TOKEN_CONFIG.totalSupply },
              { label: 'Mint Authority', value: 'RENOUNCED after launch' },
              { label: 'Network', value: 'Solana Mainnet' },
            ].map(f => (
              <div key={f.label} className="flex justify-between py-2 border-b border-red-900/10 text-[10px]">
                <span className="text-rd-muted/50 uppercase tracking-widest">{f.label}</span>
                <span className="font-mono text-white">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Tokenomics + Deploy ───────────────────────────── */}
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-[9px] text-rd-muted/50 uppercase tracking-[0.3em] mb-5">Distribution — 1,000,000,000 RDX</h3>
            <div className="space-y-3">
              {TOKENOMICS.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-white font-bold">{t.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-rd-muted/50">{t.dest}</span>
                      <span className="text-white font-bold w-10 text-right">{t.pct}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-red-950/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: t.pct }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className={`h-full ${t.color} opacity-80`}
                    />
                  </div>
                  <div className="text-[9px] text-rd-muted/30 mt-0.5 text-right">{t.amount} RDX</div>
                </div>
              ))}
            </div>
          </div>

          {/* Launch Button */}
          <div className="mt-auto pt-6 border-t border-red-900/10">
            {!mintAddress ? (
              <>
                <button 
                  onClick={verifySecurity}
                  disabled={loading || !publicKey}
                  className="w-full py-5 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-[0.5em] transition-all shadow-[0_0_30px_rgba(255,26,26,0.25)] hover:shadow-[0_0_50px_rgba(255,26,26,0.4)]"
                >
                  {loading ? 'Performing Audit...' : '🔴 DEPLOY $RDX TOKEN'}
                </button>

                {/* Security Confirmation Modal */}
                <AnimatePresence>
                  {showConfirm && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="rd-card max-w-lg w-full p-8 border-red-500/50 bg-black relative"
                      >
                        <div className="absolute top-4 right-4 cursor-pointer text-rd-muted hover:text-white" onClick={() => setShowConfirm(false)}>✕</div>
                        
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                              <span className="text-xl">⚠️</span>
                           </div>
                           <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Confirm Secure Deployment</h3>
                        </div>

                        <p className="text-xs text-rd-muted mb-8 leading-relaxed">
                          You are about to launch the official <span className="text-white font-bold">$RDX Protocol</span>. 
                          This action is <span className="text-red-500 font-bold underline">IMMUTABLE</span>. 
                          The following security parameters will be locked:
                        </p>

                        <div className="space-y-4 mb-8">
                           <div className="bg-red-950/10 border border-red-900/20 p-4 rounded-sm flex items-center justify-between">
                              <span className="text-[9px] text-rd-muted uppercase tracking-widest font-mono">Supply Status</span>
                              <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Fixed 1B RDX</span>
                           </div>
                           <div className="bg-red-950/10 border border-red-900/20 p-4 rounded-sm flex items-center justify-between">
                              <span className="text-[9px] text-rd-muted uppercase tracking-widest font-mono">Mint Authority</span>
                              <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest underline">RENOUNCED</span>
                           </div>
                           <div className="bg-red-950/10 border border-red-900/20 p-4 rounded-sm flex items-center justify-between">
                              <span className="text-[9px] text-rd-muted uppercase tracking-widest font-mono">Distribution</span>
                              <span className="text-[10px] text-white font-bold uppercase tracking-widest">Multi-Wallet (Safe)</span>
                           </div>
                        </div>

                        <div className="flex gap-4">
                           <button 
                             onClick={() => setShowConfirm(false)}
                             className="flex-1 py-4 border border-white/10 text-rd-muted text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
                           >
                             Abort
                           </button>
                           <button 
                             onClick={launchToken}
                             className="flex-1 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(255,26,26,0.3)] hover:bg-red-500 transition-all"
                           >
                             Authorize Deploy
                           </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex justify-between text-[9px] text-rd-muted/40 font-mono mt-3 px-1">
                  <span>Fee: 0.02 SOL → Treasury</span>
                  <span>Wallet: {publicKey ? `${publicKey.toBase58().slice(0,4)}...${publicKey.toBase58().slice(-4)}` : 'Not connected'}</span>
                </div>
              </>
            ) : (
              <div className="bg-green-950/20 border border-green-500/30 p-5 rounded-sm text-center space-y-3">
                <div className="text-green-400 font-black uppercase tracking-widest text-[10px]">✓ $RDX Protocol Is Live</div>
                <div>
                  <div className="text-[9px] text-rd-muted mb-1 uppercase tracking-widest">Mint Address</div>
                  <code className="text-xs text-white break-all">{mintAddress}</code>
                </div>
                <div className="text-[9px] text-rd-muted/50 border-t border-green-900/20 pt-3">
                  Add <code className="text-green-400">NEXT_PUBLIC_RDX_MINT={mintAddress}</code> to Vercel env
                </div>
              </div>
            )}

            <AnimatePresence>
              {status && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[9px] font-mono text-red-400/80 uppercase tracking-widest text-center mt-3"
                >
                  {status}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
