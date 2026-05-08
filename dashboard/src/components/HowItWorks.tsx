'use client'

import { motion } from 'framer-motion'

const STEPS = [
  {
    num: '01',
    icon: '📂',
    title: 'COLLECT FRAGMENTS',
    desc: 'Input raw, censored, or redacted data—classified documents, leaked memos, or suppressed media.',
    accent: '#ff2a2a',
    tag: 'PDF · OCR · LEAKS',
  },
  {
    num: '02',
    icon: '🧠',
    title: 'AI RECONSTRUCTION',
    desc: 'The RDX agent uses multi-modal intelligence to reconstruct what was hidden and verify its legitimacy.',
    accent: '#a855f7',
    tag: 'LLM · VERIFY · DECLASSIFY',
  },
  {
    num: '03',
    icon: '💎',
    title: 'SOLANA ANCHOR',
    desc: 'Convert the declassified truth into a tradeable SPL token with autonomous metadata and bonding curves.',
    accent: '#00ff88',
    tag: 'MINT · TRADE · EARN',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-32 px-4 relative overflow-hidden bg-black">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-[10px] text-red-500 font-mono tracking-[0.5em] uppercase mb-4"
            >
              Protocol Operation
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none"
            >
              FROM <span className="text-red-600">SECRET</span> <br />
              TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">LIQUIDITY</span>
            </motion.h2>
          </div>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/40 max-w-sm text-sm font-mono leading-relaxed border-l border-white/10 pl-6"
          >
            The Redacted Protocol automates the entire lifecycle of suppressed information. Declassify the truth, tokenize the future.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-1">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="group relative"
            >
              <div className="h-full bg-white/[0.02] border border-white/5 p-10 hover:bg-white/[0.04] transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-1 bg-white/20" />
                <div className="absolute top-0 right-0 w-1 h-1 bg-white/20" />
                <div className="absolute bottom-0 left-0 w-1 h-1 bg-white/20" />
                <div className="absolute bottom-0 right-0 w-1 h-1 bg-white/20" />
                
                <div className="text-4xl mb-8 group-hover:scale-110 transition-transform duration-500">{step.icon}</div>
                
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-mono text-white/20 tracking-widest">{step.num}</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4 group-hover:text-red-500 transition-colors">
                  {step.title}
                </h3>
                <p className="text-white/40 text-sm font-mono leading-relaxed mb-8">
                  {step.desc}
                </p>

                <div className="flex flex-wrap gap-2">
                  {step.tag.split(' · ').map(t => (
                    <span key={t} className="text-[9px] font-mono px-2 py-1 bg-white/[0.03] border border-white/5 text-white/30 uppercase tracking-widest">
                      {t}
                    </span>
                  ))}
                </div>
                
                <div className="absolute bottom-0 left-0 h-1 bg-red-500/50 w-0 group-hover:w-full transition-all duration-700" />
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 flex flex-col items-center"
        >
          <div className="relative group">
             <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-purple-600 opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
             <Link 
               href="/terminal/RDX"
               className="relative flex items-center gap-4 px-12 py-4 bg-black text-white font-black text-sm uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all border border-white/10"
             >
               ACCESS_TERMINAL_>>
             </Link>
          </div>
          <span className="mt-4 text-[9px] font-mono text-white/20 uppercase tracking-[0.5em]">SYSTEM_READY_FOR_INPUT</span>
        </motion.div>
      </div>
    </section>
  )
}
