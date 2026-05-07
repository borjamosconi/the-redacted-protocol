'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const TARGET_DATE = new Date('2026-05-22T00:00:00Z').getTime()

export function LaunchCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => {
      const now = Date.now()
      const diff = TARGET_DATE - now
      
      if (diff <= 0) {
        clearInterval(timer)
        return
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex gap-2 sm:gap-4 justify-center">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Sec', value: timeLeft.seconds },
      ].map((unit, i) => (
        <motion.div 
          key={unit.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rd-card p-3 sm:p-5 min-w-[70px] sm:min-w-[110px] border-red-500/20 bg-gradient-to-b from-red-500/10 to-transparent backdrop-blur-md relative overflow-hidden group"
        >
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,0,0,0.05)_50%)] bg-[size:100%_4px] pointer-events-none" />
          
          <div className="relative z-10 text-2xl sm:text-4xl font-black text-white font-mono group-hover:text-red-500 transition-colors">
            {String(unit.value).padStart(2, '0')}
          </div>
          <div className="relative z-10 text-[8px] sm:text-[10px] text-red-500/60 uppercase tracking-widest font-bold mt-1">
            {unit.label}
          </div>

          {/* Glitch decoration */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-red-500/30 overflow-hidden">
             <motion.div 
               animate={{ x: ['-100%', '100%'] }} 
               transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
               className="w-1/2 h-full bg-red-500 shadow-[0_0_10px_#ff1a1a]" 
             />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
