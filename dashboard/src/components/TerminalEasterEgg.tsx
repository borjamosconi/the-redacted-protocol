'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

export function TerminalEasterEgg() {
  const [keys, setKeys] = useState<string[]>([])
  const [active, setActive] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newKeys = [...keys, e.key].slice(-10)
      setKeys(newKeys)
      
      if (JSON.stringify(newKeys) === JSON.stringify(KONAMI_CODE)) {
        setActive(true)
        if ((window as any).playSound) (window as any).playSound('success')
        setTimeout(() => setActive(false), 8000)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keys])

  return (
    <AnimatePresence>
      {active && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-mono overflow-hidden"
        >
          {/* Matrix-like falling text effect */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             {Array.from({ length: 50 }).map((_, i) => (
                <motion.div 
                  key={i}
                  initial={{ y: -100 }}
                  animate={{ y: '100vh' }}
                  transition={{ duration: Math.random() * 5 + 2, repeat: Infinity, ease: "linear", delay: Math.random() * 5 }}
                  className="absolute text-[8px] text-red-500 whitespace-nowrap"
                  style={{ left: `${i * 2}%` }}
                >
                  {Array.from({ length: 20 }).map(() => Math.random().toString(36).substring(2, 4)).join('')}
                </motion.div>
             ))}
          </div>

          <div className="relative z-10 text-center space-y-6 max-w-2xl px-6">
             <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.2, repeat: Infinity }}
                className="text-red-600 text-6xl font-black mb-4"
             >
                [ ACCESS_GRANTED ]
             </motion.div>
             <h2 className="text-2xl font-black text-white uppercase tracking-[0.5em]">Secret_Level_Omega</h2>
             <p className="text-gray-500 text-xs leading-relaxed uppercase tracking-widest">
                "The file is breathing. We are not alone in the network. The declassification is only the beginning of the reconstruction. $RDX is the key to the vault."
             </p>
             <div className="pt-8 flex justify-center gap-12">
                <div className="flex flex-col items-center">
                   <span className="text-white text-xl font-black">700K+</span>
                   <span className="text-[8px] text-gray-600">FILES_RECOVERED</span>
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-white text-xl font-black">42</span>
                   <span className="text-[8px] text-gray-600">ZERO_DAY_EXPLOITS</span>
                </div>
             </div>
          </div>
          
          {/* Glitch Overlay */}
          <div className="absolute inset-0 bg-red-600/5 mix-blend-overlay pointer-events-none animate-pulse" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
