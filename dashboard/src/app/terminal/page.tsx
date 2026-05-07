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

        {/* ── King of the Hill (Top Trending) ────────────────────────────────── */}
        {tokens.length > 0 && sort === 'new' && !search && (
          <div className="mb-8 group">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping" />
                King of the Hill
              </span>
            </div>
            <Link href={`/terminal/${tokens[0].mint}`} className="block">
              <div className="rd-card p-6 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent relative overflow-hidden group-hover:border-yellow-500/40 transition-all duration-500">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <div className="text-6xl font-black text-yellow-500">👑</div>
                </div>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)] flex-shrink-0">
                    <img src={tokens[0].logo} alt={tokens[0].name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1.5">
                      <h2 className="text-2xl font-black text-white">{tokens[0].name}</h2>
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-[10px] font-black rounded-sm border border-yellow-500/30 tracking-wider uppercase">Trending #1</span>
                    </div>
                    <div className="text-sm text-yellow-500/60 font-mono font-bold mb-3">${tokens[0].symbol}</div>
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Market Cap</div>
                        <div className="text-lg font-black text-white font-mono">{(tokens[0].currentPrice * 1e9).toFixed(2)} SOL</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Progress</div>
                        <div className="text-lg font-black text-yellow-500 font-mono">{tokens[0].progress.toFixed(2)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index < 12 ? index * 0.03 : 0 }}
    >
      <Link href={`/terminal/${token.mint}`} className="block group">
        <div className={`rd-card p-3 h-full transition-all duration-300 hover:bg-white/[0.02] border-red-900/10 hover:border-red-500/30 ${
          isGraduating ? 'bg-yellow-500/5 border-yellow-500/20' : ''
        }`}>
          <div className="flex gap-4">
            {/* Logo - Large left like pump */}
            <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-red-950/20 border border-red-900/10 group-hover:border-red-500/20 transition-colors shadow-lg">
              {token.logo ? (
                <img src={token.logo} alt={token.symbol} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-red-500/20 font-black text-2xl">
                  {token.symbol.charAt(0)}
                </div>
              )}
            </div>

            {/* Content right */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] text-gray-700 font-mono">created by {token.creator.slice(0,6)}</span>
                <span className="text-[10px] text-gray-700 font-mono">{fmtAge(token.createdAt)}</span>
              </div>
              
              <div className="mb-2">
                <div className="text-sm font-black text-white group-hover:text-red-400 transition-colors truncate">
                  {token.name}
                </div>
                <div className="text-xs text-red-500/80 font-mono font-bold tracking-tight">
                  ${token.symbol}
                </div>
              </div>

              <div className="mt-auto space-y-2">
                <div>
                  <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-1">
                    <span>Market Cap: <span className="text-green-500 font-bold">{(token.currentPrice * 1e9).toFixed(2)} SOL</span></span>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-1">
                    <span>Progress: {token.progress.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-red-900/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(token.progress, 100)}%` }}
                      className={`h-full ${isGraduating ? 'bg-yellow-500' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`}
                    />
                  </div>
                </div>
                
                <div className="text-[10px] text-gray-500 font-mono line-clamp-2 italic">
                  "{token.description || 'No description...'}"
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
