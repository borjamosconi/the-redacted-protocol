'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
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
  { label: 'MADURO DOSSIER', ticker: '$MADURO', price: '+942%', color: '#ff1a1a' },
  { label: 'EPSTEIN DOCS', ticker: '$EPST', price: '+284%', color: '#ff1a1a' },
  { label: 'JFK FILES',    ticker: '$JFK63', price: '+132%', color: '#f97316' },
  { label: 'UFO BRIEFINGS',ticker: '$UAP51', price: '+441%', color: '#a855f7' },
  { label: 'NSA LEAKS',    ticker: '$NSA13', price: '+193%', color: '#22d3ee' },
]

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
             <Link href={`/terminal/${process.env.NEXT_PUBLIC_RDX_TOKEN_MINT || 'HZmo7pqLsZ6Z5EeoaRKvTpPdGrpk3mMV9cdALFcFCjjU'}`} className="w-full sm:w-auto px-16 py-6 border border-white/10 hover:border-red-600 text-white/60 hover:text-white font-black uppercase text-xs tracking-[0.5em] transition-all bg-white/[0.02] hover:bg-red-600/10">
               ACCESS_TERMINAL
             </Link>
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
                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">QUALIFICATION_STATUS: ACTIVE</span>
                <p className="text-xs sm:text-sm text-white/60 font-mono uppercase tracking-widest leading-relaxed">Only activity on the official testnet dashboard is recorded for the genesis airdrop.</p>
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
