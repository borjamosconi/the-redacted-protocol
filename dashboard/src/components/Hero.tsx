'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

function FloatingDoc({ delay = 0, x = 0, rotation = 0, scale = 1 }: { delay?: number; x?: number; rotation?: number; scale?: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none hidden md:block"
      style={{ left: `${x}%`, top: '15%', transform: `scale(${scale}) rotate(${rotation}deg)` }}
      initial={{ opacity: 0 }}
      animate={{
        y: [0, -25, 0],
        rotate: [rotation - 3, rotation + 3, rotation - 3],
        opacity: [0.03, 0.06, 0.03],
      }}
      transition={{ duration: 10, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="bg-rd-text/10 p-3 w-24 h-32 relative">
        <div className="space-y-1.5">
          <div className="h-1 bg-rd-red/20 w-full" />
          <div className="h-1 bg-rd-red/20 w-4/5" />
          <div className="h-1 bg-rd-red/20 w-full" />
          <div className="h-1 bg-rd-red/20 w-3/4" />
        </div>
        <div className="mt-3 space-y-1">
          <div className="h-0.5 bg-rd-text/5 w-full" />
          <div className="h-0.5 bg-rd-text/5 w-full" />
          <div className="h-0.5 bg-rd-text/5 w-4/5" />
          <div className="h-0.5 bg-rd-text/5 w-3/4" />
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="h-2 bg-rd-red/30 w-full" />
        </div>
      </div>
    </motion.div>
  )
}

function Drip({ left, delay = 0 }: { left: string; delay?: number }) {
  return (
    <motion.div
      className="absolute w-px bg-gradient-to-b from-rd-red to-transparent"
      style={{ left }}
      initial={{ height: 0, top: '40%' }}
      animate={{ height: [0, 25, 0], opacity: [0.6, 0.2, 0] }}
      transition={{ duration: 2.5, delay, repeat: Infinity, repeatDelay: 4 }}
    />
  )
}

function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    const chars = '\u{2588}\u{2593}\u{2592}\u{2591}\u{2554}\u{2557}\u{255A}\u{255D}\u{2551}\u{2550}\u{2560}\u{2563}\u{256C}\u{2566}\u{2567}\u{2564}\u{256A}\u{256B}'
    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) {
        setDisplay(text)
        clearInterval(interval)
        return
      }
      const glitched = text
        .split('')
        .map((c, idx) => (idx < i ? c : chars[Math.floor(Math.random() * chars.length)]))
        .join('')
      setDisplay(glitched)
      i += Math.floor(Math.random() * 3) + 1
    }, 40)
    return () => clearInterval(interval)
  }, [text])

  return <span className={className}>{display}</span>
}

