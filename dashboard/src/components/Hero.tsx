'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    const chars = '█▓▒░'
    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) { setDisplay(text); clearInterval(interval); return }
      setDisplay(text.split('').map((c, idx) => idx < i ? c : chars[Math.floor(Math.random() * chars.length)]).join(''))
      i += Math.floor(Math.random() * 3) + 1
    }, 50)
    return () => clearInterval(interval)
  }, [text])

  return <span className={className}>{display}</span>
}

function MatrixColumns() {
  const [columns, setColumns] = useState<{ left: string; duration: string; opacity: number }[]>([])
  useEffect(() => {
    setColumns(Array.from({ length: 18 }, (_, i) => ({
      left: `${(i * 5.5) + Math.random() * 4}%`,
      duration: `${12 + Math.random() * 16}s`,
      opacity: 0.012 + Math.random() * 0.025,
    })))
  }, [])
  return (
    <div className="matrix-rain">
      {columns.map((col, i) => (
        <div key={i} className="matrix-column" style={{ left: col.left, animationDuration: col.duration, opacity: col.opacity }} />
      ))}
    </div>
  )
}

const ARTWORK = [
  { src: '/images/art-1.png', alt: 'ACCESS DENIED', label: 'FILE #0001' },
  { src: '/images/art-2.jpg', alt: 'REDACTED AGENT', label: 'FILE #0002' },
  { src: '/images/art-3.jpg', alt: 'CLASSIFIED', label: 'FILE #0003' },
  { src: '/images/art-4.jpg', alt: 'HACKATHON 2026', label: 'FILE #0004' },
  { src: '/images/art-5.jpg', alt: 'ARCHIVO 0', label: 'FILE #0005' },
]

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])
  const opacityContent = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const [activeArt, setActiveArt] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveArt(a => (a + 1) % ARTWORK.length), 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Parallax ambient */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: yBg }}>
        <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-red-600/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/4 rounded-full blur-[180px]" />
      </motion.div>

      <MatrixColumns />

      {/* Scan lines */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,26,26,0.005) 3px, rgba(255,26,26,0.005) 4px)',
      }} />

      {/* Corner brackets */}
      {[
        'top-24 left-4 sm:left-8 border-l border-t',
        'top-24 right-4 sm:right-8 border-r border-t',
        'bottom-24 left-4 sm:left-8 border-l border-b',
        'bottom-24 right-4 sm:right-8 border-r border-b',
      ].map((cls, i) => (
        <div key={i} className={`absolute ${cls} border-red-900/25 w-10 h-10 pointer-events-none`} />
      ))}

      <motion.div
        className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6"
        style={{ opacity: opacityContent }}
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-4rem)] py-16">

          {/* LEFT — text content */}
          <div className="text-center lg:text-left order-2 lg:order-1">

            {/* Status row */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-8"
            >
              <span className="badge badge-active text-[10px]">System Live</span>
              <span className="badge badge-purple text-[10px]">Colosseum 2026</span>
              <span className="badge badge-declassified text-[10px]">Solana</span>
            </motion.div>

            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-xs text-gray-500 tracking-[0.5em] uppercase mb-4 font-mono"
            >
              Autonomous Intelligence Agent
            </motion.p>

            {/* Giant $RDX */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-4"
            >
              <GlitchText
                text="$RDX"
                className="text-[clamp(4.5rem,14vw,8rem)] font-black leading-none block neon-red"
              />
              {/* Glitch offset */}
              <div className="absolute inset-0 flex items-center pointer-events-none select-none overflow-hidden"
                style={{ clipPath: 'polygon(0 35%, 100% 35%, 100% 52%, 0 52%)', transform: 'translate(4px, 0)', opacity: 0.1 }}>
                <span className="text-[clamp(4.5rem,14vw,8rem)] font-black leading-none text-cyan-400">$RDX</span>
              </div>
            </motion.div>

            {/* Censor bar */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex items-center gap-4 justify-center lg:justify-start mb-6"
            >
              <motion.div
                className="w-32 sm:w-48 h-2.5 censor-bar"
                animate={{ x: [-1, 1, -1, 1, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 5 }}
              />
              <span className="text-[8px] font-mono text-red-900/40 tracking-[0.3em]">CLASSIFIED</span>
            </motion.div>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <p className="text-lg sm:text-xl font-semibold text-gray-200 tracking-[0.12em] mb-2 font-mono">
                REDACTED PROTOCOL
              </p>
              <p className="text-sm text-gray-500 tracking-wider mb-10">
                Detect — Reconstruct — Verify — Declassify on Solana
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10"
            >
              <a href="/terminal/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj" className="btn-premium min-w-[200px] text-center">
                Trade $RDX
              </a>
              <a href="/dashboard" className="btn-redacted min-w-[170px] text-center">
                Launch a Token
              </a>
              <a href="https://github.com/whalesconspiracy-33/the-redacted-protocol" target="_blank" rel="noopener noreferrer" className="btn-ghost min-w-[140px] text-center">
                GitHub
              </a>
            </motion.div>

            {/* Social links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="flex items-center justify-center lg:justify-start gap-6 mb-12"
            >
              {[
                { href: 'https://x.com/theprotocol_sol', label: 'X / Twitter', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                { href: 'https://t.me/theredacted_bot', label: 'Telegram', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
                { href: 'https://github.com/whalesconspiracy-33/the-redacted-protocol', label: 'GitHub', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg> },
              ].map(link => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-500 hover:text-red-400 transition-all duration-300 group">
                  <span className="group-hover:[filter:drop-shadow(0_0_6px_rgba(255,26,26,0.7))] transition-all">{link.icon}</span>
                  <span className="text-xs tracking-wider">{link.label}</span>
                </a>
              ))}
            </motion.div>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
              className="grid grid-cols-3 sm:grid-cols-6 gap-2"
            >
              {[
                { label: 'Supply', value: '1B', suffix: 'RDX' },
                { label: 'Liquidity', value: '30%', suffix: '300M' },
                { label: 'APY', value: '50%', suffix: 'STAKE' },
                { label: 'Rust', value: '12K', suffix: 'LOC' },
                { label: 'Contracts', value: '6', suffix: 'SC' },
                { label: 'Users', value: '2.4K', suffix: 'LIVE' },
              ].map((stat, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 + i * 0.05, duration: 0.4 }}
                  className="rd-card text-center py-3 px-1 group cursor-default"
                >
                  <div className="text-lg sm:text-xl font-black text-red-500 leading-none group-hover:[text-shadow:0_0_16px_rgba(255,26,26,0.9),0_0_32px_rgba(255,26,26,0.4)] transition-all duration-300">{stat.value}</div>
                  <div className="text-[7px] text-red-900/50 tracking-widest uppercase font-mono">{stat.suffix}</div>
                  <div className="text-[7px] text-gray-600 tracking-wider uppercase mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — artwork showcase */}
          <div className="order-1 lg:order-2 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, x: 30 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm lg:max-w-md"
            >
              {/* Glow behind image */}
              <div className="absolute inset-0 bg-red-600/10 blur-3xl rounded-full scale-110 pointer-events-none" />

              {/* Main image frame */}
              <div className="relative border border-red-900/30 overflow-hidden"
                style={{ boxShadow: '0 0 80px rgba(255,26,26,0.12), 0 0 160px rgba(255,26,26,0.05), inset 0 0 60px rgba(0,0,0,0.6)' }}
              >
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-red-500/50 z-20" />
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-red-500/50 z-20" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-red-500/50 z-20" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-red-500/50 z-20" />

                {/* Scan line overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none"
                  style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)' }}
                />

                {/* Status bar top */}
                <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-black/70 border-b border-red-900/20 backdrop-blur-sm">
                  <span className="text-[9px] font-mono text-red-500/80 tracking-widest">{ARTWORK[activeArt].label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_4px_#ff1a1a]" />
                    <span className="text-[9px] font-mono text-gray-500 tracking-wider">CLASSIFIED</span>
                  </div>
                </div>

                {/* Images with crossfade */}
                <div className="relative aspect-square overflow-hidden bg-black">
                  {ARTWORK.map((art, i) => (
                    <motion.img
                      key={art.src}
                      src={art.src}
                      alt={art.alt}
                      className="absolute inset-0 w-full h-full object-cover"
                      animate={{ opacity: i === activeArt ? 1 : 0 }}
                      transition={{ duration: 1.2, ease: 'easeInOut' }}
                    />
                  ))}
                  {/* Red tint overlay */}
                  <div className="absolute inset-0 bg-red-950/10 mix-blend-multiply pointer-events-none z-10" />
                </div>

                {/* Status bar bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-black/70 border-t border-red-900/20 backdrop-blur-sm">
                  <span className="text-[9px] font-mono text-gray-600 tracking-wider">{ARTWORK[activeArt].alt}</span>
                  {/* Dot indicators */}
                  <div className="flex gap-1.5">
                    {ARTWORK.map((_, i) => (
                      <button key={i} onClick={() => setActiveArt(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeArt ? 'bg-red-500 shadow-[0_0_4px_#ff1a1a]' : 'bg-gray-700 hover:bg-gray-500'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Thumbnail strip below */}
              <div className="flex gap-2 mt-3">
                {ARTWORK.map((art, i) => (
                  <button key={i} onClick={() => setActiveArt(i)}
                    className={`flex-1 aspect-square overflow-hidden border transition-all duration-300 ${i === activeArt ? 'border-red-500/60 shadow-[0_0_10px_rgba(255,26,26,0.3)]' : 'border-gray-800/60 hover:border-gray-600/60'}`}
                  >
                    <img src={art.src} alt={art.alt} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="flex flex-col items-center gap-2 pb-8"
        >
          <span className="text-[10px] text-gray-700 tracking-[0.4em] uppercase font-mono">Scroll to explore</span>
          <motion.div animate={{ y: [0, 6, 0], opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
            <svg className="w-4 h-4 text-red-900/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  )
}
