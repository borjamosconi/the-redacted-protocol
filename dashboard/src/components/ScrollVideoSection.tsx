'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'

export function ScrollVideoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const [useAutoplay, setUseAutoplay] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mqCoarse = window.matchMedia('(pointer: coarse)')
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const isNarrow  = window.innerWidth < 768
    setUseAutoplay(mqCoarse.matches || mqReduce.matches || isNarrow)
  }, [])

  const containerHeight = useAutoplay ? 'h-[120vh]' : 'h-[400vh]'

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping:   30,
    mass:      0.5,
  })

  useEffect(() => {
    if (useAutoplay) return
    const video = videoRef.current
    if (!video) return

    let raf = 0
    let target = 0
    let current = 0

    const unsubscribe = smoothProgress.on('change', (latest) => {
      target = latest
    })

    const tick = () => {
      if (video.readyState >= 2 && !isNaN(video.duration) && video.duration > 0) {
        current += (target - current) * 0.2
        const t = video.duration * current
        if (Math.abs(video.currentTime - t) > 0.01) {
          try { video.currentTime = t } catch { /* ignore */ }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      unsubscribe()
    }
  }, [smoothProgress, useAutoplay])

  useEffect(() => {
    if (!useAutoplay) return
    const video = videoRef.current
    if (!video) return
    const play = () => { video.play().catch(() => {}) }
    if (video.readyState >= 2) play()
    else video.addEventListener('loadeddata', play, { once: true })
    return () => video.removeEventListener('loadeddata', play)
  }, [useAutoplay])

  const titleOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const titleScale   = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.2])
  const videoBlur    = useTransform(scrollYProgress, [0.8, 1], [0, 20])

  return (
    <section ref={containerRef} className={`relative ${containerHeight} w-full bg-black cinematic-container`}>
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-black">
        
        {/* Video Canvas */}
        <motion.div 
          style={{ filter: useTransform(videoBlur, (v) => `blur(${v}px)`) }}
          className="absolute inset-0 z-0"
        >
          <video
            ref={videoRef}
            src="/videos/videoweb.mp4"
            className="w-full h-full object-cover opacity-60"
            muted
            playsInline
            preload="auto"
            autoPlay={useAutoplay}
            loop={useAutoplay}
            {...({ 'webkit-playsinline': 'true' } as Record<string, string>)}
            disableRemotePlayback
          />
        </motion.div>

        {/* HUD Content */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 w-full">
          <motion.div
            style={{ opacity: titleOpacity, scale: titleScale }}
            className="flex flex-col items-center space-y-8"
          >
            <div className="badge-premium mb-4">Sequence_Protocol_v04</div>
            <h2 className="text-5xl md:text-9xl font-black text-white tracking-tighter uppercase italic leading-none">
              Decrypting_<span className="text-red-600">The_Void</span>
            </h2>
            <div className="w-1 h-24 bg-gradient-to-b from-red-600 to-transparent" />
            <p className="max-w-xl text-xs md:text-sm font-mono text-white/40 uppercase tracking-[0.4em] leading-relaxed">
              Every scroll cycle processes 2.4TB of classified metadata. 
              The truth is no longer a privilege.
            </p>
          </motion.div>
        </div>

        {/* Cinematic Elements */}
        <div className="cinematic-overlay" />
        <div className="absolute inset-x-0 top-0 h-24 bg-black z-30" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-black z-30" />
        
        {/* HUD Corners */}
        <div className="absolute top-24 left-12 w-12 h-12 border-t border-l border-red-600/40 z-40" />
        <div className="absolute top-24 right-12 w-12 h-12 border-t border-r border-red-600/40 z-40" />
        <div className="absolute bottom-24 left-12 w-12 h-12 border-b border-l border-red-600/40 z-40" />
        <div className="absolute bottom-24 right-12 w-12 h-12 border-b border-r border-red-600/40 z-40" />
      </div>

      <style jsx>{`
        video {
          transform: translateZ(0);
          will-change: transform;
        }
      `}</style>
    </section>
  )
}
