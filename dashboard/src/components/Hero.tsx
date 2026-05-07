'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { LaunchCountdown } from './LaunchCountdown'
import { Header } from '@/components/Header'
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

function MatrixColumns() {
  const [cols, setCols] = useState<{ left: string; dur: string; op: number }[]>([])
  useEffect(() => {
    setCols(Array.from({ length: 14 }, (_, i) => ({
      left: `${i * 7 + Math.random() * 5}%`,
      dur: `${14 + Math.random() * 14}s`,
      op: 0.008 + Math.random() * 0.018,
    })))
  }, [])
  return (
    <div className="matrix-rain pointer-events-none">
      {cols.map((c, i) => (
        <div key={i} className="matrix-column" style={{ left: c.left, animationDuration: c.dur, opacity: c.op }} />
      ))}
    </div>
  )
}

function DigitalDust() {
  const [particles, setParticles] = useState<{ id: number; left: string; top: string; delay: string; dur: string }[]>([])
  useEffect(() => {
    setParticles(Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      dur: `${3 + Math.random() * 5}s`,
    })))
  }, [])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute w-0.5 h-0.5 bg-red-500/30 rounded-full"
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.8, 0],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: parseFloat(p.dur),
            repeat: Infinity,
            delay: parseFloat(p.delay),
            ease: "easeInOut",
          }}
          style={{ left: p.left, top: p.top }}
        />
      ))}
    </div>
  )
}

