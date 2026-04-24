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
    const mqCoarse  = window.matchMedia('(pointer: coarse)')
    const mqReduce  = window.matchMedia('(prefers-reduced-motion: reduce)')
    const isNarrow  = window.innerWidth < 768
    setUseAutoplay(mqCoarse.matches || mqReduce.matches || isNarrow)
  }, [])

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
      // Speed up scrub 2×, capped at 1.
      target = Math.min(latest * 2, 1)
    })

    const tick = () => {
      if (video.readyState >= 2 && !isNaN(video.duration) && video.duration > 0) {
        // Lerp toward target so rapid scrolls don't thrash the decoder.
        current += (target - current) * 0.18
        const t = video.duration * current
        // Avoid redundant sub-millisecond writes.
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
    <section ref={containerRef} className="relative h-[300vh] w-full bg-black">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          src="/videos/videoweb.mp4"
          className="absolute inset-0 w-full h-full object-cover opacity-100"
          muted
          playsInline
          preload="auto"
          autoPlay={useAutoplay}
          loop={useAutoplay}
          // iOS hints for smoother inline playback
          // @ts-expect-error non-standard but respected by webkit
          webkit-playsinline="true"
          disableRemotePlayback
        />

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
          <motion.h2
            className="text-4xl sm:text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 tracking-tighter uppercase font-mono"
            style={{
              opacity: useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
              scale:   useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1.2]),
            }}
          >
            DECRYPTING <span className="text-red-500">REALITY</span>
          </motion.h2>
          <motion.p
            className="mt-6 text-lg md:text-2xl text-gray-400 max-w-2xl font-mono tracking-widest"
            style={{
              opacity: useTransform(scrollYProgress, [0.3, 0.5, 0.8, 1], [0, 1, 1, 0]),
              y:       useTransform(scrollYProgress, [0.3, 0.5], [50, 0]),
            }}
          >
            The truth is hidden in the fragments. Scroll to reveal.
          </motion.p>
        </div>

        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-20" />
      </div>
    </section>
  )
}
