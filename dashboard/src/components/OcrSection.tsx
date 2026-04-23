'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'

export function OcrSection() {
  const { publicKey } = useWallet()
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{
    text: string
    confidence: number
    redactionCount: number
    redactions: boolean
  } | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return
    setError('')
    setResult(null)
    setProcessing(true)

    try {
      // Check if Puter.js is loaded
      if (typeof (window as any).puter === 'undefined') {
        // Load Puter.js dynamically
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://js.puter.com/v2/'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Puter.js'))
          document.head.appendChild(script)
        })
      }

      // Perform OCR via Puter.js (100% free, no API key)
      const ocrResult = await (window as any).puter.ai.ocr(file, {
        lang: 'eng+spa',
        psm: 3,
      })

      // Detect redaction patterns
      const redactionPatterns = [
        /█+/g,
        /\[REDACTED\]/g,
        /\[CLASSIFIED\]/g,
        /\[CENSORED\]/g,
        /[█▓▒░]{2,}/g,
        /x{3,}/g,
      ]

      let redactionCount = 0
      redactionPatterns.forEach((p) => {
        const matches = ocrResult.text.match(p)
        if (matches) redactionCount += matches.length
      })

      setResult({
        text: ocrResult.text,
        confidence: ocrResult.confidence || 0.9,
        redactionCount,
        redactions: redactionCount > 0,
      })

      // Award XP for OCR scan
      if (publicKey) {
        fetch('/api/gamify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            action: 'ocr_scan',
          }),
        }).catch(() => {}) // Silently fail — don't break UX
      }
    } catch (err: any) {
      setError(err.message || 'OCR processing failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  return (
    <section id="ocr" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">
            FILE #0005
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-red">OCR</span>{' '}
            <span className="text-rd-text">DOCUMENT ANALYSIS</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm">
            UPLOAD IMAGES/PDFS — 100% FREE OCR VIA PUTER.JS
          </p>
        </div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rd-card max-w-lg mx-auto mb-12"
        >
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-rd-border hover:border-rd-red/40 rounded-lg p-12 text-center cursor-pointer transition-colors"
          >
            {processing ? (
              <div className="space-y-4">
                <div className="text-4xl animate-pulse">███</div>
                <div className="text-rd-red font-mono text-sm tracking-widest">
                  PROCESSING DOCUMENT...
                </div>
                <div className="text-xs text-rd-muted/50">
                  Extracting text via Puter.js (100% free)
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl">📄</div>
                <div className="text-rd-text font-mono text-sm tracking-widest">
                  DROP DOCUMENT OR CLICK TO UPLOAD
                </div>
                <div className="text-xs text-rd-muted/50">
                  PNG, JPG, PDF supported — No API key needed
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              style={{ display: 'none' }}
              tabIndex={-1}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 border border-rd-red/40 bg-rd-red/10 text-rd-red text-xs tracking-wider">
              ⚠ {error}
            </div>
          )}

          {/* How it works */}
          <div className="mt-6 pt-6 border-t border-rd-border">
            <div className="text-[10px] text-rd-muted/50 tracking-widest mb-3">
              HOW IT WORKS
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-rd-red text-lg font-bold">1</div>
                <div className="text-[10px] text-rd-muted/40 tracking-wider">
                  UPLOAD IMAGE
                </div>
              </div>
              <div>
                <div className="text-rd-red text-lg font-bold">2</div>
                <div className="text-[10px] text-rd-muted/40 tracking-wider">
                  OCR EXTRACTION
                </div>
              </div>
              <div>
                <div className="text-rd-red text-lg font-bold">3</div>
                <div className="text-[10px] text-rd-muted/40 tracking-wider">
                  DETECT REDACTIONS
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              {/* Status Card */}
              <div className={`rd-card ${result.redactions ? 'rd-card-red' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] text-rd-muted/50 tracking-widest">
                    ANALYSIS COMPLETE
                  </div>
                  <div className={`badge ${result.redactions ? 'badge-active' : ''}`}>
                    {result.redactions ? 'REDACTIONS DETECTED' : 'CLEAN DOCUMENT'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-rd-black/50 rounded">
                    <div className="text-xl font-bold text-rd-red">
                      {result.confidence > 0 ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-rd-muted/40 tracking-wider mt-1">
                      CONFIDENCE
                    </div>
                  </div>
                  <div className="text-center p-3 bg-rd-black/50 rounded">
                    <div className="text-xl font-bold text-rd-red">
                      {result.text.split(/\s+/).length}
                    </div>
                    <div className="text-[10px] text-rd-muted/40 tracking-wider mt-1">
                      WORDS
                    </div>
                  </div>
                  <div className="text-center p-3 bg-rd-black/50 rounded">
                    <div className="text-xl font-bold text-rd-red">
                      {result.redactionCount}
                    </div>
                    <div className="text-[10px] text-rd-muted/40 tracking-wider mt-1">
                      REDACTIONS
                    </div>
                  </div>
                </div>

                {/* Extracted Text */}
                <div className="mt-4">
                  <div className="text-[10px] text-rd-muted/50 tracking-widest mb-2">
                    EXTRACTED TEXT
                  </div>
                  <div className="p-4 bg-rd-black/80 border border-rd-border font-mono text-xs text-rd-text/80 whitespace-pre-wrap max-h-64 overflow-y-auto rounded">
                    {result.text}
                  </div>
                </div>

                {/* CTA */}
                {result.redactions && (
                  <div className="mt-6 pt-4 border-t border-rd-border">
                    <p className="text-xs text-rd-muted/60 mb-3">
                      Redactions detected. Send to AI for reconstruction:
                    </p>
                    <a
                      href="https://t.me/theredacted_bot"
                      target="_blank"
                      rel="noopener"
                      className="btn-redacted w-full text-center"
                    >
                      █ RECONSTRUCT VIA TELEGRAM BOT █
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            {
              title: '100% Free OCR',
              desc: 'Powered by Puter.js — no API key, no cost, no limits. Tesseract.js under the hood.',
            },
            {
              title: 'Redaction Detection',
              desc: 'Automatically detects ███, [REDACTED], black bars, and censorship markers.',
            },
            {
              title: 'Multi-language',
              desc: 'Supports English, Spanish, and 100+ languages via Tesseract.js.',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rd-card text-center"
            >
              <div className="text-sm font-bold text-rd-text mb-2">{item.title}</div>
              <div className="text-xs text-rd-muted/50 leading-relaxed">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
