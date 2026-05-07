'use client'

import { motion } from 'framer-motion'

const STEPS = [
  {
    num: '01',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Upload the Document',
    desc: 'Drop any PDF, image, or text — leaked memos, classified files, court records, redacted pages. The agent processes everything.',
    accent: '#ff1a1a',
    tag: 'PDF · IMAGE · TEXT',
  },
  {
    num: '02',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.5 2.798H5.298c-1.528 0-2.498-1.798-1.5-2.798L5 14.5" />
      </svg>
    ),
    title: 'AI Extracts & Analyses',
    desc: 'The autonomous agent reads the document, reconstructs redacted text, rates its controversy level, and generates a token name, ticker, and narrative.',
    accent: '#a855f7',
    tag: 'AI · RECONSTRUCT · VERIFY',
  },
  {
    num: '03',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    title: 'Launch on Solana',
    desc: 'One click. Your document becomes a tradeable SPL token on Solana mainnet. Bonding curve starts immediately. The truth has a price.',
    accent: '#00ff88',
    tag: 'SOLANA · SPL · LIVE',
  },
]

export function HowItWorks() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/4 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-[10px] text-red-500/60 font-mono tracking-[0.5em] uppercase mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            From <span className="text-red-500">Classified</span> to <span className="text-green-400">Tokenized</span>
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
            Any document can be a token. Any truth can be traded. The protocol handles everything in seconds.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="relative"
            >
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(100%_-_12px)] w-6 h-px bg-gradient-to-r from-white/10 to-transparent z-10" />
              )}

              <div className="rd-card h-full group hover:border-white/10 transition-all duration-300 p-6">
                {/* Step number */}
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border"
                    style={{
                      background: `${step.accent}10`,
                      borderColor: `${step.accent}30`,
                      color: step.accent,
                      boxShadow: `0 0 20px ${step.accent}15`,
                    }}
                  >
                    {step.icon}
                  </div>
                  <span
                    className="text-4xl font-black opacity-10 font-mono leading-none"
                    style={{ color: step.accent }}
                  >
                    {step.num}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{step.desc}</p>

                {/* Tag */}
                <div className="flex flex-wrap gap-1">
                  {step.tag.split(' · ').map(t => (
                    <span
                      key={t}
                      className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm border"
                      style={{
                        color: step.accent,
                        borderColor: `${step.accent}25`,
                        background: `${step.accent}08`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <a
            href="/dashboard"
            className="inline-flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_0_30px_rgba(255,26,26,0.3)] hover:shadow-[0_0_50px_rgba(255,26,26,0.5)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Launch a Document Token
          </a>
        </motion.div>
      </div>
    </section>
  )
}
