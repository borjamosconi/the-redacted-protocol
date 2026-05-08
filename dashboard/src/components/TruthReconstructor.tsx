'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface NewsPerspective {
  source: string;
  bias: 'LEFT' | 'RIGHT' | 'REDACTED';
  headline: string;
  keyPoints: string[];
}

const SAMPLE_DATA = [
  {
    topic: 'CYBER_WARFARE_PROTOCOLS',
    left: {
      source: 'Tech Watch',
      bias: 'LEFT',
      headline: 'Network Outage attributed to Solar Flare Interference',
      keyPoints: ['Natural phenomenon', 'Infrastructure vulnerability', 'No malicious intent found']
    },
    right: {
      source: 'Defense Intel',
      bias: 'RIGHT',
      headline: 'State-Sponsored Hackers Target Critical Power Grid Nodes',
      keyPoints: ['External aggression', 'National security threat', 'Retaliation protocols activated']
    },
    reconstructed: {
      source: 'RDX_AGENT_01',
      bias: 'REDACTED',
      headline: 'Operation Black Horizon: Stress Testing Autonomous Denial-of-Service',
      keyPoints: ['Internal protocol verification', 'Zero-day exploit neutralizing active firewalls', 'Controlled blackout for hardware upgrade deployment']
    }
  },
  {
    topic: 'BORDER_SECURITY_UAV',
    left: {
      source: 'Humanity First',
      bias: 'LEFT',
      headline: 'Privacy Concerns Mount as Drone Surveillance Expands',
      keyPoints: ['Mass surveillance', 'Civil liberties risk', 'Lack of transparency']
    },
    right: {
      source: 'Nation Guard',
      bias: 'RIGHT',
      headline: 'Advanced UAV Tech Finally Secures Vulnerable Borders',
      keyPoints: ['Safety priority', 'Technological superiority', 'Operational efficiency']
    },
    reconstructed: {
      source: 'RDX_AGENT_01',
      bias: 'REDACTED',
      headline: 'Project Icarus: Deployment of Multi-Spectral Tracking Nodes',
      keyPoints: ['Dual-use for mineral detection', 'Autonomous logic (no human bias)', 'Zero-knowledge tracking established']
    }
  }
]

export function TruthReconstructor() {
  const [index, setIndex] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const current = SAMPLE_DATA[index]

  useEffect(() => {
    const timer = setInterval(() => {
      setAnalyzing(true)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % SAMPLE_DATA.length)
        setAnalyzing(false)
      }, 3000)
    }, 12000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-24 bg-black relative overflow-hidden border-y border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-16 text-center">
          <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.5em] mb-4 block">BIAS_TRIANGULATION_ENGINE</span>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">
             Reconstructing <span className="text-red-500">The Truth</span>
          </h2>
          <p className="text-white/30 text-xs font-mono uppercase tracking-widest max-w-2xl mx-auto">
             RDX cross-references narratives from opposing spectrums to filter ideological distortion and recover the objective reality.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-center">
          
          {/* Left Wing Source */}
          <PerspectiveCard data={current.left as any} isActive={!analyzing} />

          {/* Central Reconstruction Action */}
          <div className="flex flex-col items-center justify-center space-y-8 relative">
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border border-red-500/10 rounded-full animate-ping opacity-20" />
             </div>
             
             <div className="w-20 h-20 bg-red-600 flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(255,0,0,0.4)]">
                {analyzing ? (
                   <div className="w-8 h-8 border-4 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                   <span className="text-2xl font-black text-white">RDX</span>
                )}
             </div>

             <div className="text-center">
                <div className="text-[10px] font-mono text-white/40 uppercase mb-2">Analyzing Discrepancies...</div>
                <div className="flex gap-2 justify-center">
                   <div className={`h-1 w-8 transition-all ${analyzing ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`} />
                   <div className={`h-1 w-8 transition-all ${analyzing ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`} style={{ animationDelay: '0.2s' }} />
                   <div className={`h-1 w-8 transition-all ${analyzing ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`} style={{ animationDelay: '0.4s' }} />
                </div>
             </div>
          </div>

          {/* Right Wing Source */}
          <PerspectiveCard data={current.right as any} isActive={!analyzing} />

        </div>

        {/* Final Result - The Reconstructed Truth */}
        <AnimatePresence mode="wait">
          {!analyzing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-16 p-8 border border-red-500/30 bg-red-600/5 relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-3 text-[9px] font-mono text-red-500/50 uppercase tracking-widest border-l border-b border-red-500/10">
                  RECONSTRUCTION_ID: {current.topic}
               </div>
               <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-12 h-12 flex-shrink-0 bg-red-600 flex items-center justify-center text-white font-black">!</div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">{current.reconstructed.headline}</h3>
                    <div className="grid sm:grid-cols-3 gap-6">
                       {current.reconstructed.keyPoints.map((p, i) => (
                         <div key={i} className="flex flex-col gap-1">
                            <span className="text-[8px] font-mono text-red-500 uppercase tracking-[0.3em]">RECOVERED_DATA_{i+1}</span>
                            <span className="text-[11px] text-white/70 uppercase leading-relaxed">{p}</span>
                         </div>
                       ))}
                    </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  )
}

function PerspectiveCard({ data, isActive }: { data: NewsPerspective, isActive: boolean }) {
  return (
    <div className={`p-6 border transition-all duration-700 h-[240px] flex flex-col justify-between ${
      isActive ? 'border-white/10 bg-white/[0.02]' : 'border-white/5 opacity-40 blur-sm'
    }`}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[9px] font-black px-2 py-0.5 border ${
            data.bias === 'LEFT' ? 'border-blue-500/50 text-blue-500 bg-blue-500/5' : 'border-orange-500/50 text-orange-500 bg-orange-500/5'
          }`}>
            SOURCE_BIAS: {data.bias}
          </span>
          <span className="text-[8px] font-mono text-white/20">{data.source}</span>
        </div>
        <h4 className="text-sm font-black text-white uppercase leading-tight">{data.headline}</h4>
      </div>
      
      <div className="space-y-2">
         {data.keyPoints.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
               <div className="w-1 h-1 bg-white/20" />
               <span className="text-[9px] text-white/40 uppercase tracking-tighter">{p}</span>
            </div>
         ))}
      </div>
    </div>
  )
}
