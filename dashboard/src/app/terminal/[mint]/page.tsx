'use client'

import { useState, useEffect, useRef, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import {
  PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL,
  TransactionMessage, VersionedTransaction, TransactionInstruction,
} from '@solana/web3.js'

// Solana Memo program — the standard way to attach a human-readable
// description to a tx so wallets can display context instead of falling
// back to "unknown program / possible scam" heuristics.
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

function memoIx(text: string): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [],
    data: Buffer.from(text, 'utf-8'),
  })
}
import { Header } from '@/components/Header'
import { TokenChart } from '@/components/TokenChart'

// ── Fee config (mirrors route.ts) ────────────────────────────────────────────
const TREASURY_WALLET = process.env.NEXT_PUBLIC_RDX_TREASURY_WALLET
  ? new PublicKey(process.env.NEXT_PUBLIC_RDX_TREASURY_WALLET)
  : null
const MAIN_VAULT = new PublicKey('CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8')
const TREASURY_FEE_PCT = 0.01   // 1% → RDX treasury
const CREATOR_FEE_PCT  = 0.005  // 0.5% → token creator
const VAULT_PCT        = 0.985  // 98.5% → main vault

interface TokenDetail {
  mint:         string
  name:         string
  symbol:       string
  description:  string
  logo:         string
  creator:      string
  createdAt:    number
  twitterUrl?:  string
  websiteUrl?:  string
  tokensSold:   number
  solRaised:    number
  buyerCount:   number
  currentPrice: number
  rdxPerSol:    number
  progress:     number
  tokensRemaining: number
  maxSupplyCurve:  number
  userTokens:   number
  quote:        { tokensOut: number; avgPrice: number }
  trades:       Trade[]
}

interface Trade {
  wallet:       string
  side:         'buy' | 'sell'
  solAmount:    number
  tokensOut:    number
  price:        number
  ts:           number
  txSignature:  string
}

