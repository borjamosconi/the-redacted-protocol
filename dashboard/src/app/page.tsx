'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { LaunchCountdown } from '@/components/LaunchCountdown'

/* ─── HELPER: DYNAMIC TEXT SCRAMBLER ─── */
function ScramblerText({ text, delay = 0, triggerOnHover = false }: { text: string; delay?: number; triggerOnHover?: boolean }) {
  const [displayText, setDisplayText] = useState(text)
  const [isHovered, setIsHovered] = useState(false)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&!?=+{}[]<>'

  const runScramble = useCallback(() => {
    let active = true
    let iteration = 0
    const interval = setInterval(() => {
      if (!active) return
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' '
            if (index < iteration) return text[index]
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join('')
      )
      iteration += 1.5
      if (iteration >= text.length + 4) {
        clearInterval(interval)
        setDisplayText(text)
      }
    }, 25)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [text])

  useEffect(() => {
    const timeout = setTimeout(runScramble, delay)
    return () => clearTimeout(timeout)
  }, [runScramble, delay])

  useEffect(() => {
    if (isHovered && triggerOnHover) {
      runScramble()
    }
  }, [isHovered, triggerOnHover, runScramble])

  return (
    <span 
      className="font-mono cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {displayText}
    </span>
  )
}

/* ─── CINEMATIC GATE: Full-screen decrypt experience ─── */
function CinematicGate({ onUnlock }: { onUnlock: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'decrypting' | 'unlocked'>('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [glitchText, setGlitchText] = useState('AUTHORIZATION_REQUIRED')
  const [decryptLines, setDecryptLines] = useState<string[]>([])
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@%&!?=+{}[]<>'

  const scramble = useCallback((target: string, cb?: () => void) => {
    let i = 0
    const id = setInterval(() => {
      setGlitchText(
        target
          .split('')
          .map((c, idx) => (c === ' ' ? ' ' : idx < i ? target[idx] : chars[Math.floor(Math.random() * chars.length)]))
          .join('')
      )
      i += 2
      if (i > target.length + 4) {
        clearInterval(id)
        setGlitchText(target)
        cb?.()
      }
    }, 25)
  }, [])

  const startSequence = () => {
    if (phase !== 'idle') return
    setPhase('scanning')

    // Phase 1: scanning bar
    let p = 0
    const scanId = setInterval(() => {
      p += Math.random() * 4 + 1
      if (p >= 100) {
        p = 100
        clearInterval(scanId)
        setScanProgress(100)
        // Phase 2: decrypt logs
        setTimeout(() => {
          setPhase('decrypting')
          scramble('DECRYPTION_IN_PROGRESS', () => {
            const lines = [
              '> CONNECTING TO SOLANA_MAINNET ...',
              '> FETCHING REDACTED DOCUMENT INDEX ...',
              '> HANDSHAKE COMPLETE // NODE_1204 VERIFIED',
              '> LOADING AI CONSENSUS MODULE ...',
              '> OPERATOR CLEARANCE: LEVEL-A GRANTED',
              '> DECRYPTING ARCHIVE PAYLOAD ...',
              '> STATUS: ALL SYSTEMS NOMINAL',
              '> OPENING SECURE CHANNEL ...',
            ]
            let li = 0
            const logId = setInterval(() => {
              setDecryptLines(prev => [...prev, lines[li]])
              li++
              if (li >= lines.length) {
                clearInterval(logId)
                setTimeout(() => {
                  scramble('ACCESS_GRANTED', () => {
                    setPhase('unlocked')
                    setTimeout(onUnlock, 800)
                  })
                }, 400)
              }
            }, 220)
          })
        }, 400)
      }
      setScanProgress(p)
    }, 40)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[500] bg-black flex items-center justify-center overflow-hidden"
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Scanline */}
      {phase !== 'idle' && (
        <motion.div
          animate={{ top: ['-5%', '105%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 w-full h-[2px] bg-red-500/30 pointer-events-none z-10"
        />
      )}

      {/* Screen CRT Flicker & Noise overlay */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-30 animate-[glitch-flash_6s_infinite]" />

      <div className="relative z-10 w-full max-w-xl px-8 flex flex-col items-center text-center">

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="w-20 h-20 border border-white/10 mb-10 relative overflow-hidden"
        >
          <img src="/logo.png" alt="REDACTED" className="w-full h-full object-cover grayscale" />
          <div className="absolute inset-0 bg-red-950/20" />
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-500" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-500" />
        </motion.div>

        {/* Glitch title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-3xl sm:text-5xl font-black uppercase tracking-wider mb-4 text-white"
        >
          THE REDACTED PROTOCOL
        </motion.h1>

        {/* Status text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={`font-mono text-[11px] font-bold tracking-[0.4em] uppercase mb-10 transition-colors duration-300 ${
            phase === 'unlocked' ? 'text-green-500' : phase === 'decrypting' ? 'text-yellow-500' : 'text-red-500'
          }`}
        >
          {glitchText}
        </motion.div>

        {/* IDLE: Big unlock button */}
        {phase === 'idle' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            onClick={startSequence}
            className="group relative px-12 py-5 border-2 border-red-600/50 bg-red-600/5 hover:bg-red-600 text-red-500 hover:text-white font-mono text-xs font-black tracking-[0.4em] uppercase transition-all duration-500 overflow-hidden"
          >
            <span className="relative z-10">INITIALIZE DECRYPTION</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500" />
          </motion.button>
        )}

        {/* SCANNING: Progress bar */}
        {phase === 'scanning' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <div className="flex items-center justify-between text-[9px] text-white/30 font-mono tracking-widest uppercase mb-3">
              <span>BIOMETRIC_SCAN</span>
              <span className="text-red-500 font-black">{Math.round(scanProgress)}%</span>
            </div>
            <div className="w-full h-1 bg-white/5 overflow-hidden">
              <motion.div
                className="h-full bg-red-600 shadow-[0_0_15px_rgba(255,0,0,0.5)]"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* DECRYPTING: Terminal output */}
        {(phase === 'decrypting' || phase === 'unlocked') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full border border-white/5 bg-black/80 p-5 text-left max-h-[240px] overflow-y-auto no-scrollbar"
          >
            {decryptLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="font-mono text-[10px] text-green-400/80 leading-relaxed tracking-wider"
              >
                {line}
              </motion.div>
            ))}
            {phase === 'unlocked' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-3 font-mono text-[11px] text-white font-black tracking-widest animate-pulse"
              >
                {'>'} WELCOME, OPERATOR_
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Subtle footer line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 text-[8px] text-white/15 font-mono uppercase tracking-[0.4em]"
        >
          SOLANA_BLOCKCHAIN // ARWEAVE_PERMANENT // v2.1.0
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ─── MAIN HOMEPAGE ─── */
export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const isDecrypted = sessionStorage.getItem('redacted_decrypted') === 'true'
      if (isDecrypted) {
        setGateOpen(true)
      }
    }
  }, [])

  const handleUnlock = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('redacted_decrypted', 'true')
    }
    setGateOpen(true)
  }

  if (!mounted) return <div className="bg-black min-h-screen" />

  return (
    <>
      {/* Cinematic Gate Overlay */}
      <AnimatePresence>
        {!gateOpen && <CinematicGate onUnlock={handleUnlock} />}
      </AnimatePresence>

      {/* Main page (revealed after gate) */}
      <HomeContent visible={gateOpen} />
    </>
  )
}

