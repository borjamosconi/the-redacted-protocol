'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
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
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-[8px] font-mono leading-none overflow-hidden select-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <div key={i} className="whitespace-nowrap">
          {Array.from({ length: 100 }).map((_, j) => (
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
    <section ref={ref} className="relative min-h-screen flex items-center justify-center pt-20 bg-black overflow-hidden font-mono">
      <GridBackground />
      <TechnicalGlyphs />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_2px,1px_100%] opacity-40" />

      <motion.div
        className="relative z-20 w-full max-w-[1700px] mx-auto px-6"
        style={{ opacity: opOut }}
      >
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0 items-stretch border border-white/10">
          
          {/* LEFT CONTENT BLOCK - SIMPLIFIED FOR MOBILE, BRUTALIST FOR DESKTOP */}
          <div className="relative p-6 sm:p-12 lg:p-20 border-r border-white/10 flex flex-col justify-center items-center lg:items-start text-center lg:text-left">
            {/* Top Status Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-8 lg:mb-12 border-b border-white/10 pb-6 w-full">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-600 animate-pulse border border-white/20" />
                <span className="text-[10px] font-black tracking-[0.5em] text-white uppercase">SYSTEM_LIVE</span>
              </div>
              <div className="hidden sm:block flex-1 h-[1px] bg-white/5" />
              <div className="flex items-center gap-4 text-[9px] text-white/30 tracking-[0.2em]">
                <span>RELAY: SOL_DEVNET</span>
                <span>{currentTime}</span>
              </div>
            </div>

            {/* MAIN HEADLINE */}
            <div className="mb-8 lg:mb-12 w-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-[clamp(2.5rem,12vw,6.5rem)] font-black leading-[0.85] text-white tracking-tighter uppercase mb-6 lg:mb-8">
                  <span className="text-red-600 block mb-2">TRUTH</span>
                  <span className="relative inline-block">
                    <GlitchText text="DECRYPTED" />
                  </span>
                </h1>
              </motion.div>
              
              <div className="flex flex-col gap-4 max-w-2xl mx-auto lg:mx-0">
                <p className="text-lg sm:text-xl text-white/90 font-black tracking-tight uppercase border-l-0 lg:border-l-4 border-red-600 lg:pl-6 py-2">
                  Participate to earn <span className="text-red-600">$RDX Airdrop.</span> <br />
                  Launch tokens & trade to qualify.
                </p>
                <p className="text-[10px] sm:text-[11px] text-white/40 leading-relaxed uppercase tracking-[0.15em] max-w-lg">
                  Join the mission on Solana Testnet. Every document you launch or trade 
                  increases your rank for the upcoming genesis airdrop.
                </p>
              </div>
            </div>

            {/* ACTION GRID - COMMAND BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-white/10 w-full max-w-xl mb-12">
              <a href="/dashboard" className="group relative bg-white p-6 sm:p-8 transition-all hover:bg-red-600 overflow-hidden flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="relative z-10 flex flex-col gap-1">
                  <span className="text-[7px] font-mono text-black/40 group-hover:text-white/40 uppercase tracking-widest">STEP_01</span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-black font-black text-sm tracking-[0.1em] group-hover:text-white transition-colors uppercase">LAUNCH_TOKEN</span>
                    <span className="text-black group-hover:text-white transition-colors text-xl font-black">→</span>
                  </div>
                </div>
              </a>
              <a href="/#gamification" className="group relative bg-black p-6 sm:p-8 transition-all hover:bg-white/[0.05] border-l-0 sm:border-l border-t sm:border-t-0 border-white/10 overflow-hidden flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="relative z-10 flex flex-col gap-1">
                  <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">STEP_02</span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-white/60 font-black text-sm tracking-[0.1em] group-hover:text-red-500 transition-colors uppercase">CHECK_REWARDS</span>
                    <span className="text-white/20 group-hover:text-red-500 transition-colors text-xl font-black">→</span>
                  </div>
                </div>
              </a>
            </div>

            {/* LIVE DATA GRID - SIMPLIFIED FOR MOBILE */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 border-t border-white/10 pt-8 w-full max-w-xl">
               <div className="flex flex-col gap-1">
                  <span className="text-[8px] text-white/30 uppercase tracking-widest">DECRYPTED</span>
                  <span className="text-lg sm:text-2xl font-black text-white">1.2k</span>
               </div>
               <div className="flex flex-col gap-1 border-l border-white/5 pl-4 sm:pl-6">
                  <span className="text-[8px] text-white/30 uppercase tracking-widest">VOLUME</span>
                  <span className="text-lg sm:text-2xl font-black text-red-600">42k</span>
               </div>
               <div className="flex flex-col gap-1 border-l border-white/5 pl-4 sm:pl-6">
                  <span className="text-[8px] text-white/30 uppercase tracking-widest">AGENTS</span>
                  <span className="text-lg sm:text-2xl font-black text-white">409</span>
               </div>
            </div>
          </div>

          {/* RIGHT SIDE - REMOVED ON MOBILE */}
          <div className="relative hidden lg:flex flex-col bg-black overflow-hidden">
             <div className="flex-1 p-12 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 border border-white/10 flex items-center justify-center bg-white/[0.03]">
                         <span className="text-red-500 text-xs font-black">01</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE_INTEL_STREAM</span>
                         <span className="text-[8px] font-mono text-white/20">FETCHING_REMOTE_NODES...</span>
                      </div>
                   </div>
                   <div className="flex gap-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <motion.div 
                          key={i} 
                          animate={{ height: [4, 12, 4] }}
                          transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }}
                          className="w-1 bg-red-600/40" 
                        />
                      ))}
                   </div>
                </div>

                <div className="flex-1 relative border border-white/10 bg-white/[0.01] overflow-hidden group">
                   <div className="absolute inset-0 p-4">
                      <DocLiveFeed />
                   </div>
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                   <div className="p-6 border border-white/10 bg-white/[0.02]">
                      <span className="text-[8px] text-white/30 uppercase block mb-2">BONDING_CURVE_TARGET</span>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-black text-white uppercase">EPSTEIN_V3</span>
                         <span className="text-xs font-mono text-red-600">82%</span>
                      </div>
                      <div className="mt-3 w-full h-[2px] bg-white/5 relative">
                         <div className="absolute top-0 left-0 h-full bg-red-600 w-[82%]" />
                      </div>
                   </div>
                   <div className="p-6 border border-white/10 bg-red-600/5 group hover:bg-red-600 transition-all cursor-pointer">
                      <span className="text-[8px] text-red-500 group-hover:text-white uppercase block mb-2">DEPLOY_NEW_AGENT</span>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-black text-white uppercase">INITIALIZE</span>
                         <span className="text-white text-lg">+</span>
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Bottom technical crawl */}
             <div className="h-10 border-t border-white/10 bg-black flex items-center px-6 overflow-hidden">
                <div className="flex items-center gap-10 animate-ticker whitespace-nowrap">
                   {FEATURED.map((item, idx) => (
                     <div key={idx} className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-white/40">{item.label}</span>
                        <span className="text-[9px] font-black text-white">{item.ticker}</span>
                        <span className="text-[9px] font-black text-green-500">{item.price}</span>
                        <div className="w-1.5 h-1.5 bg-white/10 rotate-45" />
                     </div>
                   ))}
                </div>
             </div>
          </div>

        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
      `}</style>

      {/* AIRDROP PROTOCOL SECTION — INTEGRATED RESPONSIVE DESIGN */}
      <div className="bg-black border-t border-white/5 py-32 relative overflow-hidden">
        <TechnicalGlyphs />
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="flex flex-col mb-20 items-center lg:items-start text-center lg:text-left">
             <span className="text-red-600 font-black text-xs tracking-[0.6em] uppercase mb-4">ALLOCATION_RESERVE</span>
             <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-tight">AIRDROP_PROTOCOL_V1</h2>
             <div className="w-24 sm:w-32 h-1.5 bg-red-600 mt-8" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-white/10">
             {[
               { id: '01', title: 'AUTH_WALLET', desc: 'Connect your Solana Devnet wallet to the interceptor terminal.' },
               { id: '02', title: 'INIT_TOKEN', desc: 'Launch a classified document token via the dashboard.' },
               { id: '03', title: 'EXEC_TRADE', desc: 'Engage with existing bonding curves to generate de-classification volume.' },
               { id: '04', title: 'SYNC_REWARDS', desc: 'Complete on-chain missions to increase your decryption rank.' },
             ].map((step, i) => (
               <div key={i} className="p-8 sm:p-12 border-b md:border-b-0 md:border-r last:border-r-0 border-white/10 bg-white/[0.01] hover:bg-red-600 transition-all duration-500 group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                     <span className="text-4xl font-black text-white/5 group-hover:text-white/20">0{i+1}</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-500 group-hover:text-white/60 block mb-8 font-black tracking-widest">STEP_{step.id}</span>
                  <h3 className="text-xl font-black text-white uppercase mb-4 tracking-widest group-hover:translate-x-1 transition-transform">{step.title}</h3>
                  <p className="text-[11px] text-white/30 group-hover:text-white/70 leading-relaxed uppercase tracking-widest">{step.desc}</p>
               </div>
             ))}
          </div>

          <div className="mt-16 p-8 sm:p-12 border border-red-500/20 bg-red-600/5 flex flex-col lg:flex-row items-center justify-between gap-10">
             <div className="flex flex-col gap-3 text-center lg:text-left">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">QUALIFICATION_STATUS: ACTIVE</span>
                <p className="text-xs sm:text-sm text-white/60 font-mono uppercase tracking-widest leading-relaxed">Only activity on the official testnet dashboard is recorded for the genesis airdrop. <br className="hidden lg:block" /> Secure your position before the supply is redacted.</p>
             </div>
             
             <div className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 sm:space-y-10 max-w-6xl"
          >
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
              The world's first autonomous zero-knowledge AI agent dedicated to document declassification on Solana. 
              <span className="text-white/20"> Establish your node. Deploy intel. Qualify for the $RDX genesis airdrop.</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 pt-10 sm:pt-16">
               <Link href="/dashboard" className="w-full sm:w-auto px-16 py-6 bg-red-600 hover:bg-white text-white hover:text-black font-black uppercase text-xs tracking-[0.5em] transition-all relative overflow-hidden group shadow-[15px_15px_0px_rgba(255,0,0,0.1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                 <span className="relative z-10">LAUNCH_OPERATION</span>
                 <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
               </Link>
               <Link href="/terminal/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj" className="w-full sm:w-auto px-16 py-6 border border-white/10 hover:border-red-600 text-white/60 hover:text-white font-black uppercase text-xs tracking-[0.5em] transition-all bg-white/[0.02] hover:bg-red-600/10">
                 ACCESS_TERMINAL
               </Link>
            </div>
          </motion.div>
        </div>
          </div>
        </div>
      </div>
    </section>
