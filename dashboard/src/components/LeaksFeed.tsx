'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Leak {
  id: string
  source: string
  content: string
  status: 'REDACTED' | 'PARTIAL' | 'DEEP_LEAK' | 'DECLASSIFIED'
  timestamp: string
  type: 'SIGNAL' | 'DOCUMENT' | 'INTEL'
}

const INITIAL_LEAKS: Leak[] = [
  { id: '1', source: 'SIGNAL-STATION-A', content: 'The package has been delivered to ██████. The ████████ is complete. Awaiting $RDX.', status: 'REDACTED', timestamp: 'JUST NOW', type: 'SIGNAL' },
  { id: '2', source: 'CIA-ARCHIVE-LEAK', content: 'Project ██████ has entered phase 2. All personnel are advised to [DATA EXPUNGED].', status: 'PARTIAL', timestamp: '12m ago', type: 'DOCUMENT' },
  { id: '3', source: 'DEEP-WEB-INTERCEPT', content: 'They are watching the bonding curve. Do not move the ██████ until 22-05.', status: 'DEEP_LEAK', timestamp: '45m ago', type: 'INTEL' },
  { id: '4', source: 'REDACTED-PROTOCOL', content: 'RDX Tokenomics declassified: 1B Supply. Fixed. 0% Tax. 100% Truth.', status: 'DECLASSIFIED', timestamp: '2h ago', type: 'INTEL' },
]

export function LeaksFeed() {
  const [leaks, setLeaks] = useState<Leak[]>(INITIAL_LEAKS)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    // Random glitch effect on content every few seconds
    const interval = setInterval(() => {
      setLeaks(prev => prev.map(l => {
        if (Math.random() > 0.8 && l.status !== 'DECLASSIFIED') {
          return { ...l, content: l.content.replace(/█/g, Math.random() > 0.5 ? '█' : '▒') }
        }
        return l
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="leaks" className="py-12 sm:py-24 relative overflow-hidden bg-black">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,26,26,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,26,26,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 border-l-2 border-red-600 pl-6">
          <div>
            <div className="text-[10px] text-red-500 font-mono font-black tracking-[0.4em] uppercase mb-2">LIVE INTELLIGENCE FEED</div>
            <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter">RECENT LEAKS</h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            STATION STATUS: INTERCEPTING
          </div>
        </div>

        {/* Leaks List */}
        <div className="space-y-4">
          <AnimatePresence>
            {leaks.map((leak, i) => (
              <motion.div
                key={leak.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rd-card p-5 group relative overflow-hidden border-white/5 hover:border-red-500/30 transition-all duration-500"
              >
                {/* Status indicator on the left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  leak.status === 'DECLASSIFIED' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
                  leak.status === 'REDACTED' ? 'bg-red-600 shadow-[0_0_10px_#dc2626]' :
                  'bg-yellow-500 shadow-[0_0_10px_#eab308]'
                }`} />

                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-red-500 font-mono font-black tracking-widest">{leak.source}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm border ${
                      leak.type === 'SIGNAL' ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' :
                      leak.type === 'DOCUMENT' ? 'border-purple-500/30 text-purple-400 bg-purple-500/5' :
                      'border-red-500/30 text-red-400 bg-red-500/5'
                    }`}>
                      {leak.type}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-700 font-mono">{leak.timestamp}</span>
                </div>

                <p className="text-sm sm:text-base text-gray-400 font-mono leading-relaxed mb-4 group-hover:text-gray-200 transition-colors">
                  {leak.content}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 text-[8px] font-black rounded-sm border ${
                      leak.status === 'REDACTED' ? 'border-red-500/20 text-red-500 bg-red-500/5' :
                      leak.status === 'DECLASSIFIED' ? 'border-green-500/20 text-green-500 bg-green-500/5' :
                      'border-yellow-500/20 text-yellow-500 bg-yellow-500/5'
                    }`}>
                      {leak.status}
                    </span>
                  </div>
                  
                  <Link href="/terminal" className="text-[10px] text-gray-600 hover:text-red-500 font-black uppercase tracking-widest transition-colors flex items-center gap-1.5">
                    INVESTIGATE ⊕
                  </Link>
                </div>

                {/* Hover scanline */}
                <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-600 font-mono mb-6">MORE DATA FRAGMENTS RECOVERING...</p>
          <div className="flex justify-center gap-4">
             <div className="w-8 h-1 bg-red-600/20" />
             <div className="w-8 h-1 bg-red-600/40 animate-pulse" />
             <div className="w-8 h-1 bg-red-600/20" />
          </div>
        </div>

      </div>
    </section>
  )
}
