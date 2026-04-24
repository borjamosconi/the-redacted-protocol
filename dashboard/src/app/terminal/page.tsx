'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Header } from '@/components/Header'

interface TokenCard {
  mint:         string
  name:         string
  symbol:       string
  description:  string
  logo:         string
  creator:      string
  createdAt:    number
  tokensSold:   number
  solRaised:    number
  buyerCount:   number
  currentPrice: number
  rdxPerSol:    number
  progress:     number
  tokensRemaining: number
}

type SortMode = 'new' | 'hot' | 'marketcap'

export default function TerminalPage() {
  const [tokens,   setTokens]   = useState<TokenCard[]>([])
  const [loading,  setLoading]  = useState(true)
  const [sort,     setSort]     = useState<SortMode>('new')
  const [search,   setSearch]   = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchTokens = async () => {
    try {
      const qs  = new URLSearchParams({ sort, q: debouncedSearch, limit: '100' })
      const res = await fetch(`/api/tokens?${qs}`)
      const data = await res.json()
      if (data.tokens) setTokens(data.tokens)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    setLoading(true)
    fetchTokens()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(fetchTokens, 8_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [sort, debouncedSearch])

  const fmtSol   = (n: number) => n < 0.01 ? n.toFixed(4) : n.toFixed(2)
  const fmtAge   = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60)   return `${s}s ago`
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    if (s < 86400)return `${Math.floor(s/3600)}h ago`
    return `${Math.floor(s/86400)}d ago`
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-24 sm:pt-28 pb-20">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ff1a1a]" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-red-500/70">RDX Launchpad</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">Token Terminal</h1>
          <p className="text-[11px] text-gray-600 font-mono">
            All tokens launched on the RDX Bonding Curve — 1% treasury fee · 0.5% creator rewards
          </p>
        </div>

        {/* ── Controls ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search tokens..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-black/60 border border-red-900/20 focus:border-red-500/40 outline-none px-4 py-3 pl-10 text-white font-mono text-sm rounded-sm transition-colors"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">⌕</span>
          </div>

          {/* Sort */}
          <div className="flex gap-1.5">
            {([
              { v: 'new',       l: '🆕 New'     },
              { v: 'hot',       l: '🔥 Hot'      },
              { v: 'marketcap', l: '◈ Market Cap' },
            ] as { v: SortMode; l: string }[]).map(s => (
              <button
                key={s.v}
                onClick={() => setSort(s.v)}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border rounded-sm transition-all whitespace-nowrap ${
                  sort === s.v
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : 'border-red-900/20 text-gray-600 hover:text-white hover:border-red-900/30'
                }`}
              >
                {s.l}
              </button>
            ))}
          </div>

          {/* Launch button */}
          <Link
            href="/dashboard?tab=launchpad"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-[0_0_20px_rgba(255,26,26,0.2)] rounded-sm whitespace-nowrap"
          >
            ⊕ Launch Token
          </Link>
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Tokens',   value: tokens.length.toString() },
            { label: 'Total SOL Raised', value: `${fmtSol(tokens.reduce((s, t) => s + t.solRaised, 0))} SOL` },
            { label: 'Total Buyers',   value: tokens.reduce((s, t) => s + t.buyerCount, 0).toLocaleString() },
          ].map(stat => (
            <div key={stat.label} className="rd-card text-center py-3">
              <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-sm font-black text-white font-mono">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ── Token grid ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rd-card animate-pulse h-52" />
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-red-500/10 text-6xl mb-4 font-black">◈</div>
            <p className="text-gray-600 font-mono text-sm mb-2">No tokens launched yet</p>
            <p className="text-gray-700 font-mono text-xs">Be the first to launch a token on the RDX Launchpad</p>
            <Link href="/dashboard?tab=launchpad" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-sm hover:bg-red-500 transition-all">
              ⊕ Launch Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {tokens.map((token, i) => (
                <TokenCard key={token.mint} token={token} index={i} fmtSol={fmtSol} fmtAge={fmtAge} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </>
  )
}

function TokenCard({ token, index, fmtSol, fmtAge }: {
  token: TokenCard
  index: number
  fmtSol: (n: number) => string
  fmtAge: (ts: number) => string
}) {
  const isGraduating = token.progress >= 80
  const isHot        = token.buyerCount > 10

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index < 12 ? index * 0.03 : 0 }}
    >
      <Link href={`/terminal/${token.mint}`} className="block group">
        <div className={`rd-card relative overflow-hidden h-full transition-all duration-300 hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(255,26,26,0.08)] ${
          isGraduating ? 'border-yellow-500/20' : ''
        }`}>
          {/* Graduation glow */}
          {isGraduating && (
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
          )}

          {/* Top row: logo + meta */}
          <div className="flex items-start gap-3 mb-3">
            {/* Logo */}
            <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-red-950/20 border border-red-900/20">
              {token.logo ? (
                <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-red-500/30 font-black text-lg">
                  {token.symbol.charAt(0)}
                </div>
              )}
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-white truncate">{token.name}</span>
                {isHot && <span className="text-[7px] bg-orange-500/20 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">🔥</span>}
                {isGraduating && <span className="text-[7px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">✨</span>}
              </div>
              <div className="text-[10px] text-red-400 font-mono font-bold">${token.symbol}</div>
            </div>

            {/* Age */}
            <span className="text-[8px] text-gray-700 font-mono flex-shrink-0">{fmtAge(token.createdAt)}</span>
          </div>

          {/* Description */}
          <p className="text-[9px] text-gray-600 font-mono leading-relaxed mb-3 line-clamp-2">
            {token.description || 'No description provided.'}
          </p>

          {/* Bonding curve progress */}
          <div className="mb-3">
            <div className="flex justify-between text-[8px] font-mono text-gray-700 mb-1">
              <span>Bonding curve</span>
              <span>{token.progress.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-red-950/10 rounded-full overflow-hidden border border-red-900/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(token.progress, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  isGraduating
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                    : 'bg-gradient-to-r from-red-700 to-red-400'
                }`}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-1 text-center border-t border-red-900/10 pt-3">
            <div>
              <div className="text-[8px] text-gray-700 uppercase tracking-widest mb-0.5">SOL</div>
              <div className="text-[10px] font-bold text-white font-mono">{fmtSol(token.solRaised)}</div>
            </div>
            <div>
              <div className="text-[8px] text-gray-700 uppercase tracking-widest mb-0.5">Buyers</div>
              <div className="text-[10px] font-bold text-white font-mono">{token.buyerCount}</div>
            </div>
            <div>
              <div className="text-[8px] text-gray-700 uppercase tracking-widest mb-0.5">Price</div>
              <div className="text-[10px] font-bold text-red-400 font-mono">
                {(token.currentPrice * 1e9).toFixed(1)}μ
              </div>
            </div>
          </div>

          {/* Creator */}
          <div className="mt-2 pt-2 border-t border-red-900/10">
            <span className="text-[8px] text-gray-700 font-mono">
              by {token.creator.slice(0, 6)}...{token.creator.slice(-4)}
            </span>
          </div>

          {/* Hover arrow */}
          <div className="absolute top-3 right-3 text-gray-700 text-xs opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</div>
        </div>
      </Link>
    </motion.div>
  )
}
