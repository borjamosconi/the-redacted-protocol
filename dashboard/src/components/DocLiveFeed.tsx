'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const RDX_MINT = 'Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj'

const SEED_TOKENS = [
  { ticker: 'RDX', name: 'The Agent — Autonomous News Scanner', category: 'THE AGENT', price: '0.00420', change: '+∞%', age: 'genesis', hot: true, mint: RDX_MINT },
  { ticker: 'EPST', name: 'Epstein Flight Logs Vol.I', category: 'CLASSIFIED', price: '0.00042', change: '+284%', age: '2m ago', hot: true, mint: RDX_MINT },
  { ticker: 'JFK63', name: 'Warren Commission Files', category: 'REDACTED', price: '0.00018', change: '+132%', age: '5m ago', hot: true, mint: RDX_MINT },
  { ticker: 'MKUL', name: 'MKUltra Program Docs', category: 'DECLASSIFIED', price: '0.00091', change: '+67%', age: '9m ago', hot: false, mint: RDX_MINT },
  { ticker: 'UAP51', name: 'Pentagon UFO Briefings', category: 'CLASSIFIED', price: '0.00034', change: '+441%', age: '12m ago', hot: true, mint: RDX_MINT },
  { ticker: 'PENT', name: 'Pentagon Papers Vol.1', category: 'DECLASSIFIED', price: '0.00007', change: '+29%', age: '18m ago', hot: false, mint: RDX_MINT },
  { ticker: 'NSA13', name: 'Snowden NSA Collection', category: 'LEAKED', price: '0.00055', change: '+193%', age: '23m ago', hot: true, mint: RDX_MINT },
  { ticker: 'CIA7', name: 'Vault 7 Hacking Tools', category: 'LEAKED', price: '0.00012', change: '+88%', age: '31m ago', hot: false, mint: RDX_MINT },
  { ticker: 'PANA', name: 'Panama Papers: OffshoreDB', category: 'LEAKED', price: '0.00028', change: '+156%', age: '44m ago', hot: false, mint: RDX_MINT },
  { ticker: 'MNRA', name: 'Pfizer mRNA Trial Data', category: 'SUPPRESSED', price: '0.00063', change: '+312%', age: '51m ago', hot: true, mint: RDX_MINT },
  { ticker: 'WIRE', name: 'Hunter Biden Laptop Dump', category: 'CENSORED', price: '0.00009', change: '+44%', age: '1h ago', hot: false, mint: RDX_MINT },
  { ticker: 'AREA', name: 'Roswell Incident Files', category: 'CLASSIFIED', price: '0.00081', change: '+521%', age: '1h ago', hot: true, mint: RDX_MINT },
  { ticker: 'FISA', name: 'FISA Court Orders 2016', category: 'CLASSIFIED', price: '0.00014', change: '+76%', age: '2h ago', hot: false, mint: RDX_MINT },
]

const NEW_LAUNCHES = [
  'Epstein Island Visitor List — $ISLE launching...',
  'Operation Northwoods — $NWDS launching...',
  'COINTELPRO Files Vol.3 — $COIN launching...',
  'MH370 ATC Transcripts — $MH37 launching...',
  'Bohemian Grove Footage — $GROVE launching...',
  'Iran-Contra Shredded Docs — $IRAN launching...',
]

const CATEGORY_COLORS: Record<string, string> = {
  'THE AGENT':  'text-yellow-300 border-yellow-500/40 bg-yellow-500/10',
  CLASSIFIED:   'text-red-400 border-red-900/40 bg-red-950/20',
  REDACTED:     'text-orange-400 border-orange-900/40 bg-orange-950/20',
  DECLASSIFIED: 'text-green-400 border-green-900/40 bg-green-950/20',
  LEAKED:       'text-yellow-400 border-yellow-900/40 bg-yellow-950/20',
  SUPPRESSED:   'text-purple-400 border-purple-900/40 bg-purple-950/20',
  CENSORED:     'text-pink-400 border-pink-900/40 bg-pink-950/20',
}

export function DocLiveFeed() {
  const [tokens, setTokens] = useState(SEED_TOKENS)
  const [ticker, setTicker] = useState(0)
  const [newLaunch, setNewLaunch] = useState('')
  const tickerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    tickerRef.current = setInterval(() => {
      setTicker(t => (t + 1) % NEW_LAUNCHES.length)
      setNewLaunch(NEW_LAUNCHES[Math.floor(Math.random() * NEW_LAUNCHES.length)])
    }, 3200)
    return () => { if (tickerRef.current) clearInterval(tickerRef.current) }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setTokens(prev => prev.map(t => ({
        ...t,
        price: (parseFloat(t.price) * (0.97 + Math.random() * 0.06)).toFixed(5),
        change: `+${(Math.random() * 400 + 20).toFixed(0)}%`,
      })))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full">
      {/* Live ticker bar */}
      <div className="flex items-center gap-0 mb-4 border border-red-900/20 bg-black/60 overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border-r border-red-900/30">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-mono text-red-400 tracking-[0.3em] uppercase whitespace-nowrap">LIVE</span>
        </div>
        <div className="flex-1 overflow-hidden px-3 py-1.5">
          <AnimatePresence mode="wait">
            <motion.p
              key={ticker}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-[10px] font-mono text-gray-400 truncate"
            >
              🤖 Agent detected: {newLaunch || NEW_LAUNCHES[0]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Token rows */}
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto scrollbar-none">
        {tokens.map((token, i) => (
          <motion.div
            key={token.ticker}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Link
              href={`/terminal/${token.mint}`}
              className="flex items-center gap-3 px-3 py-2.5 border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-red-900/30 transition-all duration-200 group"
            >
              {/* Ticker + hot badge */}
              <div className="flex items-center gap-1.5 w-16 flex-shrink-0">
                <span className="text-xs font-black text-white font-mono">${token.ticker}</span>
                {token.hot && (
                  <span className="text-[8px] text-orange-400">🔥</span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 truncate group-hover:text-gray-300 transition-colors">{token.name}</p>
              </div>

              {/* Category */}
              <span className={`hidden sm:inline-flex text-[8px] font-mono px-1.5 py-0.5 border rounded-sm flex-shrink-0 ${CATEGORY_COLORS[token.category] || 'text-gray-500 border-gray-800'}`}>
                {token.category}
              </span>

              {/* Price */}
              <span className="text-[10px] font-mono text-gray-500 w-16 text-right flex-shrink-0">{token.price}</span>

              {/* Change */}
              <span className="text-[10px] font-mono text-green-400 w-12 text-right flex-shrink-0 font-bold">
                {token.change}
              </span>

              {/* Age */}
              <span className="hidden md:block text-[9px] text-gray-700 w-12 text-right flex-shrink-0 font-mono">{token.age}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[9px] text-gray-700 font-mono">{tokens.length} documents tokenized</span>
        <Link href="/dashboard" className="text-[9px] text-red-500/70 hover:text-red-400 font-mono tracking-wider transition-colors">
          Launch yours →
        </Link>
      </div>
    </div>
  )
}
