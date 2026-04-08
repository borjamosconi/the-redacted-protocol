'use client'

import { motion } from 'framer-motion'

export function ColosseumSection() {
  return (
    <section id="colosseum" className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rd-red/5 rounded-full blur-[150px]" />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        {/* Colosseum Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 border border-rd-red/30 bg-rd-red/5 rounded-full mb-6">
            <div className="w-2 h-2 rounded-full bg-rd-red animate-pulse" />
            <span className="text-xs tracking-[0.3em] text-rd-red font-bold">
              COLOSSEUM SOLANA 2026 — OFFICIAL SUBMISSION
            </span>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
          {/* Left: About */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="text-rd-red">$RDX</span>{' '}
              <span className="text-rd-text">PROTOCOL</span>
            </h2>

            <div className="space-y-4 mb-8">
              <p className="text-rd-muted/80 leading-relaxed">
                <strong className="text-rd-text">Redacted Protocol</strong> is an autonomous,
                privacy-preserving, zero-knowledge AI agent that detects, reconstructs,
                verifies and declassifies censored/redacted information on Solana.
              </p>

              <p className="text-rd-muted/60 leading-relaxed text-sm">
                Built entirely in <strong className="text-rd-text">Rust</strong> with a
                <strong className="text-rd-text"> TypeScript dashboard</strong>. Uses{' '}
                <strong className="text-rd-text">OpenRouter free tier</strong> for LLM
                and <strong className="text-rd-text">Puter.js</strong> for free OCR &
                image generation. <strong className="text-rd-red">Zero cost to run.</strong>
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {[
                { icon: '🔍', text: 'Autonomous redaction detection in documents & news' },
                { icon: '🤖', text: 'AI reconstruction via multi-provider LLM consensus' },
                { icon: '⛓️', text: 'On-chain anchoring with ZK proofs on Solana' },
                { icon: '📰', text: 'News intelligence agent with conspiracy detection' },
                { icon: '🖼️', text: '100% free OCR & image generation (Puter.js)' },
                { icon: '🤖', text: 'Telegram bot with scheduled broadcasts' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-lg">{feature.icon}</span>
                  <span className="text-sm text-rd-muted/70">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Stats */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-3"
          >
            <div className="text-xs tracking-[0.3em] text-rd-muted/50 mb-4 text-center">
              PROJECT METRICS
            </div>

            {[
              { label: 'Lines of Rust', value: '~12,000', sub: 'Clean-room implementation' },
              { label: 'Cost to Run', value: '$0', sub: 'Forever free' },
              { label: 'Smart Contracts', value: '5', sub: 'Fragment, Archive, Staking, Rewards, Treasury' },
              { label: 'Crates', value: '8', sub: 'Modular Rust workspace' },
              { label: 'LLM Providers', value: '5', sub: 'Anthropic, OpenAI, xAI, DashScope, OpenRouter' },
              { label: 'Languages', value: '2', sub: 'Rust + TypeScript' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rd-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-rd-muted/40 tracking-widest mb-1">
                      {stat.label}
                    </div>
                    <div className="text-xs text-rd-muted/50">{stat.sub}</div>
                  </div>
                  <div className="text-2xl font-bold text-rd-red">{stat.value}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rd-card mb-16"
        >
          <div className="text-center mb-8">
            <div className="text-xs tracking-[0.3em] text-rd-muted/50 mb-2">
              HOW IT WORKS
            </div>
            <h3 className="text-2xl font-bold text-rd-text">
              FROM REDACTION TO DECLASSIFICATION
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { step: '1', title: 'DETECT', desc: 'Scan documents for redaction markers', icon: '🔍' },
              { step: '2', title: 'OCR', desc: 'Extract text via Puter.js (free)', icon: '📄' },
              { step: '3', title: 'RECONSTRUCT', desc: 'LLM infers hidden content', icon: '🤖' },
              { step: '4', title: 'ANCHOR', desc: 'Hash + ZK proof on Solana', icon: '⛓️' },
              { step: '5', title: 'PUBLISH', desc: 'Share via Telegram bot', icon: '📢' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-rd-red text-lg font-bold mb-1">{item.step}</div>
                <div className="text-sm font-bold text-rd-text mb-1">{item.title}</div>
                <div className="text-[10px] text-rd-muted/50">{item.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Social Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rd-card"
        >
          <div className="text-center mb-6">
            <div className="text-xs tracking-[0.3em] text-rd-muted/50 mb-2">
              CONNECT
            </div>
            <h3 className="text-xl font-bold text-rd-text">
              FOLLOW THE PROTOCOL
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="https://x.com/theprotocol_sol"
              target="_blank"
              rel="noopener noreferrer"
              className="rd-card p-6 text-center hover:border-rd-red/40 transition-all group"
            >
              <div className="text-3xl mb-3">𝕏</div>
              <div className="text-sm font-bold text-rd-text mb-1 group-hover:text-rd-red transition-colors">
                @theprotocol_sol
              </div>
              <div className="text-[10px] text-rd-muted/50">
                Updates & announcements
              </div>
            </a>

            <a
              href="https://github.com/AKIRA-33/the_redacted_protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="rd-card p-6 text-center hover:border-rd-red/40 transition-all group"
            >
              <div className="text-3xl mb-3">⌨️</div>
              <div className="text-sm font-bold text-rd-text mb-1 group-hover:text-rd-red transition-colors">
                GitHub
              </div>
              <div className="text-[10px] text-rd-muted/50">
                Full source code — MIT License
              </div>
            </a>

            <a
              href="https://t.me/theredacted_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="rd-card p-6 text-center hover:border-rd-red/40 transition-all group"
            >
              <div className="text-3xl mb-3">🤖</div>
              <div className="text-sm font-bold text-rd-text mb-1 group-hover:text-rd-red transition-colors">
                Telegram Bot
              </div>
              <div className="text-[10px] text-rd-muted/50">
                @theredacted_bot — Try it now
              </div>
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-rd-border text-center">
            <p className="text-xs text-rd-muted/40 tracking-widest">
              SUBMITTED TO COLOSSEUM SOLANA 2026 BY @theprotocol_sol
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
