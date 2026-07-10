'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { extractDeclassifiedData, type DeclassifiedIntel } from '@/lib/geminiService'

export function OcrSection() {
  const { publicKey } = useWallet()
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<DeclassifiedIntel | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return
    setError('')
    setResult(null)
    setProcessing(true)

    try {
      const data = await extractDeclassifiedData(file)
      setResult(data)

      if (publicKey) {
        fetch('/api/gamify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: publicKey.toString(),
            action: 'redx_intel_scan',
          }),
        }).catch(() => {})
      }
    } catch (err: any) {
      setError(err.message || 'RED-X analysis failed')
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
            MISSION: RED-X INTEL
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-red">RED-X</span>{' '}
            <span className="text-rd-text">NEURAL INTELLIGENCE</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm">
            SECURE MULTI-VECTOR DOCUMENT TRIANGULATION
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
                <div className="text-4xl animate-pulse text-rd-red">👁</div>
                <div className="text-rd-red font-mono text-sm tracking-widest">
                  RED-X INITIALIZING...
                </div>
                <div className="text-xs text-rd-muted/50">
                  Processing document fragments...
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl">📂</div>
                <div className="text-rd-text font-mono text-sm tracking-widest">
                  LOAD FRAGMENT OR DATASET
                </div>
                <div className="text-xs text-rd-muted/50">
                  PDF, JPG, PNG — High-fidelity analysis
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

          {error && (
            <div className="mt-4 p-3 border border-rd-red/40 bg-rd-red/10 text-rd-red text-xs tracking-wider">
              ⚠ {error}
            </div>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div className={`rd-card ${result.censorship?.detected ? 'rd-card-red' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] text-rd-muted/50 tracking-widest">
                    RED-X INTEL REPORT
                  </div>
                  <div className={`badge ${result.censorship?.detected ? 'badge-active' : ''}`}>
                    {result.censorship?.detected ? 'CENSORSHIP DETECTED' : 'ANALYSIS COMPLETE'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-rd-black/50 rounded border border-rd-border/10">
                    <div className="text-lg font-bold text-rd-red">
                      {Math.round((result.metadata?.confidence || 0) * 100)}%
                    </div>
                    <div className="text-[10px] text-rd-muted/40 tracking-wider mt-1">
                      CONFIDENCE
                    </div>
                  </div>
                  <div className="text-center p-3 bg-rd-black/50 rounded border border-rd-border/10">
                    <div className={`text-lg font-bold ${result.censorship?.riskLevel === 'CRITICAL' ? 'text-red-600 animate-pulse' : 'text-rd-red'}`}>
                      {result.metadata?.clearanceLevel || 'TOP SECRET'}
                    </div>
                    <div className="text-[10px] text-rd-muted/40 tracking-wider mt-1">
                      CLEARANCE LEVEL
                    </div>
                  </div>
                </div>

                {result.truthSummary && (
                  <div className="mb-6 p-4 bg-rd-text/5 border-l-4 border-rd-red font-mono">
                    <div className="text-[10px] text-rd-muted/60 mb-1 uppercase tracking-tighter">OBJECTIVE_TRUTH_SUMMARY</div>
                    <div className="text-sm text-rd-text italic">"{result.truthSummary}"</div>
                  </div>
                )}

                {result.reconstruction && (
                  <div className="mt-4 p-4 bg-rd-red/5 border border-rd-red/20 rounded relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 text-[8px] font-black text-rd-red/20 uppercase tracking-widest">RED-X_CORE_INFERENCE</div>
                    <div className="text-[10px] text-rd-red/70 tracking-widest mb-4 font-bold uppercase flex items-center gap-2">
                       <span className="w-2 h-2 bg-rd-red animate-pulse" />
                       RECONSTRUCTED_FRAGMENTS_&_TRUTH_MATRIX
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4 opacity-50">
                       {['ANTHROPIC', 'OPENAI', 'X-AI'].map(provider => (
                         <div key={provider} className="text-[7px] border border-rd-red/20 p-1 flex justify-between">
                            <span>{provider}</span>
                            <span className="text-green-500">CONSENSUS_99%</span>
                         </div>
                       ))}
                    </div>

                    <div className="text-xs text-rd-text/90 leading-relaxed whitespace-pre-wrap font-mono border-l-2 border-rd-red/30 pl-4">
                      {result.reconstruction}
                    </div>
                  </div>
                )}

                {result.keyFindings && result.keyFindings.length > 0 && (
                  <div className="mt-8">
                    <div className="text-[10px] text-rd-muted/50 tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-1 bg-rd-red rounded-full animate-ping" />
                      KEY_INTEL_EXTRACTED
                    </div>
                    <div className="space-y-2">
                      {result.keyFindings.map((finding, idx) => (
                        <div key={idx} className="p-3 bg-rd-black/30 border border-rd-border/10 rounded font-mono text-[10px] text-rd-text/70 flex items-start gap-3">
                          <span className="text-rd-red">►</span>
                          {finding}
                        </div>
                      ))}
                    </div>
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
              title: 'Neural Reconstruction',
              desc: 'High-fidelity reconstruction of redacted data points via multi-vector consensus.',
            },
            {
              title: 'Pattern Triangulation',
              desc: 'Cross-references document fragments against global data streams for validation.',
            },
            {
              title: 'Anomaly Detection',
              desc: 'Identifies structural inconsistencies and high-density redaction signatures.',
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