/* ─── GLITCH TITLE COMPONENT (Razor Sharp vector glitch, NO blurry text-shadow) ─── */
function GlitchTitle({ text }: { text: string }) {
  return (
    <h1
      className="glitch-title text-3xl sm:text-7xl md:text-8xl lg:text-[7rem] font-black tracking-tighter uppercase leading-[0.9] relative"
      data-text={text}
    >
      {text}
      <style jsx>{`
        .glitch-title {
          position: relative;
          color: #ffffff;
          text-shadow: none; /* Flat cyberpunk aesthetic, NO blur glow */
          animation: glitch-skew 3s infinite linear alternate-reverse;
        }
        .glitch-title::before,
        .glitch-title::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          text-shadow: none;
        }
        .glitch-title::before {
          color: #ff003c; /* Sharp flat red offset */
          animation: glitch-anim-1 2s infinite linear alternate-reverse;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          z-index: -1;
        }
        .glitch-title::after {
          color: #00ffc4; /* Sharp flat cyan offset */
          animation: glitch-anim-2 1.5s infinite linear alternate-reverse;
          clip-path: polygon(0 60%, 100% 60%, 100% 100%, 0 100%);
          z-index: -1;
        }
        @keyframes glitch-anim-1 {
          0% { transform: translate(0); }
          20% { transform: translate(-3px, 2px); }
          40% { transform: translate(-3px, -2px); }
          60% { transform: translate(3px, 2px); }
          80% { transform: translate(3px, -2px); }
          100% { transform: translate(0); }
        }
        @keyframes glitch-anim-2 {
          0% { transform: translate(0); }
          20% { transform: translate(3px, -2px); }
          40% { transform: translate(3px, 2px); }
          60% { transform: translate(-3px, -2px); }
          80% { transform: translate(-3px, 2px); }
          100% { transform: translate(0); }
        }
        @keyframes glitch-skew {
          0% { transform: skew(0deg); }
          2% { transform: skew(0.4deg); }
          4% { transform: skew(0deg); }
          30% { transform: skew(0deg); }
          32% { transform: skew(-0.3deg); }
          34% { transform: skew(0deg); }
          80% { transform: skew(0deg); }
          82% { transform: skew(0.5deg); }
          84% { transform: skew(0deg); }
          100% { transform: skew(0deg); }
        }
      `}</style>
    </h1>
  )
}

