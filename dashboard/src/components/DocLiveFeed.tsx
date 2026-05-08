'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const RDX_MINT = process.env.NEXT_PUBLIC_RDX_TOKEN_MINT || 'CoB4pQfZSihDH1BknouU4P35vdQPNEtSj8sGtANhquC7'
const MADURO_MINT = 'Fr1jaLiR24dHNncvQ19FSG6Xf4AyhS5LWdhc6fVstpd5'
const BUKELE_MINT = 'CysZdDee27jZUxgBim63mk5LhZcDgU7gqopaZ4F9cnmU'
const AREA51_MINT = '3ybspCwEWCBLVTpPHhgCRtPRfEJqB7fDcXnFL1H6qTUu'
const MONARCH_MINT = '2bewpbHvFCezvcsVKNvCMiaGGuDNn2wJHxP4cWo26xnt'
const TICK_MINT = 'H7qEFAh71USx9GXFwCG6XTcjuVRB6UWKqXBc9ViwizAo'
const LYME_MINT = 'HpaSNBZKBWxQo2stEt4gBeKCraPBCoszdRni2RCi4MVW'

const getLogo = (name: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(`${name} classified document token dark cyberpunk redacted 8k photorealistic ultra-detailed`)}`

const SEED_TOKENS = [
  { ticker: 'AREA51', name: 'Area 51: S-4 Sector Blueprints', category: 'CLASSIFIED', price: '0.00742', change: '+1240%', age: 'now', hot: true, mint: AREA51_MINT, logo: getLogo('Area 51 S-4 blueprints') },
  { ticker: 'MONARCH', name: 'Project Monarch: Mind Control', category: 'REDACTED', price: '0.00481', change: '+856%', age: 'now', hot: true, mint: MONARCH_MINT, logo: getLogo('Project Monarch brain control') },
  { ticker: 'TICK', name: 'Project Garrapata: Bio-Surveillance', category: 'SUPPRESSED', price: '0.00392', change: '+642%', age: 'now', hot: true, mint: TICK_MINT, logo: getLogo('Cybernetic tick bug') },
  { ticker: 'LYME', name: 'Project Lyme: Weaponized Strains', category: 'SUPPRESSED', price: '0.00315', change: '+412%', age: 'now', hot: true, mint: LYME_MINT, logo: getLogo('Weaponized bacteria strains') },
  { ticker: 'MADURO', name: 'Venezuela: The Maduro Cartel Dossier', category: 'SUPPRESSED', price: '0.00512', change: '+942%', age: 'now', hot: true, mint: MADURO_MINT, logo: getLogo('Maduro cartel documents') },
  { ticker: 'BUKELE', name: 'El Salvador: Project Bitcoin City', category: 'CLASSIFIED', price: '0.00318', change: '+215%', age: 'now', hot: true, mint: BUKELE_MINT, logo: getLogo('Bitcoin City blueprints') },
  { ticker: 'RDX', name: 'The Agent — Autonomous News Scanner', category: 'THE AGENT', price: '0.00420', change: '+∞%', age: 'genesis', hot: true, mint: RDX_MINT, logo: getLogo('Autonomous intelligence scanner engine') },
  { ticker: 'EPST', name: 'Epstein Flight Logs Vol.I', category: 'CLASSIFIED', price: '0.00042', change: '+284%', age: '2m ago', hot: true, mint: RDX_MINT, logo: getLogo('Epstein flight logs document') },
  { ticker: 'JFK63', name: 'Warren Commission Files', category: 'REDACTED', price: '0.00018', change: '+132%', age: '5m ago', hot: true, mint: RDX_MINT, logo: getLogo('JFK assassination files') },
]

const NEW_LAUNCHES = [
  'AREA51_S4_BLUEPRINTS -> $AREA51 LIVE',
  'PROJECT_MONARCH -> $MONARCH SYNCED',
  'GARRAPATA_BIO_INSECTS -> $TICK RECOVERED',
  'PROJECT_LYME -> $LYME ACTIVE',
  'MADURO_CARTEL_DOSSIER -> $MADURO LIVE',
]

export function DocLiveFeed() {
  const [tokens, setTokens] = useState<any[]>(SEED_TOKENS)
  const [ticker, setTicker] = useState(0)
  const [newLaunch, setNewLaunch] = useState('')
  const tickerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch real tokens from API
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const res = await fetch('/api/tokens?limit=20&sort=new')
        if (!res.ok) return
        const data = await res.json()
        if (data.tokens && data.tokens.length > 0) {
          // Map API tokens to Feed format
          const mapped = data.tokens.map((t: any) => ({
            ticker: t.symbol,
            name: t.name,
            category: t.progress >= 100 ? 'GRADUATED' : t.progress > 50 ? 'HOT' : 'CLASSIFIED',
            price: t.currentPrice.toFixed(6),
            change: `+${(Math.random() * 20).toFixed(1)}%`, // Mock change since we don't store historical in simple API
            age: 'LIVE',
            hot: t.progress > 50,
            mint: t.mint,
            logo: t.logo || getLogo(t.name)
          }))
          
          // Merge with SEED_TOKENS to ensure a full list during early launch
          const merged = [...mapped, ...SEED_TOKENS.filter(s => !mapped.find((m: any) => m.mint === s.mint))]
          setTokens(merged.slice(0, 15))
        }
      } catch (err) {
        console.error('Failed to fetch live tokens:', err)
      }
    }

    fetchTokens()
    const interval = setInterval(fetchTokens, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

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
        price: (parseFloat(t.price) * (0.999 + Math.random() * 0.002)).toFixed(6),
      })))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full font-mono bg-black">
      {/* Live status bar - ULTRA SQUARED */}
      <div className="flex flex-col mb-8 gap-0 border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-0 h-10 border-b border-white/10">
          <div className="flex-shrink-0 flex items-center gap-3 px-6 h-full bg-red-600 border-r border-white/10 text-white">
            <span className="w-2 h-2 bg-white animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.5em] uppercase whitespace-nowrap">LIVE_INTEL</span>
          </div>
          <div className="flex-1 overflow-hidden px-6 flex items-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={ticker}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-[11px] text-white/60 truncate uppercase tracking-[0.2em] font-black"
              >
                {newLaunch || NEW_LAUNCHES[0]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 h-6 text-[8px] font-mono text-white/20 uppercase tracking-[0.3em]">
           <span>RELAY: B42-X0_SOL_DEVNET</span>
           <span>DECRYPTION_LOAD: 91% [|||||||||-]</span>
        </div>
      </div>

      {/* Action Header - GAMIFIED */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
         <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <span className="text-red-600 font-black text-[10px] tracking-[0.6em] uppercase mb-1">INTEL_TERMINAL</span>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">DECRYPTING_LIVE_NODES</h3>
         </div>
         <Link href="/dashboard" className="w-full sm:w-auto px-10 py-4 bg-white text-black font-black text-xs uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all shadow-[8px_8px_0px_rgba(255,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
            LAUNCH_NEW_DOCUMENT
         </Link>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.03] border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">
         <div className="hidden sm:block col-span-1">IMG</div>
         <div className="col-span-2 sm:col-span-1">TKR</div>
         <div className="col-span-6 sm:col-span-6">INTEL_IDENTITY</div>
         <div className="col-span-4 sm:col-span-4 text-right">VALUATION</div>
      </div>

      {/* Token rows - Structured Grid */}
      <div className="space-y-1 max-h-[520px] overflow-y-auto no-scrollbar">
        {tokens.map((token, i) => (
          <motion.div
            key={token.ticker}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Link
              href={`/terminal/${token.mint}`}
              className="grid grid-cols-12 items-center gap-4 px-4 sm:px-6 py-4 border border-white/5 bg-white/[0.01] hover:bg-white hover:border-white transition-all group relative"
            >
              {/* Photo column - Hidden on very small screens */}
              <div className="hidden sm:block col-span-1">
                <div className="w-8 h-8 bg-red-950/20 border border-white/10 group-hover:border-black/20 overflow-hidden">
                  <img src={token.logo} alt={token.ticker} className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-black text-white group-hover:text-black transition-colors">[{token.ticker}]</span>
              </div>

              <div className="col-span-6 sm:col-span-6">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5">
                     <p className="text-[10px] text-white/70 group-hover:text-black transition-colors uppercase font-black tracking-tight leading-none truncate max-w-[120px] sm:max-w-none">{token.name}</p>
                     <div className="px-1.5 py-0.5 bg-red-600/10 border border-red-600/30 text-red-500 text-[6px] font-black tracking-widest group-hover:bg-red-600 group-hover:text-white transition-all">REWARD_SYNC</div>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 ${token.category === 'THE AGENT' ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/40 group-hover:bg-black/10 group-hover:text-black'}`}>
                       {token.category}
                     </span>
                     {token.hot && <span className="text-[7px] text-red-600 font-black animate-pulse group-hover:text-red-800 hidden sm:inline">[DECRYPTING...]</span>}
                  </div>
                </div>
              </div>

              <div className="col-span-4 sm:col-span-4 text-right flex flex-col items-end">
                 <span className="text-xs font-black text-white group-hover:text-black transition-colors">{token.price} <span className="text-[9px] text-white/30 group-hover:text-black/30 ml-1">SOL</span></span>
                 <span className="text-[9px] font-black text-green-500 leading-none mt-1.5 tracking-tighter">DECRYPT_FOR_XP</span>
              </div>
              
              {/* Corner Accents */}
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-500/0 group-hover:border-red-500 transition-all" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-500/0 group-hover:border-red-500 transition-all" />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Footer System Status - ULTRA SQUARED */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-0 border border-white/10">
         <div className="p-6 bg-white/[0.02] border-b sm:border-b-0 sm:border-r border-white/10">
            <span className="text-[8px] text-white/20 uppercase tracking-[0.4em] block mb-2">NETWORK_DECRYPTION_PROGRESS</span>
            <div className="flex items-center gap-3">
               <div className="flex-1 h-1 bg-white/5 relative">
                  <div className="absolute inset-0 bg-red-600/40 w-[91%]" />
               </div>
               <span className="text-[10px] text-red-500 font-black font-mono">91%</span>
            </div>
         </div>
         <Link href="/dashboard" className="p-6 bg-red-600 hover:bg-white transition-all group flex items-center justify-between">
            <span className="text-xs font-black text-white group-hover:text-black uppercase tracking-[0.3em]">SECURE_TERMINAL_ACCESS</span>
            <span className="text-white group-hover:text-black text-xl">→</span>
         </Link>
      </div>
    </div>
  )
}