function DeclassificationCounter() {
  const [count, setCount] = useState(12845672)
  useEffect(() => {
    const t = setInterval(() => {
      setCount(c => c + Math.floor(Math.random() * 450) + 50)
    }, 150)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="absolute top-32 right-8 hidden xl:block text-right">
      <div className="text-[8px] text-red-900/40 font-mono uppercase tracking-[0.4em] mb-1">Bytes Declassified (Live)</div>
      <div className="text-2xl font-black text-red-600/20 font-mono tabular-nums tracking-widest">{count.toLocaleString()}</div>
    </div>
  )
}

const FEATURED = [
  { label: 'EPSTEIN DOCS', ticker: '$EPST', price: '+284%', color: '#ff1a1a' },
  { label: 'JFK FILES',    ticker: '$JFK63', price: '+132%', color: '#f97316' },
  { label: 'UFO BRIEFINGS',ticker: '$UAP51', price: '+441%', color: '#a855f7' },
  { label: 'NSA LEAKS',    ticker: '$NSA13', price: '+193%', color: '#22d3ee' },
]

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yBg   = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const opOut = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const [featured, setFeatured] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setFeatured(f => (f + 1) % FEATURED.length), 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">

      {/* Parallax ambient */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: yBg }}>
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-red-600/6 rounded-full blur-[180px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/4 rounded-full blur-[160px]" />
      </motion.div>

      <MatrixColumns />
      <DigitalDust />
      <DeclassificationCounter />

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,26,26,0.008) 3px,rgba(255,26,26,0.008) 4px)' }}
      />
      <div className="scanline-overlay opacity-30" />
      <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none animate-flicker" />

      {/* Corner brackets */}
      {['top-24 left-4 sm:left-8 border-l border-t','top-24 right-4 sm:right-8 border-r border-t','bottom-20 left-4 sm:left-8 border-l border-b','bottom-20 right-4 sm:right-8 border-r border-b'].map((cls, i) => (
        <div key={i} className={`absolute ${cls} border-red-900/25 w-10 h-10 pointer-events-none`} />
      ))}

      <motion.div
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12"
        style={{ opacity: opOut }}
      >
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 xl:gap-16 items-center min-h-[calc(100vh-5rem)]">

          {/* ── LEFT ── */}
          <div className="text-center lg:text-left order-2 lg:order-1">

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-7"
            >
              <div className="flex items-center gap-2 px-3 py-1 border border-red-500/50 rounded-none bg-red-900/20 mr-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-none animate-pulse" />
                <span className="text-[9px] text-red-400 font-mono font-black tracking-[0.3em] uppercase">LEVEL 5 CLEARANCE</span>
              </div>
              <span className="badge badge-active rounded-none border border-red-500/20 text-[10px]">AGENT ACTIVE</span>
              <span className="badge badge-purple rounded-none text-[10px] bg-purple-900/20 border border-purple-500/20 text-purple-400">COLOSSEUM 2026</span>
              <span className="badge badge-declassified rounded-none text-[10px] bg-black border border-gray-600">DECRYPTING...</span>
            </motion.div>

            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-[10px] text-red-500/80 tracking-[0.55em] uppercase mb-3 font-mono"
            >
              // SECURE CONNECTION ESTABLISHED //
            </motion.p>

            {/* Main headline */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-5 animate-crt"
            >
              <h1 className="text-[clamp(2.8rem,8vw,5.5rem)] font-black leading-[1.02] tracking-tight text-white mb-1">
                <GlitchText text="████████" className="text-gray-800 block animate-rgb" />
                <span className="text-red-500 text-[0.55em] font-mono tracking-[0.15em] uppercase block mt-2">
                  TRUTH HAS A MARKET CAP.
                </span>
                <GlitchText text="TRADE IT." className="text-white block animate-rgb" />
              </h1>
            </motion.div>

            {/* Censor bar */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.55, duration: 0.45 }}
              className="flex items-center gap-4 justify-center lg:justify-start mb-6"
              style={{ transformOrigin: 'left' }}
            >
              <div className="censor-bar w-36 sm:w-52 h-2.5 bg-red-600" />
              <span className="text-[8px] font-mono text-red-500 tracking-[0.35em] uppercase">Autonomous Declassification Engine</span>
            </motion.div>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="text-sm font-mono text-gray-400 leading-relaxed mb-8 max-w-md mx-auto lg:mx-0 border-l-2 border-red-500/30 pl-4"
            >
              Agent intercepts intercepted comms (Epstein, JFK, UAP).
              <br/><br/>
              Neural networks reconstruct redacted fragments.
              Tokens launched via Solana Bonding Curve.
              <span className="text-red-400 block mt-2">» No human oversight required.</span>
            </motion.p>

            {/* Featured rotating token */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center lg:justify-start gap-3 mb-8"
            >
              <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Trending:</span>
              <div className="flex items-center gap-2 px-3 py-1.5 border border-white/[0.06] bg-white/[0.02]">
                <span
                  className="text-xs font-black font-mono transition-colors duration-500"
                  style={{ color: FEATURED[featured].color }}
                >
                  {FEATURED[featured].ticker}
                </span>
                <span className="text-[10px] text-gray-500">{FEATURED[featured].label}</span>
                <span className="text-[10px] text-green-400 font-mono font-bold">{FEATURED[featured].price}</span>
              </div>
            </motion.div>

            {/* OFFICIAL $RDX LAUNCH BLOCK */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="mb-10 p-4 sm:p-6 border border-red-500/20 bg-red-500/5 rounded-sm relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-red-600 shadow-[0_0_10px_#ff1a1a]" />
              <h3 className="text-[10px] text-red-500 font-mono font-black tracking-[0.4em] mb-4 uppercase text-center lg:text-left">Official $RDX Launch Countdown</h3>
              <LaunchCountdown />
              <p className="mt-4 text-[9px] text-gray-500 font-mono text-center tracking-widest">
                BONDING CURVE ACTIVATION: MAY 22, 2026 \u{2014} 00:00 UTC
              </p>
            </motion.div>
 
            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.45 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10"
            >
              <a href="/dashboard" className="btn-premium min-w-[200px] text-center font-mono uppercase tracking-widest border-red-500 text-red-500 hover:bg-red-500/20 bg-black">
                [ INIT_LAUNCH ]
              </a>
              <a href={`/terminal/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj`} className="btn-redacted min-w-[160px] text-center font-mono uppercase tracking-widest">
                [ TRADE_$RDX ]
              </a>
              <a href="https://github.com/whalesconspiracy-33/the-redacted-protocol" target="_blank" rel="noopener noreferrer" className="btn-ghost min-w-[120px] text-center font-mono uppercase tracking-widest text-gray-500 hover:text-white">
                [ SRC_CODE ]
              </a>
            </motion.div>

            {/* Socials */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="flex items-center justify-center lg:justify-start gap-5 mb-10"
            >
              {[
                { href: 'https://x.com/theprotocol_sol', label: 'X', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                { href: 'https://t.me/TheRedacted_sol', label: 'Group', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
                { href: 'https://t.me/theredactedprotocol_bot', label: 'Bot', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
                { href: 'https://github.com/whalesconspiracy-33/the-redacted-protocol', label: 'GitHub', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> },
              ].map(l => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition-all duration-300 group">
                  <span className="group-hover:[filter:drop-shadow(0_0_6px_rgba(255,26,26,0.7))] transition-all">{l.icon}</span>
                  <span className="text-[10px] tracking-wider">{l.label}</span>
                </a>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="grid grid-cols-3 sm:grid-cols-6 gap-2"
            >
              {[
                { label: 'Supply',  value: '1B',   suffix: 'RDX' },
                { label: 'Tokens',  value: '12+',  suffix: 'DOCS' },
                { label: 'Agent',   value: 'AUTO', suffix: 'AI' },
                { label: 'Rust',    value: '12K',  suffix: 'LOC' },
                { label: 'Chain',   value: 'SOL',  suffix: 'L1' },
                { label: 'Status',  value: 'LIVE', suffix: 'NOW' },
              ].map((s, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 + i * 0.05 }}
                  className="rd-card text-center py-3 px-1 cursor-default group"
                >
                  <div className="text-base sm:text-lg font-black text-red-500 leading-none group-hover:[text-shadow:0_0_16px_rgba(255,26,26,0.9)] transition-all duration-300">{s.value}</div>
                  <div className="text-[7px] text-red-900/50 tracking-widest uppercase font-mono">{s.suffix}</div>
                  <div className="text-[7px] text-gray-600 tracking-wider uppercase mt-0.5">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT — Live Document Feed ── */}
          <div className="order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {/* Glow behind card */}
              <div className="absolute -inset-4 bg-red-600/6 blur-3xl rounded-full pointer-events-none" />

              {/* Card */}
              <div className="relative border border-red-900/25 bg-black/80 backdrop-blur-sm overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(255,26,26,0.08), 0 0 120px rgba(255,26,26,0.04)' }}
              >
                {/* Terminal header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-red-900/20 bg-black/80 font-mono">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-none bg-red-500 animate-pulse shadow-[0_0_6px_#ff1a1a]" />
                    <span className="text-[10px] text-red-400/80 tracking-[0.3em] uppercase">INTERCEPTED FRAGMENTS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['bg-red-500','bg-black border border-red-500','bg-black border border-red-500'].map((c,i) => (
                      <div key={i} className={`w-2 h-2 rounded-none ${c}`} />
                    ))}
                  </div>
                </div>

                {/* Feed */}
                <div className="p-4">
                  <DocLiveFeed />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="flex flex-col items-center gap-2 pb-6"
        >
          <span className="text-[9px] text-gray-700 tracking-[0.4em] uppercase font-mono">Scroll to explore</span>
          <motion.div animate={{ y: [0, 5, 0], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
            <svg className="w-4 h-4 text-red-900/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  )
}
