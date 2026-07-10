'use client'

import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text)
  useEffect(() => {
    const chars = '█▓▒░$/#@'
    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) { setDisplay(text); clearInterval(interval); return }
      setDisplay(text.split('').map((c, idx) => idx < i ? c : chars[Math.floor(Math.random() * chars.length)]).join(''))
      i += 1
    }, 60)
    return () => clearInterval(interval)
  }, [text])
  return <span className={className}>{display}</span>
}

function CinematicOverlay() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
       <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-80" />
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
       <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />
       <div className="scanline" />
    </div>
  )
}

const FEATURED = [
  { label: 'MARS BLUEPRINTS', ticker: '$MARS', price: '+1242%', color: '#ff1a1a' },
  { label: 'EPSTEIN LOGS',   ticker: '$EPST', price: '+584%', color: '#ff1a1a' },
  { label: 'ANTARCTICA ICE', ticker: '$ICE',  price: '+2132%', color: '#f97316' },
  { label: 'UFO BRIEFINGS',  ticker: '$UAP',  price: '+841%', color: '#a855f7' },
  { label: 'QUANTUM DATA',   ticker: '$QTUM', price: '+493%', color: '#22d3ee' },
]

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const opOut = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scaleOut = useTransform(scrollYProgress, [0, 0.5], [1, 1.1])
  
  const [activeStat, setActiveStat] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveStat(s => (s + 1) % FEATURED.length), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <section ref={ref} className="relative w-full h-screen overflow-hidden bg-black flex flex-col justify-center items-center">
      
      {/* ── Background: Immersive Video ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0 scale-105">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-40 brightness-50"
          src="/videos/videoweb.mp4"
        />
        <CinematicOverlay />
      </div>

      {/* ── Branding / Technical HUD ─────────────────────────────────────── */}
      <motion.div 
        style={{ opacity: opOut, scale: scaleOut }}
        className="relative z-20 w-full max-w-[1400px] px-8 flex flex-col items-center"
      >
        <div className="flex items-center gap-4 mb-8">
           <div className="h-[1px] w-12 bg-red-600/30" />
           <span className="text-[10px] font-mono text-red-600 tracking-[1em] uppercase font-black">PROTOCOLO_DE_SEGURIDAD_ACTIVO</span>
           <div className="h-[1px] w-12 bg-red-600/30" />
        </div>

        <h1 className="text-6xl md:text-[10rem] lg:text-[12rem] font-black text-white tracking-[-0.06em] leading-[0.8] uppercase italic text-center drop-shadow-[0_0_50px_rgba(255,0,0,0.2)]">
          Verdad_<span className="text-red-600 animate-rgb">Decodificada</span>
        </h1>

        <div className="mt-12 max-w-2xl text-center space-y-8">
          <p className="text-xs md:text-sm font-mono text-white/40 uppercase tracking-[0.3em] leading-relaxed">
            Triangulación neuronal autónoma de información suprimida. 
            <span className="text-white"> Recuperando fragmentos</span> de la historia 
            <span className="text-red-600"> en la blockchain de Solana</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <Link href="/dashboard" className="btn-premium group w-full sm:w-auto">
              <span>🔓 Iniciar_Consola</span>
            </Link>
            <a href="/terminal" className="btn-outline group w-full sm:w-auto">
              <span>🔬 Ver_Terminal</span>
            </a>
          </div>
        </div>

        {/* Dynamic Status Bar */}
        <div className="absolute bottom-[-15vh] w-full border-t border-white/5 bg-black/40 backdrop-blur-md h-16 flex items-center overflow-hidden">
           <div className="flex items-center gap-12 animate-ticker whitespace-nowrap">
              {[...FEATURED, ...FEATURED].map((item, idx) => (
                <div key={idx} className="flex items-center gap-6">
                   <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">{item.label}</span>
                   <span className="text-[10px] font-black text-red-600">{item.ticker}</span>
                   <span className="text-[10px] font-black text-green-500">{item.price}</span>
                   <div className="w-1 h-1 bg-red-600/40 rotate-45" />
                </div>
              ))}
           </div>
        </div>
      </motion.div>

      {/* Viewport HUD Corners */}
      <div className="absolute top-12 left-12 w-12 h-12 border-t border-l border-white/10 z-30" />
      <div className="absolute top-12 right-12 w-12 h-12 border-t border-r border-white/10 z-30" />
      <div className="absolute bottom-12 left-12 w-12 h-12 border-b border-l border-white/10 z-30" />
      <div className="absolute bottom-12 right-12 w-12 h-12 border-b border-r border-white/10 z-30" />

      {/* Technical Data Overlay */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-8 items-end pointer-events-none z-20">
         <div className="text-right space-y-1">
            <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest block">Confianza_Neuronal</span>
            <span className="text-xs font-black text-white">99.98%</span>
         </div>
         <div className="text-right space-y-1">
            <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest block">Secuencia_Activa</span>
            <span className="text-xs font-black text-red-600 animate-pulse">04:29:12:08</span>
         </div>
      </div>

      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 25s linear infinite;
        }
      `}</style>
    </section>
  )
}
