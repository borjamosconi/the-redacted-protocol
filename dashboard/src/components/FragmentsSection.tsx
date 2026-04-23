'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface Fragment {
  id: string;
  status: string;
  confidence: number;
  preview: string;
  topicTags: string[];
  arweaveTx?: string;
  onChainTx?: string;
}

interface FragmentStats {
  declassified: number;
  verified: number;
  processing: number;
  pending: number;
}

export function FragmentsSection() {
  const [fragments, setFragments] = useState<Fragment[]>([])
  const [stats, setStats] = useState<FragmentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/fragments', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Fetch failed')
        return res.json()
      })
      .then(data => {
        setFragments(data.fragments || [])
        setStats(data.stats || null)
        setLoading(false)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('[FragmentsSection]', err)
        }
        setFragments([])
        setStats(null)
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'badge-verified';
      case 'DECLASSIFIED': return 'badge-declassified';
      case 'PROCESSING': return 'badge-processing';
      default: return 'badge-pending';
    }
  }

  if (loading) {
    return (
      <section id="fragments" className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="text-rd-muted/50 text-sm tracking-widest">LOADING FRAGMENTS...</div>
          </div>
        </div>
      </section>
    )
  }

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

          {/* Live stats */}
          {stats && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-rd-muted/50">
              <span className="px-2 py-1 border border-rd-red/20 bg-rd-red/5 text-rd-red">
                {stats.declassified} DECLASSIFIED
              </span>
              <span className="px-2 py-1 border border-green-500/20 bg-green-500/5 text-green-400">
                {stats.verified} VERIFIED
              </span>
              <span className="px-2 py-1 border border-yellow-500/20 bg-yellow-500/5 text-yellow-400">
                {stats.processing} PROCESSING
              </span>
              <span className="px-2 py-1 border border-rd-muted/20 text-rd-muted/40">
                {stats.pending} PENDING
              </span>
            </div>
          )}
        </div>

        {/* Fragment cards */}
        <div className="space-y-4">
          {fragments.map((frag, i) => (
            <motion.div
              key={frag.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rd-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-rd-red font-bold text-sm">FILE {frag.id}</span>
                    <span className={`badge ${statusBadgeClass(frag.status)}`}>
                      {frag.status}
                    </span>
                    {frag.topicTags.map(tag => (
                      <span key={tag} className="text-[10px] text-rd-muted/40 bg-rd-border px-1.5 py-0.5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-rd-muted/60 text-sm font-mono truncate">
                    {frag.preview}
                  </p>
                  {frag.arweaveTx && (
                    <div className="text-[10px] text-rd-muted/30 mt-1">
                      Arweave: {frag.arweaveTx}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-bold text-lg ${
                    frag.confidence >= 95 ? 'text-green-400' :
                    frag.confidence >= 85 ? 'text-rd-red' :
                    frag.confidence >= 70 ? 'text-yellow-400' :
                    'text-rd-muted/50'
                  }`}>
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
            &#x2588; SUBMIT REDACTED DOCUMENT &#x2588;
          </a>
          <p className="text-xs text-rd-muted/30 mt-4 tracking-widest">
            EARN 100 RDX PER DOCUMENT SUBMITTED
          </p>
        </motion.div>
      </div>
    </section>
  )
}
