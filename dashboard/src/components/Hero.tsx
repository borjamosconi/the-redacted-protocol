'use client'

import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import { useScroll, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { LaunchCountdown } from './LaunchCountdown'
import { DocLiveFeed } from './DocLiveFeed'

function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text)
  useEffect(() => {
    const chars = '█▓▒░'
    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) { setDisplay(text); clearInterval(interval); return }
      setDisplay(text.split('').map((c, idx) => idx < i ? c : chars[Math.floor(Math.random() * chars.length)]).join(''))
      i += Math.floor(Math.random() * 3) + 1
    }, 45)
    return () => clearInterval(interval)
  }, [text])
  return <span className={className}>{display}</span>
}

function GridBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,26,26,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,26,26,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,26,26,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,26,26,0.05)_1px,transparent_1px)] bg-[size:10px_10px]" />
    </div>
  )
}

function TechnicalGlyphs() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  const rows = isMobile ? 20 : 50
  const cols = isMobile ? 40 : 100

  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-[8px] font-mono leading-none overflow-hidden select-none">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="whitespace-nowrap">
          {Array.from({ length: cols }).map((_, j) => (
            <span key={j} className="mr-4">
              {Math.random() > 0.5 ? '0x' + Math.floor(Math.random()*100).toString(16) : 'REDACTED'}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

const FEATURED = [
  { label: 'MARS BLUEPRINTS', ticker: '$MARS', price: '+1242%', color: '#ff1a1a' },
  { label: 'EPSTEIN LOGS',   ticker: '$EPST', price: '+584%', color: '#ff1a1a' },
  { label: 'ANTARCTICA ICE', ticker: '$ICE',  price: '+2132%', color: '#f97316' },
  { label: 'UFO BRIEFINGS',  ticker: '$UAP',  price: '+841%', color: '#a855f7' },
  { label: 'QUANTUM DATA',   ticker: '$QTUM', price: '+493%', color: '#22d3ee' },
]

function WhaleAlert() {
  const [alert, setAlert] = useState<{ msg: string, type: 'BUY' | 'SYSTEM' } | null>(null)
  
  useEffect(() => {
    const alerts = [
      { msg: 'WHALE BOUGHT 50 SOL OF $MARS', type: 'BUY' as const },
      { msg: 'SYSTEM: NEW LEAK DETECTED - SECTOR 9', type: 'SYSTEM' as const },
      { msg: 'WHALE BOUGHT 22 SOL OF $EPST', type: 'BUY' as const },
      { msg: 'AGENT-OMEGA: DECRYPTING $ICE DATA', type: 'SYSTEM' as const },
      { msg: 'TRENDING: $QTUM VOLUME UP 300%', type: 'BUY' as const },
    ]
    
    const trigger = () => {
      setAlert(alerts[Math.floor(Math.random() * alerts.length)])
      setTimeout(() => setAlert(null), 4000)
    }
    
    const timer = setInterval(() => {
      if (Math.random() > 0.6) trigger()
    }, 8000)
    
    return () => clearInterval(timer)
  }, [])

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`fixed bottom-10 right-10 z-[100] px-6 py-4 border font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-4 ${
            alert.type === 'BUY' ? 'bg-green-600/10 border-green-500 text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'bg-red-600/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
          }`}
        >
          <div className={`w-2 h-2 rotate-45 ${alert.type === 'BUY' ? 'bg-green-500 animate-ping' : 'bg-red-500 animate-pulse'}`} />
          {alert.msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const opOut = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const [featured, setFeatured] = useState(0)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const t = setInterval(() => setFeatured(f => (f + 1) % FEATURED.length), 3000)
    const clock = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => { clearInterval(t); clearInterval(clock) }
  }, [])

  return (
    <section ref={ref} className="relative w-full overflow-hidden bg-black flex flex-col min-h-screen">
      {/* DEVNET BANNER */}
      <div className="sticky top-0 z-[200] w-full bg-yellow-500 text-black text-center py-2 px-4 flex items-center justify-center gap-4 font-black text-[11px] uppercase tracking-[0.4em]">
        <span className="w-2 h-2 bg-black rounded-full animate-pulse inline-block" />
        RUNNING ON SOLANA DEVNET — ALL INTERACTIONS QUALIFY FOR GENESIS AIRDROP
        <span className="w-2 h-2 bg-black rounded-full animate-pulse inline-block" />
      </div>
      <WhaleAlert />
      {/* Background Video for Premium Feel */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          src="/videos/videoweb.mp4"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <GridBackground />
      <TechnicalGlyphs />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_2px,1px_100%] opacity-40" />

      {/* CORE INTERFACE */}
      <motion.div
        className="relative z-20 w-full max-w-[1700px] mx-auto px-6 flex flex-col justify-center py-20 sm:py-32 min-h-[80vh] sm:min-h-screen"
        style={{ opacity: typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : opOut }}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-10 sm:space-y-16">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 sm:gap-6 mb-4">
               <div className="w-8 sm:w-12 h-[1px] bg-red-600/50" />
               <span className="text-[10px] sm:text-xs font-mono text-red-600 font-black tracking-[0.8em] uppercase">
                 CLASSIFIED_ACCESS_V2
               </span>
               <div className="w-8 sm:w-12 h-[1px] bg-red-600/50" />
            </div>
            <h1 className="text-5xl sm:text-8xl lg:text-[11rem] font-black text-white tracking-[-0.08em] leading-[0.85] uppercase italic">
              TRUTH_<span className="text-red-600 animate-rgb">DECRYPTED</span>
            </h1>
          </div>

          <p className="text-[10px] sm:text-sm lg:text-base text-white/50 font-mono max-w-3xl mx-auto leading-relaxed uppercase tracking-[0.2em] px-4">
            A high-fidelity document declassification engine utilizing neural-triangulation and consensus-based verification protocols. 
            <span className="text-red-500"> RDX neutralizes data suppression</span> through multi-vector analysis to recover factual integrity.
            <span className="text-white/20"> Secure your node to engage in global declassification operations.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 pt-10">
             <Link href="/dashboard" className="w-full sm:w-auto px-16 py-6 bg-red-600 hover:bg-white text-white hover:text-black font-black uppercase text-xs tracking-[0.5em] transition-all relative overflow-hidden group shadow-[15px_15px_0px_rgba(255,0,0,0.1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
               <span className="relative z-10">LAUNCH_OPERATION</span>
               <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
             </Link>
             <a href="/demo.mp4" target="_blank" rel="noopener" className="w-full sm:w-auto px-16 py-6 bg-yellow-500 hover:bg-white text-black font-black uppercase text-xs tracking-[0.5em] transition-all relative overflow-hidden group shadow-[15px_15px_0px_rgba(255,215,0,0.15)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 inline-flex items-center justify-center gap-3">
               <span className="relative z-10">▶ WATCH_60S_DEMO</span>
             </a>
             <Link href={`/terminal/${process.env.NEXT_PUBLIC_RDX_TOKEN_MINT || 'HZmo7pqLsZ6Z5EeoaRKvTpPdGrpk3mMV9cdALFcFCjjU'}`} className="w-full sm:w-auto px-16 py-6 border border-white/10 hover:border-red-600 text-white/60 hover:text-white font-black uppercase text-xs tracking-[0.5em] transition-all bg-white/[0.02] hover:bg-red-600/10">
               ACCESS_TERMINAL
             </Link>
          </div>

          {/* Quick links row for judges — GitHub repo, X, Telegram */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-6 text-[10px] font-mono uppercase tracking-[0.4em] text-white/40">
            <a href="https://github.com/whalesconspiracy-33/the-redacted-protocol" target="_blank" rel="noopener" className="hover:text-white transition-colors flex items-center gap-2 group">
              <svg className="w-4 h-4 fill-current opacity-60 group-hover:opacity-100" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              <span>GITHUB / SOURCE</span>
            </a>
            <a href="https://x.com/moskonibeats" target="_blank" rel="noopener" className="hover:text-white transition-colors flex items-center gap-2 group">
              <svg className="w-3.5 h-3.5 fill-current opacity-60 group-hover:opacity-100" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span>@moskonibeats</span>
            </a>
            <a href="https://t.me/TheRedacted_sol" target="_blank" rel="noopener" className="hover:text-white transition-colors flex items-center gap-2 group">
              <svg className="w-4 h-4 fill-current opacity-60 group-hover:opacity-100" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              <span>JOIN SYNDICATE</span>
            </a>
          </div>

          {/* Inline demo videos — two videos side-by-side for judges */}
          <div className="w-full max-w-6xl mx-auto mt-12 sm:mt-16 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            {/* Demo video (landscape 16:9) */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 via-red-600 to-yellow-500 opacity-40 group-hover:opacity-70 blur transition-opacity" />
              <div className="relative bg-black border-2 border-yellow-500/40 group-hover:border-yellow-500 transition-colors">
                <div className="bg-yellow-500 text-black text-center py-1 px-4 font-black text-[10px] uppercase tracking-[0.4em]">
                  ▶ 60-SECOND PRODUCT DEMO · 1920×1080
                </div>
                <video
                  controls
                  preload="metadata"
                  poster="/logo.png"
                  className="w-full block"
                  src="/demo.mp4"
                />
              </div>
            </div>
            {/* Live walkthrough (portrait 9:16) */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 opacity-40 group-hover:opacity-70 blur transition-opacity" />
              <div className="relative bg-black border-2 border-red-600/40 group-hover:border-red-600 transition-colors">
                <div className="bg-red-600 text-white text-center py-1 px-4 font-black text-[10px] uppercase tracking-[0.4em]">
                  ▶ LIVE WALKTHROUGH · UNCUT
                </div>
                <video
                  controls
                  preload="metadata"
                  poster="/logo.png"
                  playsInline
                  className="w-full block"
                  src="/walkthrough.mp4"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FEATURED TIKER BAR */}
        <div className="mt-20 sm:mt-32 h-14 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm flex items-center px-6 overflow-hidden">
           <div className="flex items-center gap-10 animate-ticker whitespace-nowrap">
              {[...FEATURED, ...FEATURED].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                   <span className="text-[10px] font-black text-white/40">{item.label}</span>
                   <span className="text-[10px] font-black text-white">{item.ticker}</span>
                   <span className="text-[10px] font-black text-green-500">{item.price}</span>
                   <div className="w-1.5 h-1.5 bg-red-600 rotate-45" />
                </div>
              ))}
           </div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        >
           <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.5em]">SCROLL_TO_DECRYPT</span>
           <div className="w-[1px] h-12 bg-gradient-to-b from-red-600 to-transparent animate-bounce" />
        </motion.div>
      </motion.div>

      {/* SYSTEM OPERATIONS REGISTRY */}
      <div className="bg-black border-t border-white/5 py-16 sm:py-32 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="flex flex-col mb-16 sm:mb-20 items-center lg:items-start text-center lg:text-left">
             <span className="text-red-600 font-black text-[10px] tracking-[0.6em] uppercase mb-4">ALLOCATION_RESERVE</span>
             <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-tight">AIRDROP_PROTOCOL</h2>
             <div className="w-24 h-1 bg-red-600 mt-8" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/10">
             {[
               { id: '01', title: 'AUTH_WALLET', desc: 'Connect your Solana wallet to the interceptor terminal.' },
               { id: '02', title: 'INIT_TOKEN', desc: 'Launch a classified document token via the dashboard.' },
               { id: '03', title: 'EXEC_TRADE', desc: 'Engage with bonding curves to generate volume.' },
               { id: '04', title: 'SYNC_REWARDS', desc: 'Complete missions to increase your decryption rank.' },
             ].map((step, i) => (
               <div key={i} className="p-8 sm:p-12 border-b md:border-b-0 md:border-r last:border-r-0 border-white/10 bg-white/[0.01] hover:bg-red-600 transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                     <span className="text-4xl font-black text-white/5 group-hover:text-white/20">0{i+1}</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-500 group-hover:text-white/60 block mb-8 font-black tracking-widest">STEP_{step.id}</span>
                  <h3 className="text-xl font-black text-white uppercase mb-4 tracking-widest transition-transform">{step.title}</h3>
                  <p className="text-[11px] text-white/30 group-hover:text-white/70 leading-relaxed uppercase tracking-widest">{step.desc}</p>
               </div>
             ))}
          </div>

          <div className="mt-16 p-8 sm:p-12 border border-red-500/20 bg-red-600/5 flex flex-col lg:flex-row items-center justify-between gap-10">
             <div className="flex flex-col gap-3 text-center lg:text-left">
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.4em]">⚡ DEVNET · AIRDROP QUALIFICATION: OPEN TO ALL</span>
                <p className="text-xs sm:text-sm text-white/60 font-mono uppercase tracking-widest leading-relaxed">Every wallet that interacts with the devnet dashboard is automatically recorded for the genesis RDX airdrop. No minimum required — just connect and participate.</p>
             </div>
             <Link href="/dashboard" className="w-full lg:w-auto px-16 py-5 bg-red-600 hover:bg-white text-white hover:text-black font-black uppercase text-xs tracking-[0.4em] transition-all shadow-[8px_8px_0px_rgba(255,0,0,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                START_DECRYPTION
             </Link>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
        .animate-rgb {
          animation: rgb-split 0.2s steps(2) infinite;
        }
        @keyframes rgb-split {
          0% { text-shadow: 2px 1px 0 rgba(255,0,0,0.5), -2px -1px 0 rgba(0,255,255,0.5); }
          100% { text-shadow: -2px -1px 0 rgba(255,0,0,0.5), 2px 1px 0 rgba(0,255,255,0.5); }
        }
      `}</style>
    </section>
  )
}
