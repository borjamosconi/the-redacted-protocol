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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchToken = async (sol?: string) => {
    try {
      const qs  = new URLSearchParams()
      if (sol) qs.set('sol', sol)
      if (publicKey) qs.set('wallet', publicKey.toString())
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
      <Header />
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
      <Header />
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
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-24 sm:pt-28 pb-20">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 mb-5">
          <Link href="/terminal" className="hover:text-white transition-colors">Terminal</Link>
          <span>/</span>
          <span className="text-gray-400">${token.symbol}</span>
        </div>

        {/* ── Main layout: chart + sidebar ─────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

          {/* ── Left: chart area ────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Token header — name, logo, socials */}
            <div className="rd-card p-5 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-red-950/20 border border-red-900/20 flex-shrink-0 shadow-[0_0_20px_rgba(255,26,26,0.1)]">
                  {token.logo
                    ? <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-red-500/40 text-xl font-black">{token.symbol.charAt(0)}</div>
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base sm:text-lg font-black text-white">{token.name}</span>
                    <span className="text-xs text-red-400 font-mono font-bold">${token.symbol}</span>
                    {isGraduating && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">✨ GRADUATING</span>}
                  </div>
                  <div className="text-[10px] text-gray-600 font-mono mb-2">
                    {token.mint.slice(0,8)}...{token.mint.slice(-6)}
                    <button
                      onClick={() => navigator.clipboard.writeText(token.mint)}
                      className="ml-2 text-gray-700 hover:text-white transition-colors"
                    >⎘ Copy</button>
                    <a href={`https://solscan.io/token/${token.mint}`} target="_blank" rel="noopener noreferrer"
                      className="ml-2 text-gray-700 hover:text-white transition-colors">↗ Solscan</a>
                  </div>
                  <div className="flex items-center gap-2">
                    {token.twitterUrl && (
                      <a href={token.twitterUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-gray-500 hover:text-white transition-colors px-2 py-0.5 border border-white/10 rounded-sm">𝕏</a>
                    )}
                    {token.websiteUrl && (
                      <a href={token.websiteUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-gray-500 hover:text-white transition-colors px-2 py-0.5 border border-white/10 rounded-sm">🌐</a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats row — Price, Market Cap, SOL raised, Holders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Price',
                  value: `${fmtPrice(token.currentPrice)} SOL`,
                  accent: 'text-white',
                },
                {
                  label: 'Market Cap',
                  value: `${(token.currentPrice * (token.totalSupplyCurve ?? 1_000_000_000)).toFixed(2)} SOL`,
                  accent: 'text-red-400',
                },
                {
                  label: 'SOL Raised',
                  value: `${token.solRaised.toFixed(3)}`,
                  accent: 'text-green-400',
                },
                {
                  label: 'Holders',
                  value: token.buyerCount.toString(),
                  accent: 'text-blue-400',
                },
              ].map(s => (
                <div key={s.label} className="rd-card p-3">
                  <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mb-1">{s.label}</div>
                  <div className={`text-base font-black font-mono ${s.accent}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* THE CHART */}
            <TokenChart mint={mint} symbol={token.symbol} height={460} />

            {/* Progress bar */}
            <div className="rd-card p-4">
              <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-2">
                <span>Bonding curve progress</span>
                <span className={isGraduating ? 'text-yellow-400 font-bold' : ''}>{token.progress.toFixed(2)}%</span>
              </div>
              <div className="h-3 bg-red-950/10 rounded-full border border-red-900/10 overflow-hidden">
                <motion.div
                  animate={{ width: `${Math.min(token.progress, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full ${isGraduating ? 'bg-gradient-to-r from-yellow-700 to-yellow-400' : 'bg-gradient-to-r from-red-700 via-red-500 to-red-400'}`}
                />
              </div>
              <div className="flex justify-between text-[8px] font-mono text-gray-700 mt-1.5">
                <span>{token.tokensSold.toLocaleString()} sold</span>
                <span>{token.tokensRemaining.toLocaleString()} remaining</span>
              </div>
            </div>

            {/* Tabs: Trades / Info / Holders */}
            <div className="rd-card overflow-hidden">
              <div className="flex border-b border-red-900/10">
                {(['trades', 'info', 'holders'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all ${
                      activeTab === tab
                        ? 'text-white border-b-2 border-red-500 bg-red-500/5'
                        : 'text-gray-600 hover:text-white'
                    }`}>{tab}</button>
                ))}
              </div>

              {activeTab === 'trades' && (
                <div className="divide-y divide-red-900/10 max-h-80 overflow-y-auto">
                  {token.trades.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-gray-700 font-mono">No trades yet</div>
                  ) : token.trades.map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 text-[10px] font-mono hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.side === 'buy' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-gray-500">{t.wallet}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={t.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                          {t.side === 'buy' ? '+' : '-'}{t.tokensOut?.toLocaleString() ?? '?'} ${token.symbol}
                        </span>
                        <span className="text-gray-600">{t.solAmount?.toFixed(4) ?? '?'} SOL</span>
                        <span className="text-gray-700">{new Date(t.ts * 1000).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'info' && (
                <div className="p-5 space-y-3">
                  <p className="text-xs text-gray-500 font-mono leading-relaxed">{token.description || 'No description.'}</p>
                  {[
                    { label: 'Mint Address', value: token.mint, mono: true, copy: true },
                    { label: 'Creator',      value: `${token.creator.slice(0,8)}...${token.creator.slice(-6)}`, mono: true },
                    { label: 'Created',      value: new Date(token.createdAt).toLocaleString(), mono: false },
                    { label: 'Total Supply', value: '1,000,000,000', mono: true },
                    { label: 'On Curve',     value: '800,000,000 (80%)', mono: true },
                    { label: 'Fee — Treasury', value: '1% per trade', mono: true },
                    { label: 'Fee — Creator',  value: '0.5% per trade', mono: true },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between items-center py-2 border-b border-red-900/10">
                      <span className="text-[9px] text-gray-600 uppercase tracking-widest">{f.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] text-gray-300 ${f.mono ? 'font-mono' : ''}`}>{f.value}</span>
                        {f.copy && (
                          <button onClick={() => navigator.clipboard.writeText(token.mint)}
                            className="text-[8px] text-gray-700 hover:text-white transition-colors">⎘</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    {token.twitterUrl && (
                      <a href={token.twitterUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[9px] font-bold px-3 py-2 border border-white/10 text-gray-400 hover:text-white transition-all">
                        𝕏 Twitter
                      </a>
                    )}
                    {token.websiteUrl && (
                      <a href={token.websiteUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[9px] font-bold px-3 py-2 border border-white/10 text-gray-400 hover:text-white transition-all">
                        🌐 Website
                      </a>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'holders' && (
                <div className="py-8 text-center text-[10px] text-gray-700 font-mono">
                  Holder data available after token deployment
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Buy panel ────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Buy card */}
            <div className="rd-card p-5 sticky top-28">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ff1a1a]" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500/70">Buy ${token.symbol}</span>
              </div>

              {/* Amount input */}
              <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">SOL Amount</label>
              <div className="relative mb-3">
                <input
                  type="number" step="0.05" min="0.01" value={buyAmount}
                  onChange={e => setBuyAmount(e.target.value)}
                  className="w-full bg-black/60 border border-red-900/20 focus:border-red-500/40 outline-none px-4 py-3 text-white font-mono text-lg rounded-sm transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600">SOL</span>
              </div>

              {/* Quick amounts */}
              <div className="flex gap-1.5 mb-4">
                {['0.05','0.1','0.5','1','2'].map(v => (
                  <button key={v} onClick={() => setBuyAmount(v)}
                    className={`flex-1 py-1.5 text-[8px] font-bold border rounded-sm transition-all ${
                      buyAmount === v ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-red-900/20 text-gray-600 hover:text-white'
                    }`}>{v}</button>
                ))}
              </div>

              {/* You receive */}
              <div className="bg-black/40 border border-red-900/10 rounded-sm p-3 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] text-gray-600 font-mono">You receive</span>
                  <span className="text-sm font-black text-white font-mono">
                    {token.quote.tokensOut > 0 ? `~${token.quote.tokensOut.toLocaleString()}` : '—'} <span className="text-red-500 text-[10px]">${token.symbol}</span>
                  </span>
                </div>
                <div className="flex justify-between text-[8px] font-mono text-gray-700">
                  <span>Price impact</span>
                  <span>~{((parseFloat(buyAmount) / Math.max(token.solRaised + parseFloat(buyAmount), 0.001)) * 100).toFixed(2)}%</span>
                </div>
              </div>

              {/* Conspiracy Points + curve impact */}
              <div className="bg-black/20 border border-red-900/10 rounded-sm p-3 mb-4 space-y-1.5">
                <div className="text-[8px] text-gray-700 uppercase tracking-widest mb-1.5">You'll earn</div>
                {[
                  { label: 'Conspiracy Pts', pct: '+',  sol: `${Math.floor(parseFloat(buyAmount || '0') * 100)} pts` },
                  { label: 'Curve fills',     pct: '+',  sol: `${((parseFloat(buyAmount || '0') / 30) * 100).toFixed(2)}%` },
                  { label: 'To treasury',     pct: '100%', sol: `${(parseFloat(buyAmount || '0')).toFixed(4)} SOL` },
                ].map(f => (
                  <div key={f.label} className="flex justify-between text-[8px] font-mono">
                    <span className="text-gray-700">{f.label} <span className="text-gray-800">({f.pct})</span></span>
                    <span className="text-gray-600">{f.sol}</span>
                  </div>
                ))}
              </div>

              {/* Buy + Sell buttons */}
              {publicKey ? (
                <div className="space-y-2">
                  <button onClick={handleBuy} disabled={buying || token.tokensRemaining <= 0}
                    className="w-full py-4 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-[0.3em] rounded-sm transition-all shadow-[0_0_20px_rgba(255,26,26,0.15)] hover:shadow-[0_0_30px_rgba(255,26,26,0.3)]">
                    {buying ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : token.tokensRemaining <= 0 ? 'Curve Full' : `Buy $${token.symbol}`}
                  </button>
                  {token.userTokens > 0 && (
                    <button onClick={handleSell} disabled={buying}
                      className="w-full py-3 bg-transparent border border-red-900/30 hover:border-red-500/60 text-red-400 hover:text-red-200 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-[10px] uppercase tracking-[0.3em] rounded-sm transition-all">
                      Sell {Math.floor(token.userTokens).toLocaleString()} ${token.symbol}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex justify-center">
                  <WalletMultiButton style={{
                    width: '100%', justifyContent: 'center',
                    background: 'rgba(255,26,26,0.1)',
                    border: '1px solid rgba(255,26,26,0.3)',
                    color: '#ff1a1a',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem', letterSpacing: '0.1em',
                    height: '52px', borderRadius: '2px',
                    textTransform: 'uppercase',
                  }} />
                </div>
              )}

              {/* Status */}
              <AnimatePresence mode="wait">
                {status.type !== 'idle' && (
                  <motion.div key={status.msg} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`mt-3 p-3 rounded-sm text-[10px] font-mono border ${
                      status.type === 'success' ? 'border-green-900/30 bg-green-950/20 text-green-400' :
                      status.type === 'error'   ? 'border-red-900/30 bg-red-950/20 text-red-400' :
                      'border-yellow-900/30 bg-yellow-950/10 text-yellow-500'
                    }`}>
                    {status.msg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User holdings */}
              {publicKey && token.userTokens > 0 && (
                <div className="mt-4 pt-4 border-t border-red-900/10">
                  <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">Your Holdings</div>
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-500">${token.symbol}</span>
                    <span className="text-white font-bold">{Math.floor(token.userTokens).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Creator earnings info */}
            <div className="rd-card p-4 text-[9px] font-mono space-y-2">
              <div className="text-gray-500 font-bold uppercase tracking-widest mb-2">Creator Earnings</div>
              <div className="text-gray-700">0.5% of every trade goes to the token creator automatically on-chain.</div>
              <div className="text-gray-700">Creator: <span className="text-gray-400">{token.creator.slice(0,6)}...{token.creator.slice(-4)}</span></div>
              <div className="text-gray-700">Earned so far: <span className="text-green-400">{(token.solRaised * CREATOR_FEE_PCT).toFixed(4)} SOL</span></div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
