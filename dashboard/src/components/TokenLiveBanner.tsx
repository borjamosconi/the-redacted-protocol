'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const RDX_MINT = 'Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj'
const TERMINAL_URL = `/terminal/${RDX_MINT}`
const SOLSCAN_URL  = `https://solscan.io/token/${RDX_MINT}`

/**
 * Live banner — $RDX is the FIRST token launched on the platform.
 * The protocol's own token is the proof-of-concept of the launchpad:
 * pump.fun for classified / censored / redacted documents.
 */

function ScrollingTicker() {
  const items = [
    { ticker: '$EPST', price: '0.042 SOL', change: '+28%' },
    { ticker: '$JFK63', price: '0.12 SOL', change: '-5%' },
    { ticker: '$UAP51', price: '0.008 SOL', change: '+142%' },
    { ticker: '$RDX', price: '0.001 SOL', change: '+12%' },
    { ticker: '$NSA13', price: '0.03 SOL', change: '+8%' },
    { ticker: '$CIA_DOCS', price: '0.002 SOL', change: '-12%' },
  ]
  return (
    <div className="w-full overflow-hidden bg-red-600/5 border-y border-red-500/10 py-2 mb-12">
      <motion.div 
        animate={{ x: [0, -1000] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex whitespace-nowrap gap-12"
      >
        {[...items, ...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-white font-black">{item.ticker}</span>
            <span className="text-gray-500">{item.price}</span>
            <span className={item.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}>{item.change}</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export function TokenLiveBanner() {
  return (
    <section className="relative py-16 border-y border-red-900/20 bg-gradient-to-b from-black via-red-950/5 to-black overflow-hidden">
      <ScrollingTicker />
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-red-500/30 rounded-sm bg-red-500/5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-red-400 font-mono tracking-[0.3em] uppercase">$RDX is live</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-white">First token launched on</span>{' '}
            <span className="text-red-500">redacted.bond</span>
          </h2>

          <p className="text-xs md:text-sm text-rd-muted/60 max-w-2xl mx-auto mb-8 leading-relaxed">
            The protocol's own token, born from the same launchpad anyone uses to
            spawn tokens for redacted documents, banned articles, leaks, and
            classified intelligence. Trade $RDX directly on the terminal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={TERMINAL_URL}
              className="px-8 py-3 bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-[0.3em] rounded-sm transition-all shadow-[0_0_20px_rgba(255,26,26,0.3)] hover:shadow-[0_0_30px_rgba(255,26,26,0.5)]"
            >
              Trade $RDX
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3 border border-red-500/40 hover:border-red-500 text-red-400 hover:text-red-200 font-mono text-xs uppercase tracking-[0.3em] rounded-sm transition-all"
            >
              Launch Your Token
            </Link>
            <a
              href={SOLSCAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 text-rd-muted/50 hover:text-red-400 font-mono text-[10px] uppercase tracking-[0.3em] transition-colors"
            >
              Solscan ↗
            </a>
          </div>

          <div className="mt-6 inline-block px-3 py-2 border border-red-900/20 bg-black rounded-sm">
            <code className="text-[10px] text-rd-muted/40 font-mono break-all">
              {RDX_MINT}
            </code>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
