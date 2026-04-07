'use client'

import { motion } from 'framer-motion'

const sampleFragments = [
  { id: '#0047', status: 'DECLASSIFIED', confidence: 94.7, preview: 'The ████ was moved to ███████ on ██/██/2024' },
  { id: '#0048', status: 'VERIFIED', confidence: 98.2, preview: 'Operation ███ ECLIPSE involved at least ██ entities' },
  { id: '#0049', status: 'PROCESSING', confidence: 67.3, preview: 'All ██████ are to be sealed via █████ route' },
  { id: '#0050', status: 'DECLASSIFIED', confidence: 91.5, preview: 'The subject was transferred to ██████████ facility' },
]

export function FragmentsSection() {
  return (
    <section id="fragments" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">
            FILE #0002
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-text">DECLASSIFIED</span>{' '}
            <span className="text-rd-red">FRAGMENTS</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm">
            RECONSTRUCTED FROM REDACTED DOCUMENTS
          </p>
        </div>

        {/* Fragment cards */}
        <div className="space-y-4">
          {sampleFragments.map((frag, i) => (
            <motion.div
              key={frag.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rd-card"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-rd-red font-bold text-sm">FILE {frag.id}</span>
                    <span className={`badge ${frag.status === 'VERIFIED' ? 'badge-active' : frag.status === 'DECLASSIFIED' ? 'badge-pending' : ''}`}>
                      {frag.status}
                    </span>
                  </div>
                  <p className="text-rd-muted/60 text-sm font-mono">
                    {frag.preview}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-rd-red font-bold text-lg">
                    {frag.confidence}%
                  </div>
                  <div className="text-[10px] text-rd-muted/40 tracking-widest">
                    CONFIDENCE
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Submit CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <a
            href="https://t.me/theredacted_bot"
            target="_blank"
            rel="noopener"
            className="btn-redacted"
          >
            █ SUBMIT REDACTED DOCUMENT █
          </a>
          <p className="text-xs text-rd-muted/30 mt-4 tracking-widest">
            EARN 100 RDX PER DOCUMENT SUBMITTED
          </p>
        </motion.div>
      </div>
    </section>
  )
}