function ReconstructionTerminal() {
  const [logs, setLogs] = useState<string[]>([
    '> INITIALIZING AI ORCHESTRATOR...',
    '> LOADING FRAGMENT_V2_DATASET...',
    '> CONNECTING TO LLAMA_3_LLM_CLUSTER...',
  ])
  const [input, setInput] = useState('')

  useEffect(() => {
    const pool = [
      'Analyzing cross-references in Section 14...',
      'Matching redaction pattern: Type B (Blackout)...',
      'Confidence score: 0.94. Fragment reconstructed.',
      'Scanning for metadata leaks in headers...',
      'OCR verification successful (Page 4).',
      'Anomaly detected in paragraph 12. Adjusting focus...',
      'Deep-learning reconstruction in progress...',
    ]
    const t = setInterval(() => {
      setLogs(prev => [...prev.slice(-8), `> ${pool[Math.floor(Math.random() * pool.length)]}`])
    }, 3500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="rd-card bg-black/60 border-red-900/30 p-4 font-mono text-[9px] space-y-1 h-48 overflow-hidden relative">
      <div className="absolute top-2 right-4 text-red-500/30 animate-pulse">LIVE AGENT FEED</div>
      {logs.map((log, i) => (
        <div key={i} className={log.startsWith('> ') ? 'text-gray-400' : 'text-red-500'}>
          {log}
        </div>
      ))}
      <div className="flex gap-2 text-white mt-2 border-t border-red-900/10 pt-2">
        <span className="text-red-500">$</span>
        <span className="animate-pulse">_</span>
      </div>
    </div>
  )
}

function DocumentPreview({ progress, name }: { progress: number; name: string }) {
  const text = `The objective of this operation was to ensure the [REDACTED] of the [REDACTED] cluster. 
  By utilizing the [REDACTED] protocol, the team successfully [REDACTED] the targets. 
  Evidence suggests that [REDACTED] was involved in the [REDACTED] from the very beginning. 
  The final report [REDACTED] that the [REDACTED] was actually a [REDACTED] for [REDACTED].`

  const revealChar = (char: string, index: number) => {
    if (char === ' ' || char === '\n') return char
    // Simple heuristic: reveal more as progress increases
    const revealThreshold = (index % 100)
    if (progress > revealThreshold) return char
    return '█'
  }

  return (
    <div className="rd-card p-6 bg-white/[0.02] border-red-900/20 relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-2 text-[8px] font-bold text-red-900/40 uppercase tracking-widest border-l border-b border-red-900/10 bg-black/40">
         Decryption Level: {progress.toFixed(0)}%
       </div>
       <h4 className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.3em] mb-4">Document Fragment: {name}</h4>
       <div className="font-mono text-xs leading-relaxed text-gray-500 select-none whitespace-pre-wrap">
         {text.split('').map((c, i) => (
           <span key={i} className={c !== '█' ? 'text-gray-300' : 'text-red-950/40'}>
             {revealChar(c, i)}
           </span>
         ))}
       </div>
       {progress < 100 && (
         <div className="mt-4 p-2 bg-red-500/5 border border-red-500/10 rounded-sm text-center">
            <p className="text-[8px] text-red-400 uppercase tracking-widest animate-pulse">
              Increase bonding curve progress to reveal more fragments
            </p>
         </div>
       )}
    </div>
  )
}

export default function TokenDetailPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = use(params)
  const { connection }              = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const [token,    setToken]    = useState<TokenDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [buyAmount,setBuyAmount]= useState('0.1')
  const [buying,   setBuying]   = useState(false)
  const [status,   setStatus]   = useState<{ type: 'idle'|'pending'|'success'|'error'; msg: string }>({ type: 'idle', msg: '' })
  const [activeTab,setActiveTab]= useState<'trades'|'info'|'holders'>('trades')
  const [solBalance, setSolBalance] = useState<number>(0)
  const [showCRT, setShowCRT] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchToken = async (sol?: string) => {
    try {
      const qs  = new URLSearchParams()
      if (sol) qs.set('sol', sol)
      if (publicKey) {
        qs.set('wallet', publicKey.toString())
        // Fetch balance
        connection.getBalance(publicKey).then(b => setSolBalance(b / LAMPORTS_PER_SOL))
      }
      const res  = await fetch(`/api/tokens/${mint}?${qs}`)
      if (!res.ok) return
      const data = await res.json()
      setToken(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  // Live polling
  useEffect(() => {
    fetchToken(buyAmount)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => fetchToken(buyAmount), 5_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [mint, publicKey])

  // Re-quote when buy amount changes
  useEffect(() => {
    const sol = parseFloat(buyAmount)
    if (!isNaN(sol) && sol > 0) fetchToken(buyAmount)
  }, [buyAmount])

  // ── Buy handler ──────────────────────────────────────────────────────────
  const handleBuy = async () => {
    if (!publicKey || !token) return
    const sol = parseFloat(buyAmount)
    if (isNaN(sol) || sol <= 0) {
      setStatus({ type: 'error', msg: 'Enter a valid SOL amount.' })
      return
    }
    if (token.tokensRemaining <= 0) {
      setStatus({ type: 'error', msg: 'Bonding curve is full.' })
      return
    }

    setBuying(true)
    setStatus({ type: 'pending', msg: 'Checking balance...' })

    try {
      const balance = await connection.getBalance(publicKey)
      if (balance < sol * LAMPORTS_PER_SOL + 15_000) {
        throw new Error(`Insufficient SOL. Need ${sol} + gas.`)
      }

      // Versioned (v0) transaction: SOL transfer + Memo describing the
      // intent. Modern wallets (Phantom, Solflare, Backpack) parse the
      // memo and surface it in the signing UI as the tx's purpose,
      // which prevents the "possibly malicious" generic warning.
      const lamports = Math.floor(sol * LAMPORTS_PER_SOL)
      const { blockhash } = await connection.getLatestBlockhash()
      const memo = `Buy ${sol} SOL of $${token.symbol} on redacted.bond — bonding curve trade`
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey:   MAIN_VAULT,
            lamports,
          }),
          memoIx(memo),
        ],
      }).compileToV0Message()
      const tx = new VersionedTransaction(messageV0)

      setStatus({ type: 'pending', msg: 'Approve in wallet...' })
      const sig = await sendTransaction(tx, connection)
      // Don't block on confirmation — public RPC sometimes takes >30 s to
      // return status for an already-finalized tx. Once we have a
      // signature, the network has it and the trade route will accept it.
      // Confirmation continues in the background for telemetry only.
      void connection.confirmTransaction(sig, 'confirmed').catch(() => {})

      setStatus({ type: 'pending', msg: 'Recording trade…' })

      // Record trade
      const res = await fetch(`/api/tokens/${mint}/trade`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet: publicKey.toString(), solAmount: sol, txSignature: sig }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) throw new Error(data.error || 'Trade recording failed.')

      const got = data.tokensOut?.toLocaleString() ?? '?'
      setStatus({ type: 'success', msg: `✓ Got ${got} $${token.symbol}! Tx: ${sig.slice(0,8)}...` })
      fetchToken(buyAmount)
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Transaction failed.' })
    } finally {
      setBuying(false)
    }
  }

  // ── Sell handler ─────────────────────────────────────────────────────────
  // Burns the user's virtual RDX and credits a pending SOL payout. The
  // actual SOL transfer is a manual batch from the treasury (no server
  // keypair). Until graduation, sellers see "Pending payout: X SOL" in
  // their balance and wait for the next batch settlement.
  const handleSell = async () => {
    if (!publicKey || !token) return
    const tokensIn = Math.floor(token.userTokens || 0)
    if (tokensIn <= 0) {
      setStatus({ type: 'error', msg: 'You have no tokens to sell.' })
      return
    }
    setBuying(true)
    setStatus({ type: 'pending', msg: 'Recording sell…' })
    try {
      const res = await fetch(`/api/tokens/${mint}/sell`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet: publicKey.toString(), tokensIn }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Sell failed.')
      setStatus({
        type: 'success',
        msg:  `✓ Sold ${tokensIn.toLocaleString()} ${token.symbol}. Pending payout: ${data.solRefund.toFixed(4)} SOL`,
      })
      fetchToken(buyAmount)
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Sell failed.' })
    } finally {
      setBuying(false)
    }
  }

  const fmtPrice = (p: number) => {
    if (p < 0.000001) return p.toExponential(4)
    if (p < 0.01)     return p.toFixed(8)
    return p.toFixed(6)
  }

  if (loading) return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-5 h-5 border border-red-900/30 border-t-red-500 rounded-full animate-spin" />
          <span className="text-gray-600 text-xs font-mono tracking-widest uppercase">Loading token...</span>
        </div>
      </div>
    </>
  )

  if (!token) return (
    <>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-mono mb-4">Token not found</p>
          <Link href="/terminal" className="text-red-400 text-xs font-mono hover:underline">← Back to Terminal</Link>
        </div>
      </div>
    </>
  )

  const isGraduating = token.progress >= 80

  return (
    <>
      {showCRT && (
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,255,0,0.06))] bg-[size:100%_2px,3px_100%]" />
      )}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-24 sm:pt-28 pb-20 relative">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 mb-5">
          <Link href="/terminal" className="hover:text-white transition-colors">Terminal</Link>
          <span>/</span>
          <span className="text-gray-400">${token.symbol}</span>
        </div>

        {/* ── Main layout: chart + sidebar ─────────────────────────────────── */}
        <div className="flex flex-col xl:grid xl:grid-cols-[1fr_320px] gap-5">

          {/* ── Mobile Action: Buy panel (Prominent on small screens) ── */}
          <div className="xl:hidden order-1">
             <div className="mb-4">
               <BuyPanel 
                 token={token} 
                 buyAmount={buyAmount} 
                 setBuyAmount={setBuyAmount} 
                 buying={buying} 
                 handleBuy={handleBuy} 
                 handleSell={handleSell} 
                 status={status} 
                 publicKey={publicKey}
                 solBalance={solBalance}
               />
             </div>
          </div>

          {/* ── Left: chart area ────────────────────────────────────────────── */}
          <div className="space-y-4 order-2 xl:order-1">

            {/* Token header — name, logo, socials */}
            <div className="rd-card p-4 sm:p-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-red-950/20 border border-red-900/20 flex-shrink-0">
                  {token.logo
                    ? <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-red-500/40 text-xl font-black">{token.symbol.charAt(0)}</div>
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm sm:text-lg font-black text-white truncate max-w-[120px] sm:max-w-none">{token.name}</span>
                    <span className="text-[10px] sm:text-xs text-red-400 font-mono font-bold">${token.symbol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {token.twitterUrl && (
                      <a href={token.twitterUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-gray-500 hover:text-white transition-colors px-2 py-0.5 border border-white/10 rounded-sm">𝕏</a>
                    )}
                    <button 
                      onClick={() => { navigator.clipboard.writeText(token.mint); alert('Mint copied!') }}
                      className="text-[8px] text-gray-600 hover:text-white font-mono border border-white/5 px-2 py-0.5 uppercase tracking-tighter"
                    >
                      {token.mint.slice(0,4)}...{token.mint.slice(-4)} [COPY]
                    </button>
                    <button onClick={() => setShowCRT(!showCRT)} className={`text-[8px] border px-2 py-0.5 uppercase ${showCRT ? 'border-red-500 text-red-500' : 'border-white/10 text-gray-600'}`}>
                      CRT: {showCRT ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
              {isGraduating && <span className="text-[7px] sm:text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">GRADUATING</span>}
            </div>

            {/* Stats row — Price, Market Cap, SOL raised, Holders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: 'Price', value: `${fmtPrice(token.currentPrice)}`, accent: 'text-white' },
                { label: 'Market Cap', value: `${(token.currentPrice * (token.maxSupplyCurve ?? 1_000_000_000)).toFixed(1)} SOL`, accent: 'text-red-400' },
                { label: 'Raised', value: `${token.solRaised.toFixed(2)}`, accent: 'text-green-400' },
                { label: 'Holders', value: token.buyerCount.toString(), accent: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="rd-card p-2 sm:p-3">
                  <div className="text-[7px] sm:text-[9px] text-gray-600 uppercase tracking-widest mb-1">{s.label}</div>
                  <div className={`text-xs sm:text-base font-black font-mono ${s.accent}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* THE CHART */}
            <div className="h-[300px] sm:h-[450px]">
              <TokenChart mint={mint} symbol={token.symbol} height={typeof window !== 'undefined' && window.innerWidth < 640 ? 300 : 450} />
            </div>

            {/* Progress bar */}
            <div className="rd-card p-4">
              <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-2">
                <span>Progress</span>
                <span className={isGraduating ? 'text-yellow-400 font-bold' : ''}>{token.progress.toFixed(2)}%</span>
              </div>
              <div className="h-2 bg-red-950/10 rounded-full border border-red-900/10 overflow-hidden">
                <motion.div
                  animate={{ width: `${Math.min(token.progress, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full ${isGraduating ? 'bg-gradient-to-r from-yellow-700 to-yellow-400' : 'bg-gradient-to-r from-red-700 via-red-500 to-red-400'}`}
                />
              </div>
            </div>

            {/* Interactive Elements - Simplified for Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="hidden md:block"><ReconstructionTerminal /></div>
               <DocumentPreview progress={token.progress} name={token.name} />
            </div>

            {/* Tabs: Trades / Info / Holders */}
            <div className="rd-card overflow-hidden">
              <div className="flex border-b border-red-900/10">
                {(['trades', 'info', 'holders'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ${
                      activeTab === tab
                        ? 'text-white border-b-2 border-red-500 bg-red-500/5'
                        : 'text-gray-600 hover:text-white'
                    }`}>{tab}</button>
                ))}
              </div>

              {activeTab === 'trades' && (
                <div className="divide-y divide-red-900/10 max-h-80 overflow-y-auto no-scrollbar">
                  {token.trades.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-gray-700 font-mono">No trades yet</div>
                  ) : token.trades.map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-mono hover:bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.side === 'buy' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-gray-500 truncate max-w-[60px] sm:max-w-none">{t.wallet}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={t.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                          {t.solAmount?.toFixed(3) ?? '?'} SOL
                        </span>
                        <span className="text-gray-700 hidden sm:inline">{new Date(t.ts * 1000).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* ... existing tab contents ... */}
            </div>
          </div>

          {/* ── Right: Desktop Sidebar (Hidden on mobile as we moved it to the top) ── */}
          <div className="hidden xl:block xl:order-2 space-y-4">
             <BuyPanel 
               token={token} 
               buyAmount={buyAmount} 
               setBuyAmount={setBuyAmount} 
               buying={buying} 
               handleBuy={handleBuy} 
               handleSell={handleSell} 
               status={status} 
               publicKey={publicKey}
             />
          </div>
        </div>
      </main>

      {/* ── Mobile Floating Buy Bar ── */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-black/80 backdrop-blur-md border-t border-red-500/20 safe-area-pb">
        <div className="flex gap-2">
           <div className="flex-1">
             <button onClick={handleBuy} disabled={buying || token.progress >= 100}
               className="w-full py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(255,0,0,0.4)]">
               {buying ? '...' : `QUICK_BUY $${token.symbol}`}
             </button>
           </div>
           {token.userTokens > 0 && (
             <button onClick={handleSell} className="px-4 py-4 bg-white/5 border border-white/10 text-white/40">
               <span className="text-[10px] font-black">SELL</span>
             </button>
           )}
        </div>
      </div>
    </>
  )
}

// ── Reusable Buy Panel Component ────────────────────────────────────────────
function BuyPanel({ 
  token, buyAmount, setBuyAmount, buying, handleBuy, handleSell, status, publicKey, solBalance 
}: any) {
  // Simple P/L estimation if we assume an entry point (for demo)
  const hasTokens = (token.userTokens || 0) > 0
  return (
    <div className="rd-card p-5 space-y-4 relative overflow-hidden">
      {/* Visual Decoration */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/5 rotate-45 translate-x-8 translate-y--8 pointer-events-none" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_#ff1a1a]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">EXCHANGE_NODE</span>
        </div>
        {publicKey && (
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">BAL: {solBalance.toFixed(3)} SOL</span>
        )}
      </div>

      {hasTokens && (
        <div className="p-3 border border-red-900/20 bg-red-950/10 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[8px] text-gray-600 uppercase">Your Holdings</span>
            <span className="text-xs font-black text-white">{token.userTokens.toLocaleString()} ${token.symbol}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-gray-600 uppercase">Value (SOL)</span>
            <span className="text-xs font-black text-green-500">~{(token.userTokens * token.currentPrice).toFixed(3)}</span>
          </div>
        </div>
      )}

      {/* Amount input */}
      <div>
        <label className="block text-[8px] text-gray-600 uppercase tracking-widest mb-2">Amount (SOL)</label>
        <div className="relative">
          <input
            type="number" step="0.1" min="0.01" value={buyAmount}
            onChange={e => setBuyAmount(e.target.value)}
            className="w-full bg-black/60 border border-white/10 focus:border-red-500/40 outline-none px-4 py-3 text-white font-mono text-xl transition-all"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
             <button onClick={() => setBuyAmount('0.1')} className="text-[9px] text-red-500/40 hover:text-red-500">MIN</button>
             <button onClick={() => setBuyAmount('1')} className="text-[9px] text-red-500/40 hover:text-red-500">MAX</button>
          </div>
        </div>
      </div>

      {/* Quick Picks */}
      <div className="grid grid-cols-3 gap-2">
        {['0.1','0.5','1'].map(v => (
          <button key={v} onClick={() => setBuyAmount(v)}
            className={`py-4 text-[10px] font-black border transition-all ${
              buyAmount === v ? 'border-red-600 bg-red-600/20 text-white' : 'border-white/10 text-white/40 hover:bg-white/5'
            }`}>{v} SOL</button>
        ))}
      </div>

      {/* Reward Preview */}
      <div className="p-3 bg-red-600/5 border border-red-600/10 rounded-sm">
         <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] text-white/30 uppercase tracking-widest">DECRYPTION_XP</span>
            <span className="text-[10px] font-black text-red-500">+{Math.floor(parseFloat(buyAmount || '0') * 100)} XP</span>
         </div>
         <div className="flex justify-between items-center">
            <span className="text-[8px] text-white/30 uppercase tracking-widest">EST_RECEIVE</span>
            <span className="text-[10px] font-black text-white">{token.quote.tokensOut > 0 ? token.quote.tokensOut.toLocaleString() : '0'} $RDX</span>
         </div>
      </div>

      {/* Buttons */}
      {publicKey ? (
        <div className="space-y-2">
          <button onClick={handleBuy} disabled={buying || token.tokensRemaining <= 0}
            className="w-full py-5 bg-red-600 hover:bg-white text-white hover:text-black font-black text-xs uppercase tracking-[0.4em] transition-all relative overflow-hidden group">
            <span className="relative z-10">{buying ? 'PROCESSING...' : `BUY $${token.symbol}`}</span>
          </button>
          {token.userTokens > 0 && (
            <button onClick={handleSell} disabled={buying}
              className="w-full py-3 border border-white/10 hover:border-red-600/50 text-[9px] text-white/30 hover:text-red-500 font-black uppercase tracking-[0.3em] transition-all">
              SELL_HOLDINGS
            </button>
          )}
        </div>
      ) : (
        <div className="flex justify-center border border-white/10 p-4 bg-white/5">
           <span className="text-[9px] text-white/40 uppercase tracking-widest font-black">CONNECT_WALLET_TO_TRADE</span>
        </div>
      )}

      {/* Status */}
      <AnimatePresence mode="wait">
        {status.type !== 'idle' && (
          <motion.div key={status.msg} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`p-3 text-[9px] font-mono border text-center uppercase tracking-widest ${
              status.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-500' :
              status.type === 'error'   ? 'border-red-500/30 bg-red-500/10 text-red-500' :
              'border-white/20 bg-white/5 text-white/60'
            }`}>
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
