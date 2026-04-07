'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

export function NewsSection() {
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleScan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setScanResult(null)
    setScanning(true)

    const formData = new FormData(e.currentTarget)
    const url = formData.get('url') as string

    if (!url) {
      setError('URL REQUIRED')
      setScanning(false)
      return
    }

    try {
      // In production, this would call your API
      // const res = await fetch(`/api/scan-news?url=${encodeURIComponent(url)}`)
      // const data = await res.json()

      // Simulated response
      await new Promise(r => setTimeout(r, 2000))
      setScanResult(`🔍 NEWS ANALYSIS\n\nTitle: Sample Article\nThreat: Suspicious\nFlags: 3\n\n• Classified language detected (70%)\n• Cover-up pattern: "declined to comment" (65%)\n• Passive voice framing (40%)`)
    } catch {
      setError('SCAN FAILED')
    } finally {
      setScanning(false)
    }
  }

  return (
    <section id="news" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">
            FILE #0004
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-red">NEWS</span>{' '}
            <span className="text-rd-text">INTELLIGENCE</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm">
            SCAN ANY NEWS ARTICLE FOR CENSORSHIP & CONSPIRACY INDICATORS
          </p>
        </div>

        {/* Scanner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rd-card max-w-lg mx-auto mb-12"
        >
          <div className="border-b border-rd-border pb-4 mb-6">
            <div className="text-[10px] text-rd-muted/50 tracking-[0.2em] mb-1">
              INTELLIGENCE SCANNER
            </div>
            <div className="text-lg font-bold text-rd-text">
              SCAN NEWS ARTICLE
            </div>
          </div>

          <form onSubmit={handleScan}>
            <div className="mb-6">
              <label className="block text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">
                ARTICLE URL
              </label>
              <input
                name="url"
                type="url"
                placeholder="https://example.com/article"
                className="input-rd"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 border border-rd-red/40 bg-rd-red/10 text-rd-red text-xs tracking-wider">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={scanning}
              className="w-full btn-redacted disabled:opacity-40"
            >
              {scanning ? 'SCANNING...' : '█ SCAN ARTICLE █'}
            </button>
          </form>

          {/* Result */}
          {scanResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 p-4 border border-rd-red/20 bg-rd-red/5 font-mono text-xs whitespace-pre-wrap text-rd-text"
            >
              {scanResult}
            </motion.div>
          )}
        </motion.div>

        {/* Detection capabilities */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: '███',
              title: 'Redaction Detection',
              desc: 'Detects ███, [REDACTED], blacked-out content, and censorship markers in articles',
            },
            {
              icon: '🔒',
              title: 'Classified Language',
              desc: 'Identifies classified, secret, restricted, and other security terminology',
            },
            {
              icon: '',
              title: 'Cover-Up Patterns',
              desc: 'Flags "no comment", unnamed sources, passive voice, and evasion language',
            },
            {
              icon: '📡',
              title: 'Conspiracy Keywords',
              desc: 'Matches against 40+ known conspiracy and intelligence operation keywords',
            },
            {
              icon: '⚖️',
              title: 'Framing Analysis',
              desc: 'Detects unusual framing, passive constructions, and source reliability issues',
            },
            {
              icon: '📊',
              title: 'Threat Scoring',
              desc: 'Calculates overall threat level: Safe → Suspicious → Flagged → Critical',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rd-card text-center"
            >
              <div className="text-2xl mb-3">{item.icon}</div>
              <div className="text-sm font-bold text-rd-text mb-2">{item.title}</div>
              <div className="text-xs text-rd-muted/50 leading-relaxed">{item.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Telegram bot CTA */}
        <div className="mt-12 text-center">
          <p className="text-xs text-rd-muted/40 tracking-widest mb-4">
            AUTOMATED SCANNING VIA TELEGRAM BOT
          </p>
          <a
            href="https://t.me/theredacted_bot"
            target="_blank"
            rel="noopener"
            className="btn-ghost"
          >
            /scan_news &lt;url&gt; → GET INSTANT ANALYSIS
          </a>
        </div>
      </div>
    </section>
  )
}
