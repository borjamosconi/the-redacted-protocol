'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'


const AI_PROMPTS: { prompt: string; label: string; file: string }[] = [
  { prompt: 'hooded figure glowing red eyes black censorship bars face classified documents floating dark cyberpunk ultra detailed 8k cinematic', label: 'AGENT ZERO', file: 'GEN #001' },
  { prompt: 'large red ACCESS DENIED text glitch holographic dark background VHS distortion scanlines neon cyberpunk 8k', label: 'ACCESS DENIED', file: 'GEN #002' },
  { prompt: 'classified TOP SECRET document black redaction bars glowing red stamps holographic dark grid cinematic 8k', label: 'ARCHIVO 0', file: 'GEN #003' },
  { prompt: 'solana blockchain network nodes glowing red connections dark void holographic cyberpunk cryptographic 8k', label: 'SOLANA NETWORK', file: 'GEN #004' },
  { prompt: 'AI agent neural network dark aesthetic glowing circuit traces red orange holographic classified cyberpunk 8k', label: 'NEURAL AGENT', file: 'GEN #005' },
  { prompt: 'redacted protocol logo red black glitch holographic VHS distortion dark cinematic dramatic 8k', label: '$RDX TOKEN', file: 'GEN #006' },
  { prompt: 'dystopian surveillance room multiple screens redacted documents black bars censor red light holographic 8k', label: 'SURVEILLANCE', file: 'GEN #007' },
  { prompt: 'zero knowledge proof cryptographic cipher dark holographic purple red glow classified cyberpunk 8k', label: 'ZK PROOF', file: 'GEN #008' },
]

export function GallerySection() {
  const [selected, setSelected] = useState<number | null>(null)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})
  const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({})
  const [genSeed] = useState(() => Math.floor(Math.random() * 9000) + 1000)

  const openModal = (i: number) => { setSelected(i) }
  const closeModal = () => setSelected(null)

  const modalItem = selected !== null ? AI_PROMPTS[selected] : null

  return (
    <section id="images" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="section-file-label mb-3">File #0007</p>
          <h2 className="text-4xl sm:text-5xl font-black mb-4">
            <span className="text-red-500 neon-red">IMAGE</span>{' '}
            <span className="text-white">ARCHIVE</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-red-900/40" />
            <div className="w-20 h-2 censor-bar" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-red-900/40" />
          </div>
          <p className="text-gray-500 text-sm tracking-widest">CLASSIFIED VISUAL INTELLIGENCE — ARCHIVO 0</p>
        </motion.div>


            <motion.div
              key="generated"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              {AI_PROMPTS.map((item, i) => {
                const seed = genSeed + i * 17
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.prompt)}?width=512&height=512&seed=${seed}&nologo=true&model=flux`
                const hasError = imgErrors[i]
                const isLoaded = imgLoaded[i]
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => !hasError && openModal(i)}
                    className={`group relative overflow-hidden border border-gray-800/60 hover:border-red-900/40 transition-all duration-300 ${!hasError ? 'cursor-pointer' : 'cursor-default'}`}
                    whileHover={!hasError ? { boxShadow: '0 0 24px rgba(255,26,26,0.08)' } : {}}
                  >
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1.5 bg-black/70 border-b border-white/[0.03]">
                      <span className="text-[8px] font-mono text-gray-600 tracking-widest">{item.file}</span>
                      <span className={`text-[8px] font-mono ${hasError ? 'text-red-600/60' : isLoaded ? 'text-green-600/60' : 'text-yellow-600/60'}`}>
                        {hasError ? 'ERR' : isLoaded ? 'AI' : '...'}
                      </span>
                    </div>
                    <div className="relative aspect-square bg-gray-950">
                      {/* Loading shimmer */}
                      {!isLoaded && !hasError && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-6 h-6 border border-red-900/30 border-t-red-500/50 rounded-full animate-spin mx-auto mb-2" />
                            <div className="text-[7px] text-gray-700 font-mono tracking-widest">GENERATING...</div>
                          </div>
                        </div>
                      )}
                      {!hasError && (
                        <img src={url} alt={item.label} loading="lazy"
                          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                          onLoad={() => setImgLoaded(p => ({ ...p, [i]: true }))}
                          onError={() => setImgErrors(p => ({ ...p, [i]: true }))}
                        />
                      )}
                      {hasError && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center px-4">
                            <div className="text-red-500/20 text-4xl mb-2">█</div>
                            <div className="text-[7px] text-gray-700 font-mono tracking-widest">UNAVAILABLE</div>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 pointer-events-none">
                        <div className="text-[10px] font-bold text-white">{item.label}</div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>

        {/* Modal */}
        <AnimatePresence>
          {selected !== null && modalItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="rd-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs font-mono text-red-500/70 tracking-widest mb-1">
                      {'file' in modalItem ? modalItem.file : ''}
                    </div>
                    <div className="text-lg font-bold text-white">{modalItem.label}</div>
                  </div>
                  <button onClick={closeModal} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <img
                  src={`https://image.pollinations.ai/prompt/${encodeURIComponent(modalItem.prompt)}?width=1024&height=1024&seed=${100 + selected * 13}&nologo=true&model=flux`}
                  alt={modalItem.label}
                  className="w-full rounded mb-4 border border-gray-800/60"
                />

                <button onClick={closeModal} className="w-full btn-ghost">
                  CLOSE
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer note */}
        <div className="mt-12 text-center">
          <p className="text-[10px] text-gray-700 tracking-widest font-mono">
            OFICIAL ARTWORK — REDACTED PROTOCOL © 2026 — AI GENERATION VIA POLLINATIONS.AI
          </p>
        </div>
      </div>
    </section>
  )
}