function HomeContent({ visible }: { visible: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const { scrollYProgress } = useScroll()

  // Real-time changing diagnostic details in corners
  const [latency, setLatency] = useState(14)
  const [proofPercentage, setProofPercentage] = useState(99.1)
  const [threatLevel, setThreatLevel] = useState('0.00%')

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 8 + 10))
      setProofPercentage(parseFloat((99.0 + Math.random() * 0.9).toFixed(2)))
      setThreatLevel((Math.random() * 0.05).toFixed(2) + '%')
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleInteraction = () => {
      if (videoRef.current) {
        videoRef.current.muted = false
        setIsMuted(false)
        videoRef.current.play().catch(() => {})
      }
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }

    window.addEventListener('click', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)
    window.addEventListener('keydown', handleInteraction)

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [])

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 20,
    mass: 0.8
  })

  // Hero section motion scroll animations
  const heroOpacity = 1
  const heroScale = useTransform(smoothProgress, [0, 0.2], [1, 0.9])
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, -100])

  // Sections animations (solid, no scroll opacity fade)
  const mechanicsOpacity = 1
  const mechanicsY = useTransform(smoothProgress, [0.12, 0.35], [100, 0])

  const nftOpacity = 1
  const nftY = useTransform(smoothProgress, [0.4, 0.6], [100, 0])

  const ctaOpacity = 1
  const ctaY = useTransform(smoothProgress, [0.7, 0.9], [60, 0])

  // 3D perspective transforms for the video on scroll
  const videoRotateX = useTransform(smoothProgress, [0, 0.3], [0, 15])
  const videoRotateY = useTransform(smoothProgress, [0, 0.3], [0, -5])
  const videoScale = useTransform(smoothProgress, [0, 0.3], [1, 0.95])
  const videoZ = useTransform(smoothProgress, [0, 0.3], [0, -50])

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 1.2, delay: 0.2 }}
      className="bg-black text-white relative font-mono overflow-x-hidden selection:bg-red-600 selection:text-white antialiased"
    >
      {/* ── TECHNICAL BACKGROUND GRID ── */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-40" />

      {/* Screen CRT Flicker & Noise overlay */}
      <div className="fixed inset-0 bg-black/40 pointer-events-none z-[95] animate-[glitch-flash_8s_infinite] opacity-5 select-none" />

      {/* Scanlines over everything */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[size:100%_4px] z-[90] pointer-events-none opacity-[0.05]" />

      {/* Fixed corner HUD brackets - responsive on phone */}
      <div className="fixed top-3 left-3 w-4 h-4 sm:top-6 sm:left-6 sm:w-6 sm:h-6 border-t border-l border-red-500/30 z-[80] pointer-events-none" />
      <div className="fixed top-3 right-3 w-4 h-4 sm:top-6 sm:right-6 sm:w-6 sm:h-6 border-t border-r border-red-500/30 z-[80] pointer-events-none" />
      <div className="fixed bottom-3 left-3 w-4 h-4 sm:bottom-6 sm:left-6 sm:w-6 sm:h-6 border-b border-l border-red-500/30 z-[80] pointer-events-none" />
      <div className="fixed bottom-3 right-3 w-4 h-4 sm:bottom-6 sm:right-6 sm:w-6 sm:h-6 border-b border-r border-red-500/30 z-[80] pointer-events-none" />

      {/* Dynamic Diagnostic Corner HUD widgets */}
      <div className="fixed top-24 left-6 hidden xl:flex flex-col gap-1 font-mono text-[7px] text-white/30 uppercase tracking-[0.2em] z-[80] pointer-events-none select-none">
        <span>[ NODE: 1204 ]</span>
        <span>[ LATENCY: {latency}MS ]</span>
        <span>[ BUFFER: {proofPercentage}% ]</span>
      </div>

      <div className="fixed top-24 right-6 hidden xl:flex flex-col gap-1 font-mono text-[7px] text-white/30 uppercase tracking-[0.2em] z-[80] pointer-events-none select-none text-right">
        <span>[ STATUS: ACTIVE ]</span>
        <span>[ THREAT: {threatLevel} ]</span>
        <span>[ DECRYPT_KEY: AUTO ]</span>
      </div>

      {/* Fixed bottom HUD */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[7px] text-white/20 font-mono uppercase tracking-[0.35em] z-[80] pointer-events-none select-none">
        <span>OPERATOR_FEED</span>
        <span className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
        <span>INTERCEPT_MODE</span>
      </div>

      <Header />

      {/* ── STAGE 1: HERO ── */}
      <section className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 pt-20 pb-10 sm:pt-28 sm:pb-16 z-20">
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="max-w-5xl w-full flex flex-col items-center text-center z-10 [perspective:1200px]"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-red-600/20 bg-black/50 backdrop-blur-sm text-[9px] tracking-[0.3em] text-red-500 uppercase mb-8 rounded-sm">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
            <ScramblerText text="PROTOCOL_ACTIVE" />
          </div>

          <GlitchTitle text="THE REDACTED PROTOCOL" />

          <p className="text-[10px] sm:text-sm text-white/60 max-w-xl leading-relaxed uppercase tracking-[0.25em] mt-5 mb-8 sm:mt-8 sm:mb-10 not-italic">
            <ScramblerText text="Autonomous decentralized system for document declassification on Solana." delay={400} />
          </p>

          {/* Floated Contained Video Screen - fully visible, smaller, framed nicely with 3D tilt effect on scroll */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            style={{
              rotateX: videoRotateX,
              rotateY: videoRotateY,
              scale: videoScale,
              z: videoZ,
              transformStyle: "preserve-3d"
            }}
            className="w-full max-w-3xl aspect-video border border-white/10 hover:border-red-500/30 transition-colors bg-black/80 rounded-sm relative overflow-hidden mb-8 sm:mb-12 shadow-[0_0_40px_rgba(0,0,0,0.8)]"
          >
            {/* Tech HUD indicators */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-red-500/50 z-10" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-red-500/50 z-10" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-red-500/50 z-10" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-red-500/50 z-10" />
            
            <div className="absolute top-2 left-4 text-[6px] text-white/40 tracking-[0.2em] z-10 font-mono uppercase">
              FEED_ID // CND-8043
            </div>
            <div className="absolute top-2 right-4 text-[6px] text-red-500 tracking-[0.25em] z-10 font-mono uppercase flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
              LIVE_STREAM
            </div>

            <video
              ref={videoRef}
              src="/videos/videoweb.mp4"
              className="w-full h-full object-contain"
              muted={isMuted}
              playsInline
              autoPlay
              loop
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-col items-center justify-center mb-8 sm:mb-12 w-full"
          >
            <span className="block text-[8.5px] text-red-500 font-bold uppercase tracking-[0.4em] mb-6 not-italic font-mono">
              [ SECUENCIA_DE_LIBERACION_ACTIVA ]
            </span>
            
            <LaunchCountdown />

            {/* GitHub Repo Link */}
            <div className="mt-8 flex justify-center">
              <a 
                href="https://github.com/whalesconspiracy-33/the-redacted-protocol" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-outline px-8 py-3.5 flex items-center gap-2.5 text-[9.5px] font-mono tracking-widest uppercase hover:border-white transition-all duration-300 rounded-sm"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                SOURCE_CODE // GITHUB
              </a>
            </div>
          </motion.div>

          <div className="text-[9px] text-white/40 uppercase tracking-[0.4em] animate-pulse not-italic">
            [ SCROLL TO RECONSTRUCT DATA ]
          </div>
        </motion.div>
      </section>

      {/* ── STAGE 2: HOW IT WORKS ── */}
      <section className="relative z-20 w-full py-16 sm:py-32 px-4 sm:px-6">
        <motion.div
          style={{ opacity: mechanicsOpacity, y: mechanicsY }}
          className="max-w-5xl mx-auto relative z-10"
        >
          <div className="text-center max-w-xl mx-auto mb-12 sm:mb-20">
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-[0.4em] not-italic">// PROTOCOL OVERVIEW</span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mt-3 mb-4">
              HOW THE SYSTEM WORKS
            </h2>
            <p className="text-[10px] sm:text-xs text-white/40 uppercase tracking-[0.2em] leading-relaxed not-italic">
              Decentralized censorship-resistant pipeline on Solana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12 sm:mb-20">
            {[
              {
                num: '01',
                title: 'AI-Powered Declassification',
                desc: 'Our consensus-based AI models scan news feeds and loaded documents to detect censorship, decrypting redacted words to restore clear, readable archives.'
              },
              {
                num: '02',
                title: 'Permanent Solana Archiving',
                desc: 'Declassified file hashes, audit logs, and verification data are stored permanently on Arweave and anchored to the Solana blockchain, preventing any future modification.'
              },
              {
                num: '03',
                title: 'Decentralized Economy',
                desc: 'Launched fairly on Pump.fun, the utility token supports the platform. Fees fund decentralized file storage, while holding the token allows priority document declassification.'
              }
            ].map((item, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                key={i}
                className="p-8 border border-white/10 bg-black/55 backdrop-blur-xl hover:bg-black/85 hover:border-red-500/40 transition-all duration-300 relative group overflow-hidden rounded-sm"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-red-500/30 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                <div className="text-[10px] text-red-500 font-bold mb-4 not-italic">// {item.num}</div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white mb-3 group-hover:text-red-500 transition-colors not-italic">
                  <ScramblerText text={item.title} triggerOnHover />
                </h3>
                <p className="text-[10.5px] sm:text-xs text-white/40 leading-relaxed uppercase tracking-wider font-mono not-italic">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="border border-white/10 bg-black/55 backdrop-blur-xl p-6 sm:p-10 relative overflow-hidden rounded-sm"
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-500" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-500" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-500" />

            <span className="text-[9px] text-red-500 font-bold uppercase tracking-[0.4em] mb-6 sm:mb-8 block not-italic">// INTEGRATED TELEGRAM RELAYS</span>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 not-italic">Telegram Group</h4>
                <p className="text-[10.5px] sm:text-xs text-white/40 leading-relaxed uppercase tracking-wider font-mono not-italic">
                  Public intelligence room where members and researchers collaborate, share news reports, discuss document leaks, and coordinate analysis with operators.
                </p>
              </div>
              <a 
                href="https://t.me/theredactedprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-premium px-8 py-4 whitespace-nowrap not-italic w-full md:w-auto text-center"
              >
                JOIN TELEGRAM GROUP //
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── STAGE 3: NFT ── */}
      <section className="relative z-20 w-full py-16 sm:py-32 px-4 sm:px-6">
        <motion.div
          style={{ opacity: nftOpacity, y: nftY }}
          className="max-w-5xl mx-auto"
        >
          <div className="flex items-center justify-between mb-8 sm:mb-12">
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-red-500 font-black uppercase tracking-[0.4em] not-italic">NFT COLLECTION</span>
              <span className="px-2 py-0.5 border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-[8px] font-mono tracking-widest uppercase rounded-sm animate-pulse not-italic">COMING SOON</span>
            </div>
            <div className="flex-1 h-[1px] bg-white/5 ml-6" />
          </div>

          <p className="text-xs text-white/50 max-w-xl mb-8 sm:mb-12 leading-relaxed uppercase tracking-wider not-italic">
            Exclusive collection of redacted AI avatars granting Level-A operator privileges, priority access, and premium decrypter keycards.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { src: '/images/nfts/nft1.jpg', tag: 'OPERATOR_ALIEN' },
              { src: '/images/nfts/nft2.jpg', tag: 'CLASSIFIED_AGENT' },
              { src: '/images/nfts/nft3.jpg', tag: 'CYBER_HUMAN' },
              { src: '/images/nfts/nft4.jpg', tag: 'REDACTED_MONKEY' },
              { src: '/images/nfts/nft5.jpg', tag: 'PHARAOH_INTEL' },
            ].map((nft, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                key={idx}
                className="group relative border border-white/10 bg-black/60 backdrop-blur-md overflow-hidden flex flex-col p-3 hover:border-red-500/50 transition-all duration-300 hover:scale-[1.02] rounded-sm"
              >
                <div className="relative w-full aspect-square overflow-hidden mb-3 border border-white/5 bg-red-950/5 rounded-sm">
                  <img
                    src={nft.src}
                    alt={nft.tag}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
                <div className="w-full flex items-center justify-between text-[8px] text-white/30 font-mono tracking-widest uppercase">
                  <span>{nft.tag}</span>
                  <span className="text-red-500 group-hover:animate-pulse">CLASSIFIED</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── STAGE 4: CTA ── */}
      <section className="relative z-20 w-full py-16 sm:py-32 px-4 sm:px-6">
        <motion.div
          style={{ opacity: ctaOpacity, y: ctaY }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="border border-white/10 bg-black/60 backdrop-blur-2xl p-12 sm:p-16 rounded-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-red-500" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-red-500" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-red-500" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-red-500" />

            <h2 className="text-3xl sm:text-6xl font-black tracking-tighter uppercase mb-6 leading-[0.9]">
              ENTER THE PORTAL
            </h2>
            <p className="text-xs sm:text-sm text-white/40 max-w-lg mx-auto uppercase tracking-wider mb-12 leading-relaxed not-italic">
              Initialize your operator key and explore declassified datasets on Solana.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              <Link href="/dashboard" className="px-10 py-5 bg-red-600 hover:bg-white text-white hover:text-black font-black uppercase tracking-widest text-xs transition-all duration-300 w-full sm:w-auto text-center rounded-sm not-italic">
                LAUNCH CONSOLE //
              </Link>
              <Link href="/terminal" className="px-10 py-5 border border-white/15 hover:border-red-500 bg-black/40 text-white/60 hover:text-white font-black uppercase tracking-widest text-xs transition-all w-full sm:w-auto text-center rounded-sm not-italic">
                VIEW TERMINAL //
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Global CSS for flicker glitches */}
      <style jsx global>{`
        @keyframes glitch-flash {
          0% { opacity: 0.03; }
          48% { opacity: 0.03; }
          49% { opacity: 0.12; }
          50% { opacity: 0.04; }
          51% { opacity: 0.03; }
          88% { opacity: 0.03; }
          89% { opacity: 0.15; }
          90% { opacity: 0.06; }
          91% { opacity: 0.03; }
          100% { opacity: 0.03; }
        }
      `}</style>

      <div className="relative z-20">
        <Footer />
      </div>
    </motion.div>
  )
}
