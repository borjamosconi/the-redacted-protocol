'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const TARGET_DATE = new Date('2026-08-09T18:00:00Z').getTime()

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
    <div className="flex gap-1.5 sm:gap-6 justify-center select-none w-full max-w-full px-2">
      {[
        { label: 'DÍAS', value: timeLeft.days, code: 'DD' },
        { label: 'HORAS', value: timeLeft.hours, code: 'HH' },
        { label: 'MINUTOS', value: timeLeft.minutes, code: 'MM' },
        { label: 'SEGUNDOS', value: timeLeft.seconds, code: 'SS' },
      ].map((unit, i) => (
        <motion.div 
          key={unit.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rd-card p-2 sm:p-7 min-w-[68px] sm:min-w-[130px] flex-1 sm:flex-initial border border-red-500/20 bg-black/80 backdrop-blur-md relative overflow-hidden group hover:border-red-500/60 transition-all duration-300 text-center"
        >
          {/* Micro HUD corner brackets for each unit */}
          <div className="absolute top-1 left-1 w-1 sm:w-1.5 h-1 sm:h-1.5 border-t border-l border-red-500/40" />
          <div className="absolute top-1 right-1 w-1 sm:w-1.5 h-1 sm:h-1.5 border-t border-r border-red-500/40" />
          <div className="absolute bottom-1 left-1 w-1 sm:w-1.5 h-1 sm:h-1.5 border-b border-l border-red-500/40" />
          <div className="absolute bottom-1 right-1 w-1 sm:w-1.5 h-1 sm:h-1.5 border-b border-r border-red-500/40" />
          
          <div className="absolute top-1 right-1.5 font-mono text-[5px] sm:text-[6px] text-white/10 hidden sm:block">{unit.code}</div>

          <div className="relative z-10 text-xl sm:text-5xl font-black text-red-500 font-mono tracking-wider transition-colors duration-300 group-hover:text-white leading-none sm:leading-normal">
            {String(unit.value).padStart(2, '0')}
          </div>
          <div className="relative z-10 text-[6.5px] sm:text-[9px] text-white/40 uppercase tracking-[0.15em] font-black mt-1 sm:mt-2 font-mono">
            {unit.label}
          </div>

          {/* Glitch decoration bottom line */}
          <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-red-500/10 overflow-hidden">
             <motion.div 
               animate={{ x: ['-100%', '100%'] }} 
               transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
               className="w-1/3 h-full bg-red-500" 
             />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