function MatrixColumns() {
  const columns = Array.from({ length: 20 }, (_, i) => ({
    left: `${(i * 5) + Math.random() * 5}%`,
    duration: `${8 + Math.random() * 12}s`,
    opacity: 0.03 + Math.random() * 0.05,
  }))

  return (
    <div className="matrix-rain">
      {columns.map((col, i) => (
        <div
          key={i}
          className="matrix-column"
          style={{
            left: col.left,
            animationDuration: col.duration,
            opacity: col.opacity,
          }}
        />
      ))}
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Matrix rain background */}
      <MatrixColumns />

      {/* Floating documents (desktop only) */}
      <FloatingDoc delay={0} x={3} rotation={-12} scale={0.8} />
      <FloatingDoc delay={3} x={78} rotation={8} scale={1.1} />
      <FloatingDoc delay={6} x={12} rotation={5} scale={0.6} />
      <FloatingDoc delay={9} x={85} rotation={-18} scale={0.7} />
      <FloatingDoc delay={2} x={50} rotation={15} scale={0.5} />

      {/* Red drips */}
      <Drip left="15%" delay={0} />
      <Drip left="40%" delay={1} />
      <Drip left="65%" delay={2} />
      <Drip left="85%" delay={0.5} />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rd-red/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-rd-purple/5 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl mx-auto px-4">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 mb-10 px-4 py-2 border border-rd-red/20 bg-rd-red/5"
        >
          <div className="w-2 h-2 rounded-full bg-rd-red animate-pulse shadow-[0_0_6px_#ff1a1a]" />
          <span className="text-[10px] md:text-xs tracking-[0.4em] text-rd-muted">
            SYSTEM ACTIVE — FILE #0000 — DECLASSIFIED
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-4"
        >
          <span className="text-xs md:text-sm text-rd-muted/40 tracking-[0.6em] block mb-2">
            AUTONOMOUS INTELLIGENCE AGENT
          </span>
          <GlitchText
            text="$RDX"
            className="text-6xl sm:text-8xl md:text-9xl font-bold neon-red block"
          />
        </motion.h1>

        {/* Censor bar */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-12 md:w-32 bg-gradient-to-r from-transparent to-rd-red/40" />
          <motion.div
            className="w-24 md:w-48 h-3 censor-bar"
            animate={{ x: [-2, 2, -1, 1, 0] }}
            transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 4 }}
          />
          <div className="h-px w-12 md:w-32 bg-gradient-to-l from-transparent to-rd-red/40" />
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-base md:text-xl text-rd-muted tracking-[0.3em] mb-3"
        >
          REDACTED PROTOCOL
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs md:text-sm text-rd-muted/40 tracking-widest mb-12"
        >
          DETECT · RECONSTRUCT · VERIFY · DECLASSIFY — ON SOLANA
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
        >
          <a
            href="#airdrop"
            className="btn-premium"
          >
            &#x2588; CLAIM AIRDROP &#x2588;
          </a>
          <a
            href="https://t.me/theredacted_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-redacted min-w-[200px] text-center"
          >
            TELEGRAM BOT
          </a>
          <a
            href="https://github.com/whalesconspiracy-33/the-redacted-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost min-w-[200px] text-center flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GITHUB REPO
          </a>
        </motion.div>

        {/* Social Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center justify-center gap-8 mb-12"
        >
          <a
            href="https://github.com/whalesconspiracy-33/the-redacted-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-rd-muted/50 hover:text-rd-red transition-all duration-300 group"
          >
            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_#ff1a1a]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span className="text-[10px] tracking-[0.3em] group-hover:text-glow transition-all">GITHUB</span>
          </a>
          <a
            href="https://x.com/theprotocol_sol"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-rd-muted/50 hover:text-rd-red transition-all duration-300 group"
          >
            <span className="text-base font-bold group-hover:drop-shadow-[0_0_8px_#ff1a1a]">&#x1D54F;</span>
            <span className="text-[10px] tracking-[0.3em] group-hover:text-glow transition-all">X / TWITTER</span>
          </a>
          <a
            href="https://t.me/theredacted_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-rd-muted/50 hover:text-rd-red transition-all duration-300 group"
          >
            <svg className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_#ff1a1a]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            <span className="text-[10px] tracking-[0.3em] group-hover:text-glow transition-all">TELEGRAM</span>
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 max-w-3xl mx-auto"
        >
          {[
            { label: 'SUPPLY', value: '1B', icon: '💰' },
            { label: 'AIRDROP', value: '40%', icon: '🎁' },
            { label: 'STAKING', value: '50%', icon: '⚡' },
            { label: 'CRATES', value: '8', icon: '📦' },
            { label: 'SMART CTTS', value: '6', icon: '⛓️' },
            { label: 'LLM PROVIDERS', value: '5', icon: '🤖' },
            { label: 'LINES OF RUST', value: '12K', icon: '🔧' },
            { label: 'COST TO RUN', value: '$0', icon: '🆓' },
            { label: 'TG COMMANDS', value: '7', icon: '💬' },
            { label: 'XP ACTIONS', value: '12', icon: '🎮' },
            { label: 'LEVELS', value: '7', icon: '🏆' },
            { label: 'QUESTS', value: '8', icon: '🎯' },
            { label: 'GALLERY', value: '22', icon: '🖼️' },
            { label: 'LICENSE', value: 'MIT', icon: '📜' },
            { label: 'LANGUAGES', value: '2', icon: '💻' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4 + i * 0.04 }}
              className="group p-2 md:p-3 border border-rd-border/50 bg-rd-black/50 backdrop-blur-sm hover:border-rd-red/30 hover:bg-rd-red/5 transition-all duration-300"
            >
              <div className="text-sm md:text-lg mb-0.5">{stat.icon}</div>
              <div className="text-sm md:text-lg font-bold text-rd-red group-hover:text-glow transition-all">{stat.value}</div>
              <div className="text-[8px] md:text-[10px] text-rd-muted/40 tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="mt-12 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] text-rd-muted/30 tracking-[0.5em]">SCROLL TO EXPLORE</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-px h-6 bg-gradient-to-b from-rd-red/50 to-transparent"
          />
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-rd-black to-transparent" />
    </section>
  )
}
