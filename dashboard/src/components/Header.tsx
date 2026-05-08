'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useState, useEffect } from 'react'
import { useWalletReady } from './Providers'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_LINKS = [
  { href: '/terminal/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj', label: 'EXEC_TERMINAL', code: '01' },
  { href: '/dashboard', label: 'LAUNCH_TOKEN', code: '02' },
  { href: '/#gamification', label: 'AIRDROP_REWARDS', code: '03' },
  { href: '/#news', label: 'GET_ARCHIVE', code: '04' },
]

const SOCIAL_LINKS = [
  { label: 'TG_PORTAL', href: 'https://t.me/theredactedprotocol_bot', icon: '📡' },
  { label: 'X_RECON', href: 'https://x.com/theprotocol_sol', icon: '✖' },
]

export function Header() {
  const walletReady = useWalletReady()
  const { connected, publicKey } = useWallet()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-GB', { hour12: false }))
    }, 1000)
    return () => {
      window.removeEventListener('scroll', handler)
      clearInterval(timer)
    }
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[150] transition-all duration-500 ${
        scrolled
          ? 'bg-black/95 backdrop-blur-xl border-b border-red-500/30 shadow-[0_0_20px_rgba(255,0,0,0.1)]'
          : 'bg-black border-b border-white/5'
      }`}
    >
      {/* Top technical status grid - ULTRA SQUARED */}
      <div className="hidden md:grid grid-cols-12 h-6 border-b border-white/5 font-mono text-[8px] bg-black">
        <div className="col-span-2 flex items-center px-4 border-r border-white/5 text-red-500 font-black animate-pulse">
          <span className="mr-2">●</span> SYSTEM_LIVE
        </div>
        <div className="col-span-4 flex items-center px-4 border-r border-white/5 text-white/30 uppercase tracking-widest overflow-hidden">
          <motion.span 
            animate={{ x: [0, -100, 0] }} 
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="whitespace-nowrap"
          >
            <span className="text-red-500 font-black">[!] TESTNET_PHASE_1: AIRDROP_QUALIFICATION_ACTIVE</span> // PARTICIPATE_BY_LAUNCHING_AND_TRADING_TOKENS_TO_QUALIFY // DECRYPTION_REWARDS_ENABLED
          </motion.span>
        </div>
        <div className="col-span-3 flex items-center px-4 border-r border-white/5 bg-red-600/5">
           <span className="text-white/40 mr-4">AIRDROP_RANK:</span>
           <div className="flex-1 h-[3px] bg-white/5 relative overflow-hidden">
              <motion.div 
                 initial={{ width: '0%' }}
                 animate={{ width: '65%' }}
                 className="h-full bg-red-600 shadow-[0_0_8px_#ff0000]" 
              />
           </div>
           <span className="text-red-500 font-black ml-4">65%</span>
        </div>
        <div className="col-span-1 flex items-center justify-center px-4 border-r border-white/5 text-white/30 uppercase tracking-widest">
           XP: <span className="text-white ml-2">1,248</span>
        </div>
        <div className="col-span-2 flex items-center justify-end px-4 text-white/60 font-black tracking-[0.3em]">
          {currentTime} // GMT-4
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* LOGO AREA - COMMAND CONSOLE STYLE */}
          <div className="flex items-center h-full">
            <Link href="/" className="flex items-center h-full px-8 gap-4 group border-r border-white/5">
              <div className="relative w-10 h-10 border border-white flex items-center justify-center bg-white group-hover:bg-red-600 group-hover:border-red-600 transition-all duration-500 rotate-45 group-hover:rotate-0">
                <span className="text-black font-black text-xl -rotate-45 group-hover:rotate-0 transition-transform">R</span>
                <div className="absolute inset-0 bg-red-500 blur-md opacity-0 group-hover:opacity-40 transition-opacity" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-lg font-black tracking-[-0.02em] text-white uppercase group-hover:text-red-500 transition-colors">THE_REDACTED</span>
                <span className="text-[9px] text-red-600 font-black tracking-[0.5em] mt-1 uppercase">PROTOCOL_V2.0</span>
              </div>
            </Link>

            {/* MAIN NAV - TERMINAL COMMANDS */}
            <nav className="hidden lg:flex items-center h-full">
              {NAV_LINKS.map(link => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`h-20 px-10 border-r border-white/5 flex flex-col justify-center gap-1.5 transition-all relative group overflow-hidden ${
                      isActive ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                       <span className={`text-[9px] font-mono ${isActive ? 'text-red-500' : 'text-white/20'}`}>[{link.code}]</span>
                       <span className={`text-[11px] font-black tracking-[0.3em] uppercase transition-colors ${
                         isActive ? 'text-white' : 'text-white/40 group-hover:text-white'
                       }`}>
                         {link.label}
                       </span>
                    </div>
                    
                    {/* Hover indicator */}
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                    {isActive && (
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-red-600" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* ACTION AREA - SECURE LOGIN */}
          <div className="flex items-center h-full">
            
            {/* Operator Stats - DESKTOP ONLY */}
            <div className="hidden xl:flex flex-col items-end justify-center px-10 border-l border-white/5 h-20">
               <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.4em] mb-1">OPERATOR_RANK</span>
               <div className="flex items-center gap-3">
                  <div className="w-16 h-1 bg-white/5 relative overflow-hidden">
                     <motion.div animate={{ width: '65%' }} className="absolute inset-0 bg-red-600" />
                  </div>
                  <span className="text-[10px] font-black text-red-600 uppercase font-mono">B42-X0</span>
               </div>
            </div>

            <div className="h-20 border-l border-white/5 relative group overflow-hidden">
               <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
               <div className="relative h-full flex items-center px-10">
                  <div className="flex flex-col items-start mr-6 pointer-events-none">
                     <span className="text-[7px] font-mono text-white/40 group-hover:text-white/80 uppercase tracking-[0.5em] leading-none mb-1">SECURE_LINK</span>
                     <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none">TERMINAL</span>
                </div>
                <div className="relative">
                   <div className="absolute -inset-2 bg-red-600/20 blur-xl opacity-0 group-hover:opacity-100 animate-pulse transition-opacity" />
                   <WalletMultiButton className="rdx-solana-wallet-btn" />
                </div>
               </div>
               
               {/* Scanning Line */}
               <motion.div 
                 animate={{ top: ['0%', '100%', '0%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                 className="absolute left-0 w-full h-[1px] bg-red-500/20 pointer-events-none group-hover:bg-white/40"
               />
            </div>

            {/* Mobile Toggle - SQUARED */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-20 h-20 border-l border-white/5 flex items-center justify-center bg-white/[0.02] hover:bg-red-600 transition-all group"
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <motion.div 
                   animate={mobileMenuOpen ? { rotate: 45, y: 9 } : { rotate: 0, y: 0 }}
                   className="h-[2px] bg-white w-full group-hover:bg-black transition-colors" 
                />
                <motion.div 
                   animate={mobileMenuOpen ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                   className="h-[2px] bg-white w-full group-hover:bg-black transition-colors" 
                />
                <motion.div 
                   animate={mobileMenuOpen ? { rotate: -45, y: -9 } : { rotate: 0, y: 0 }}
                   className="h-[2px] bg-white w-full group-hover:bg-black transition-colors" 
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU - FULL SCREEN BIOS OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-black z-[200] lg:hidden p-8 flex flex-col pt-32"
          >
            {/* BIOS Decoration */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-red-500/30 pb-10 mb-12 relative">
               <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-red-600 font-black tracking-[0.5em]">OPERATOR_NODE_v2.0</span>
                  <span className="text-[8px] font-mono text-white/20 uppercase mt-2 tracking-widest animate-pulse">ENCRYPTED_SESSION_ACTIVE</span>
               </div>
               <button onClick={() => setMobileMenuOpen(false)} className="w-12 h-12 border border-white/10 flex items-center justify-center text-white hover:bg-red-600">✕</button>
            </div>

            <div className="flex flex-col gap-4 relative">
              {NAV_LINKS.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-8 border border-white/5 bg-white/[0.02] hover:bg-red-600 group transition-all"
                >
                   <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-mono text-white/20 group-hover:text-white/60 tracking-[0.6em]">LINK_00{i+1}</span>
                      <span className="text-xl font-black text-white tracking-[0.3em] uppercase group-hover:translate-x-2 transition-transform">{link.label}</span>
                   </div>
                   <div className="w-14 h-14 border border-white/10 flex items-center justify-center text-red-600 group-hover:text-white group-hover:border-white transition-all font-black">
                      >>
                   </div>
                </Link>
              ))}
            </div>

            <div className="mt-auto pt-12 border-t border-white/5 relative">
               <div className="grid grid-cols-2 gap-4">
                  {SOCIAL_LINKS.map(link => (
                    <a 
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-6 border border-white/5 bg-white/[0.01] flex items-center justify-center gap-4 hover:bg-white hover:text-black transition-all"
                    >
                      <span className="text-2xl">{link.icon}</span>
                      <span className="text-[11px] font-black uppercase tracking-widest">{link.label.split('_')[0]}</span>
                    </a>
                  ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .rdx-solana-wallet-btn {
          background: transparent !important;
          border: none !important;
          border-radius: 0px !important;
          font-family: var(--font-mono) !important;
          font-size: 11px !important;
          font-weight: 900 !important;
          letter-spacing: 0.3em !important;
          text-transform: uppercase !important;
          height: 100% !important;
          padding: 0 !important;
          color: white !important;
          transition: all 0.3s ease !important;
          display: flex !important;
          align-items: center !important;
        }
        .rdx-solana-wallet-btn:hover {
          color: white !important;
          background: transparent !important;
        }
        .wallet-adapter-button-trigger:hover {
          background: transparent !important;
        }
        .wallet-adapter-button-trigger i {
          display: none !important;
        }
      `}</style>
    </header>
  )
}
