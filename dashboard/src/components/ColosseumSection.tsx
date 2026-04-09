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
                { icon: '🔐', text: '3-tier permission system (Observer/Reconstructor/Declassifier)' },
                { icon: '📊', text: 'ReAct agent loop with session persistence' },
                { icon: '🎨', text: '6 image style presets (Censored, Access Denied, Glitch, etc.)' },
                { icon: '💰', text: '$RDX token with staking, governance & rewards' },
                { icon: '🌐', text: 'Next.js 15 dashboard with Solana wallet adapter' },
                { icon: '🐳', text: 'Docker deployment with health checks' },
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
              { label: 'Cost to Run', value: '$0', sub: 'Forever free (OpenRouter + Puter.js)' },
              { label: 'Smart Contracts', value: '6', sub: 'Fragment, Archive, Staking, Rewards, Treasury, Token' },
              { label: 'Rust Crates', value: '8', sub: 'rd-core, rd-tools, rd-hooks, rd-types, rd-session, rd-providers, rd-config, rd-cli' },
              { label: 'LLM Providers', value: '5', sub: 'Anthropic, OpenAI, xAI, DashScope, OpenRouter' },
              { label: 'Dashboard API Routes', value: '5', sub: 'Airdrop, Fragments, Image, Scan-News, Status' },
              { label: 'React Components', value: '12', sub: 'Hero, Header, Footer, Colosseum, Airdrop, OCR, ImageGen, Gallery, News, Fragments, Tokenomics, SolanaProvider' },
              { label: 'Telegram Bot Commands', value: '7', sub: '/start, /status, /airdrop, /scan_news, /help, + AI chat' },
              { label: 'Image Styles', value: '6', sub: 'Censored Figure, Access Denied, Floating Docs, Circuit, Classified, Glitch' },
              { label: 'Gallery Assets', value: '22', sub: '16 photos + 6 videos' },
              { label: 'Languages', value: '2', sub: 'Rust + TypeScript' },
              { label: 'License', value: 'MIT', sub: 'Open source — 2026' },
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
              { step: '1', title: 'DETECT', desc: 'Scan documents & news for redaction markers', icon: '🔍' },
              { step: '2', title: 'OCR', desc: 'Extract text via Puter.js Tesseract (100% free)', icon: '📄' },
              { step: '3', title: 'RECONSTRUCT', desc: 'Multi-LLM consensus infers hidden content', icon: '🤖' },
              { step: '4', title: 'VERIFY', desc: 'Confidence scoring + threat level analysis', icon: '✅' },
              { step: '5', title: 'ANCHOR', desc: 'Hash + ZK proof on Solana blockchain', icon: '⛓️' },
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
              <div className="text-3xl mb-3">&#x1D54F;</div>
              <div className="text-sm font-bold text-rd-text mb-1 group-hover:text-rd-red transition-colors">
                @theprotocol_sol
              </div>
              <div className="text-[10px] text-rd-muted/50">
                Updates & announcements on X
              </div>
            </a>

            <a
              href="https://github.com/whalesconspiracy-33/the-redacted-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="rd-card p-6 text-center hover:border-rd-red/40 transition-all group"
            >
              <svg className="w-8 h-8 mx-auto mb-3 text-rd-text group-hover:text-rd-red transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              <div className="text-sm font-bold text-rd-text mb-1 group-hover:text-rd-red transition-colors">
                GitHub Repository
              </div>
              <div className="text-[10px] text-rd-muted/50">
                Full source code — MIT License — Open Source
              </div>
            </a>

            <a
              href="https://t.me/theredacted_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="rd-card p-6 text-center hover:border-rd-red/40 transition-all group"
            >
              <svg className="w-8 h-8 mx-auto mb-3 text-rd-text group-hover:text-rd-red transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
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
