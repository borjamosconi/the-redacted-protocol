'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'

const LOCAL_IMAGES = [
  { url: '/images/art-1.png', label: 'THE REDACTED ENTITY', docId: 'FILE #001' },
  { url: '/images/art-2.jpg', label: 'CIPHER CORE', docId: 'FILE #002' },
  { url: '/images/art-3.jpg', label: 'SURVEILLANCE NODE', docId: 'FILE #003' },
  { url: '/images/art-4.jpg', label: 'CLASSIFIED TERMINAL', docId: 'FILE #004' },
  { url: '/images/art-5.jpg', label: 'NEURAL UPLINK', docId: 'FILE #005' },
]

export function GallerySection() {
  const [selected, setSelected] = useState<number | null>(null)

  const openModal = (i: number) => { setSelected(i) }
  const closeModal = () => setSelected(null)

  const modalItem = selected !== null ? LOCAL_IMAGES[selected] : null

  return (
    <section id="images" className="py-24 relative bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-red-500 font-mono tracking-widest text-sm mb-3"># OPERATION: VISUALS</p>
          <h2 className="text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter">
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">CLASSIFIED</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">ARCHIVE</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-red-500/50" />
            <div className="w-24 h-1.5 bg-red-600/80 skew-x-12" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-red-500/50" />
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm tracking-widest">ENCRYPTED VISUAL INTELLIGENCE EXTRACTED FROM THE MAINNET</p>
        </motion.div>

        {/* Masonry-style Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[300px]">
          {LOCAL_IMAGES.map((item, i) => {
            const isLarge = i === 0 || i === 3
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                onClick={() => openModal(i)}
                className={`group relative overflow-hidden rounded-xl border border-red-900/30 bg-black cursor-pointer shadow-2xl shadow-red-900/10 ${isLarge ? 'md:col-span-2 md:row-span-2' : ''}`}
              >
                {/* Image */}
                <div className="absolute inset-0">
                  <img
                    src={item.url}
                    alt={item.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none opacity-80 group-hover:opacity-60 transition-opacity" />
                </div>

                {/* Top Badge */}
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-red-950/80 border border-red-500/30 backdrop-blur-md rounded flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-red-200 tracking-widest">{item.docId}</span>
                </div>

                {/* Bottom Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-wide">{item.label}</h3>
                  <div className="h-0.5 w-12 bg-red-500 group-hover:w-full transition-all duration-500 ease-out" />
                </div>

                {/* Hover UI Overlays */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-red-500/50 transition-colors duration-300 rounded-xl pointer-events-none" />
                <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
              </motion.div>
            )
          })}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {selected !== null && modalItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative max-w-5xl w-full max-h-[90vh] flex flex-col bg-gray-900 border border-red-900/50 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)]"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-red-900/30 bg-black/50 backdrop-blur-md z-10">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-red-400 bg-red-950/50 px-2 py-1 rounded border border-red-900/50">{modalItem.docId}</span>
                    <h3 className="text-lg font-bold text-white tracking-widest">{modalItem.label}</h3>
                  </div>
                  <button onClick={closeModal} className="text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 p-2 rounded-full transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Image Container */}
                <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[50vh]">
                  <img
                    src={modalItem.url}
                    alt={modalItem.label}
                    className="max-w-full max-h-[75vh] object-contain"
                  />
                  {/* Subtle scanline effect on top of image */}
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  )
}
