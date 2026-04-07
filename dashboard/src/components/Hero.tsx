'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

function FloatingDoc({ delay = 0, x = 0, rotation = 0, scale = 1 }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
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
    const chars = '█▓▒░╔╗╚╝║═╠╣╬╦╧╤╪'
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

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Floating documents */}
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

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 mb-8"
        >
          <div className="w-2 h-2 rounded-full bg-rd-red animate-pulse" />
          <span className="text-xs tracking-[0.3em] text-rd-muted">
            SYSTEM ACTIVE — FILE #0000
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <GlitchText
            text="$RDX"
            className="text-7xl md:text-9xl font-bold text-rd-red block mb-2"
          />
        </motion.h1>

        {/* Censor bar */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-20 md:w-32 bg-gradient-to-r from-transparent to-rd-red/40" />
          <motion.div
            className="w-32 md:w-48 h-3 censor-bar"
            animate={{ x: [-2, 2, -1, 1, 0] }}
            transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 4 }}
          />
          <div className="h-px w-20 md:w-32 bg-gradient-to-l from-transparent to-rd-red/40" />
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg md:text-xl text-rd-muted tracking-[0.2em] mb-3"
        >
          REDACTED PROTOCOL
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-rd-muted/50 tracking-widest mb-12"
        >
          AUTONOMOUS ZERO-KNOWLEDGE DECLASSIFICATION AGENT
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#airdrop"
            className="btn-redacted animate-pulse-red min-w-[200px]"
          >
            █ CLAIM AIRDROP █
          </a>
          <a
            href="https://t.me/theredacted_bot"
            target="_blank"
            rel="noopener"
            className="btn-ghost min-w-[200px] text-center"
          >
            TELEGRAM BOT
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto"
        >
          {[
            { label: 'SUPPLY', value: '1B' },
            { label: 'AIRDROP', value: '40%' },
            { label: 'STAKING APY', value: '50%' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-xl md:text-2xl font-bold text-rd-red">{stat.value}</div>
              <div className="text-[10px] text-rd-muted/50 tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-rd-black to-transparent" />
    </section>
  )
}
