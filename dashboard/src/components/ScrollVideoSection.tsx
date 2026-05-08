'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'

/**
 * Scroll-driven video.
 *
 * Mobile browsers decode video frames too slowly to scrub via `currentTime`
 * on every scroll event — the result is stuttery. Strategy:
 *   - Desktop: scrub currentTime, smoothed via a spring + rAF lerp loop so
 *     we never set currentTime more than once per animation frame.
 *   - Mobile / coarse pointer / reduced motion: fall back to an autoplaying
 *     muted loop — fluid by construction, no decode thrash.
 */
export function ScrollVideoSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)
  const [useAutoplay, setUseAutoplay] = useState(false)

  // Detect mobile/coarse-pointer/reduced-motion on mount (client only).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mqCoarse = window.matchMedia('(pointer: coarse)')
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const isNarrow  = window.innerWidth < 768
    // On high-end mobiles, we might want to try scrubbing, but for maximum 
    // compatibility/fluidity, we use autoplay if the device is narrow.
    setUseAutoplay(mqCoarse.matches || mqReduce.matches || isNarrow)
  }, [])

  const containerHeight = useAutoplay ? 'h-[120vh]' : 'h-[300vh]'

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Spring-smoothed progress — makes scrubbing feel fluid instead of 1:1 jerky.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping:   28,
    mass:      0.4,
  })

  // rAF loop that lerps the video's currentTime toward the target. Only one
  // currentTime write per frame → the decoder stays happy.
  useEffect(() => {
    if (useAutoplay) return
    const video = videoRef.current
    if (!video) return

    let raf = 0
    let target = 0
    let current = 0

    const unsubscribe = smoothProgress.on('change', (latest) => {
      // Scrub logic: the video should progress exactly with the scroll.
      // We use the full [0, 1] range to avoid "dead scroll" at the end.
      target = latest
    })

    const tick = () => {
      if (video.readyState >= 2 && !isNaN(video.duration) && video.duration > 0) {
        // Slightly higher lerp for better responsiveness
        current += (target - current) * 0.25
        const t = video.duration * current
        if (Math.abs(video.currentTime - t) > 0.01) {
          try { video.currentTime = t } catch { /* ignore if not ready */ }
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

  // When in autoplay fallback, kick playback once metadata is ready.
  useEffect(() => {
    if (!useAutoplay) return
    const video = videoRef.current
    if (!video) return
    const play = () => { video.play().catch(() => { /* ignored */ }) }
    if (video.readyState >= 2) play()
    else video.addEventListener('loadeddata', play, { once: true })
    return () => video.removeEventListener('loadeddata', play)
  }, [useAutoplay])

  return (
    <section ref={containerRef} className={`relative ${containerHeight} w-full bg-black`}>
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-black">
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            src="/videos/videoweb.mp4"
            className="w-full h-full object-cover opacity-80"
            muted
            playsInline
            preload="auto"
            autoPlay={useAutoplay}
            loop={useAutoplay}
            {...({ 'webkit-playsinline': 'true' } as Record<string, string>)}
            disableRemotePlayback
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full">
          <motion.div
            style={{
              opacity: useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
              scale:   useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 1.1]),
              filter:  useTransform(scrollYProgress, (latest) => `blur(${Math.max(0, (latest - 0.8) * 20)}px)`)
            }}
            className="flex flex-col items-center"
          >
            <h2 className="text-4xl sm:text-6xl md:text-9xl font-black text-white tracking-tighter uppercase font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              DECRYPTING <span className="text-red-600 animate-pulse">REALITY</span>
            </h2>
            <p className="mt-8 text-lg md:text-2xl text-gray-400 max-w-3xl font-mono tracking-widest border-l-2 border-red-600 pl-6 bg-black/40 backdrop-blur-sm py-2">
              The truth is hidden in the fragments. Scroll to reveal.
            </p>
          </motion.div>
        </div>

        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none z-20 opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] pointer-events-none z-20 opacity-40" />
        
        {/* Top/Bottom Blending */}
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black to-transparent pointer-events-none z-30" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none z-30" />
      </div>

      <style jsx>{`
        video {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000;
          will-change: transform;
        }
      `}</style>
    </section>
  )
}
