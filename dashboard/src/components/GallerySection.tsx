'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const IMAGE_GALLERY = [
  {
    id: 'photo_2026-04-07_23-52-58',
    style: 'censored_figure',
    description: 'Censored figure with holographic rainbow interference',
    tags: ['figure', 'holographic', 'rainbow', 'censor'],
  },
  {
    id: 'photo_2026-04-07_23-52-59',
    style: 'censored_figure',
    description: 'Censored figure variant — grid background',
    tags: ['figure', 'grid', 'documents', 'censor'],
  },
  {
    id: 'photo_2026-04-07_23-53-00',
    style: 'access_denied',
    description: 'ACCESS DENIED stamp with glitch effects',
    tags: ['access denied', 'glitch', 'stamp', 'circuit'],
  },
  {
    id: 'photo_2026-04-07_23-53-01',
    style: 'censored_figure',
    description: 'Censored figure — light background variant',
    tags: ['figure', 'light', 'documents', 'censor'],
  },
  {
    id: 'photo_2026-04-07_23-53-02',
    style: 'classified_doc',
    description: 'Archivo 0 — classified documents with redacted elements',
    tags: ['archivo', 'documents', 'classified', 'redacted'],
  },
  {
    id: 'photo_2026-04-07_23-53-03',
    style: 'glitch_interference',
    description: 'Glitch interference pattern with holographic distortion',
    tags: ['glitch', 'interference', 'holographic', 'distortion'],
  },
  {
    id: 'photo_2026-04-07_23-53-05',
    style: 'circuit_board',
    description: 'Circuit board with redacted elements and glowing traces',
    tags: ['circuit', 'board', 'glowing', 'traces'],
  },
  {
    id: 'photo_2026-04-07_23-53-06',
    style: 'floating_documents',
    description: 'Floating redacted documents in dark void',
    tags: ['floating', 'documents', 'void', 'redacted'],
  },
  {
    id: 'photo_2026-04-07_23-53-07',
    style: 'classified_doc',
    description: 'Classified document with TOP SECRET classification',
    tags: ['classified', 'top secret', 'document', 'stamp'],
  },
  {
    id: 'photo_2026-04-07_23-53-08',
    style: 'access_denied',
    description: 'ACCESS DENIED with holographic interference',
    tags: ['access denied', 'holographic', 'interference', 'glitch'],
  },
  {
    id: 'photo_2026-04-07_23-53-09',
    style: 'censored_figure',
    description: 'Censored figure with document fragments',
    tags: ['figure', 'documents', 'fragments', 'censor'],
  },
  {
    id: 'photo_2026-04-07_23-53-10',
    style: 'floating_documents',
    description: 'Floating classified papers with censorship bars',
    tags: ['floating', 'papers', 'censorship', 'bars'],
  },
  {
    id: 'photo_2026-04-07_23-53-11',
    style: 'circuit_board',
    description: 'Circuit board with redacted data streams',
    tags: ['circuit', 'data', 'streams', 'redacted'],
  },
  {
    id: 'photo_2026-04-07_23-53-12',
    style: 'glitch_interference',
    description: 'Digital glitch with classified document fragments',
    tags: ['digital', 'glitch', 'classified', 'fragments'],
  },
  {
    id: 'photo_2026-04-07_23-53-13',
    style: 'classified_doc',
    description: 'Classified document with redacted sections',
    tags: ['classified', 'document', 'redacted', 'sections'],
  },
]

export function GallerySection() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedImage, setSelectedImage] = useState<typeof IMAGE_GALLERY[0] | null>(null)

  const filters = ['all', 'figure', 'access denied', 'circuit', 'floating', 'glitch', 'classified']

  const filtered = selectedFilter === 'all'
    ? IMAGE_GALLERY
    : IMAGE_GALLERY.filter(img => img.tags.some(t => t.includes(selectedFilter)))

  return (
    <section id="gallery" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">
            FILE #0007
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-red">IMAGE</span>{' '}
            <span className="text-rd-text">GALLERY</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm">
            REDACTED PROTOCOL AESTHETIC — HOLOGRAPHIC CENSOR BARS & DARK DYSTOPIAN STYLE
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-4 py-2 text-xs tracking-wider border transition-all ${
                selectedFilter === filter
                  ? 'border-rd-red bg-rd-red/10 text-rd-red'
                  : 'border-rd-border text-rd-muted hover:border-rd-muted/50'
              }`}
            >
              {filter.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedImage(img)}
              className="rd-card p-2 cursor-pointer group relative overflow-hidden"
            >
              {/* Placeholder - in production, show actual images */}
              <div className="w-full aspect-square bg-rd-card flex items-center justify-center">
                <div className="text-center">
                  <div className="text-rd-red text-2xl mb-2">███</div>
                  <div className="text-[10px] text-rd-muted/40 tracking-wider">{img.style}</div>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xs text-rd-text truncate">{img.description}</div>
                <div className="flex gap-1 mt-1">
                  {img.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] text-rd-muted/40 bg-rd-black px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="absolute inset-0 bg-rd-red/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>

        {/* Selected Image Modal */}
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-rd-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="rd-card max-w-2xl w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-lg font-bold text-rd-text">{selectedImage.description}</div>
                  <div className="text-xs text-rd-muted mt-1">Style: {selectedImage.style}</div>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-rd-muted hover:text-rd-red transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Image placeholder */}
              <div className="w-full aspect-video bg-rd-card flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="text-rd-red text-4xl mb-4">████████</div>
                  <div className="text-sm text-rd-muted">Image generation via Puter.js</div>
                  <div className="text-xs text-rd-muted/50 mt-2">
                    Use the Image Generator to create this style
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <a
                  href="#images"
                  onClick={() => setSelectedImage(null)}
                  className="flex-1 btn-redacted text-center"
                >
                  █ GENERATE THIS STYLE █
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="btn-ghost"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Info */}
        <div className="mt-16 text-center">
          <p className="text-xs text-rd-muted/30 tracking-widest">
            ALL IMAGES GENERATED WITH THE REDACTED PROTOCOL AESTHETIC
          </p>
          <p className="text-[10px] text-rd-muted/20 mt-2 tracking-wider">
            HOLOGRAPHIC CENSOR BARS • DARK GRIDS • FLOATING DOCUMENTS • GLITCH EFFECTS
          </p>
        </div>
      </div>
    </section>
  )
}
