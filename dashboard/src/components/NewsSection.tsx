'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

interface NewsFlag {
  flag_type: string;
  description: string;
  confidence: number;
  context: string;
}

interface ScanResult {
  url: string;
  title: string;
  threat_level: 'Safe' | 'Suspicious' | 'Flagged' | 'Critical';
  flags: NewsFlag[];
  content_length: number;
  analyzed_at: string;
}

const THREAT_COLORS: Record<string, string> = {
  Safe: 'text-green-400',
  Suspicious: 'text-yellow-400',
  Flagged: 'text-orange-400',
  Critical: 'text-rd-red',
};

const THREAT_ICONS: Record<string, string> = {
  Safe: '✅',
  Suspicious: '⚠️',
  Flagged: '🚨',
  Critical: '🔴',
};

export function NewsSection() {
  const { publicKey } = useWallet()
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')

  const handleScan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setScanResult(null)

    if (!url.trim()) {
      setError('URL REQUIRED')
      return
    }

    setScanning(true)

    try {
      const res = await fetch(`/api/scan-news?url=${encodeURIComponent(url)}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'SCAN FAILED')
        return
      }

      setScanResult(data)

      // Award XP for news scan
      if (publicKey) {
        fetch('/api/gamify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            action: 'news_scan',
          }),
        }).catch(() => {}) // Silently fail
      }
    } catch {
      setError('NETWORK ERROR — UNABLE TO SCAN')
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
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="input-rd"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 border border-rd-red/40 bg-rd-red/10 text-rd-red text-xs tracking-wider"
              >
                ⚠ {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={scanning || !url.trim()}
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
              className="mt-6 space-y-4"
            >
              {/* Summary */}
              <div className="p-4 border border-rd-red/20 bg-rd-red/5">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-lg font-bold ${THREAT_COLORS[scanResult.threat_level]}`}>
                    {THREAT_ICONS[scanResult.threat_level]} {scanResult.threat_level.toUpperCase()}
                  </span>
                  <span className="text-xs text-rd-muted/50">
                    {scanResult.flags.length} indicators
                  </span>
                </div>
                <div className="text-xs text-rd-text/70 mb-1">
                  <strong>Title:</strong> {scanResult.title}
                </div>
                <div className="text-xs text-rd-muted/40">
                  Content: {scanResult.content_length} chars | Scanned: {new Date(scanResult.analyzed_at).toLocaleTimeString()}
                </div>
              </div>

              {/* Flags */}
              {scanResult.flags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-rd-muted/50 tracking-[0.2em]">INDICATORS</div>
                  {scanResult.flags.map((flag, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 border border-rd-border bg-rd-card/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-rd-red">
                          [{flag.flag_type}]
                        </span>
                        <span className="text-xs text-rd-muted/50">
                          {Math.round(flag.confidence * 100)}%
                        </span>
                      </div>
                      <div className="text-xs text-rd-text/70">{flag.description}</div>
                      {/* Confidence bar */}
                      <div className="mt-2 h-1 bg-rd-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${flag.confidence * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className={`h-full rounded-full ${
                            flag.confidence >= 0.8 ? 'bg-rd-red' :
                            flag.confidence >= 0.6 ? 'bg-orange-500' :
                            flag.confidence >= 0.4 ? 'bg-yellow-500' :
                            'bg-rd-muted/50'
                          }`}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {scanResult.flags.length === 0 && (
                <div className="p-4 text-center text-rd-muted/50 text-sm">
                  No significant indicators found — Article appears clean
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Detection capabilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              icon: '🛡️',
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
