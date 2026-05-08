'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useState, useEffect } from 'react'
import { useWalletReady } from './Providers'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_LINKS = [
  { href: `/terminal/${process.env.NEXT_PUBLIC_RDX_TOKEN_MINT || 'HZmo7pqLsZ6Z5EeoaRKvTpPdGrpk3mMV9cdALFcFCjjU'}`, label: 'EXEC_TERMINAL', code: '01', desc: 'Secure document trade' },
  { href: '/dashboard', label: 'LAUNCH_TOKEN', code: '02', desc: 'Deploy new intel' },
  { href: '/#gamification', label: 'AIRDROP_REWARDS', code: '03', desc: 'Verify XP status' },
  { href: '/#news', label: 'GET_ARCHIVE', code: '04', desc: 'Access leaked history' },
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

  const playSound = (type: 'click' | 'success' | 'error') => {
    const urls = {
      click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
      error: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
    }
    const audio = new Audio(urls[type])
    audio.volume = 0.1
    audio.play().catch(() => {})
  }

  useEffect(() => {
    (window as any).playSound = playSound
  }, [])

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
      className={`fixed top-0 left-0 right-0 z-[150] transition-all duration-700 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-2xl border-b border-red-500/20'
          : 'bg-transparent border-b border-white/5'
      }`}
    >
      {/* Global Progress Bar (Top of everything) */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-white/5 z-[200]">
         <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: '91%' }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="h-full bg-red-600 shadow-[0_0_10px_#ff0000]"
         />
      </div>

      {/* Top technical status grid */}
      <div className="hidden lg:grid grid-cols-12 h-8 border-b border-white/5 font-mono text-[9px] bg-black/40 backdrop-blur-sm">
        <div className="col-span-2 flex items-center px-6 border-r border-white/5 text-red-500 font-black">
          <span className="w-2 h-2 rounded-full bg-red-600 mr-3 animate-pulse shadow-[0_0_8px_#ff0000]" />
          SYSTEM_DECRYPTION: ACTIVE
        </div>
        <div className="col-span-6 flex items-center px-6 border-r border-white/5 text-white/30 uppercase tracking-[0.3em] overflow-hidden">
          <div className="flex items-center gap-12 whitespace-nowrap">
            {[
              { label: 'FRAGMENTS_PROCESSED', val: '42,912', color: 'text-red-500' },
              { label: 'TRUTH_CONFIDENCE', val: '98.4%', color: 'text-green-500' },
              { label: 'ACTIVE_NODES', val: '1,204', color: 'text-blue-500' },
              { label: 'RDX_LIQUIDITY', val: 'SECURED', color: 'text-red-500' },
              { label: 'THREAT_LEVEL', val: 'DEGRADED', color: 'text-yellow-500' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[7px] text-white/20">{stat.label}:</span>
                <span className={`font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 flex items-center px-6 border-r border-white/5 bg-red-600/5">
           <span className="text-[7px] text-white/40 mr-4">RANK_INDEX:</span>
           <div className="flex-1 h-[2px] bg-white/5 relative">
              <motion.div initial={{ width: '0%' }} animate={{ width: '74%' }} className="h-full bg-red-600 shadow-[0_0_10px_#ff0000]" />
           </div>
           <span className="text-red-500 font-black ml-4 text-[10px]">A-1</span>
        </div>
        <div className="col-span-2 flex items-center justify-end px-6 text-white/40 font-black tracking-widest uppercase">
          {currentTime} // UTC-4
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center justify-between h-20 sm:h-24 px-6 sm:px-12">
          
          {/* Branding Section — REDESIGNED LOGO WITH NEW IMAGE */}
          <Link href="/" onClick={() => (window as any).playSound?.('click')} className="flex items-center gap-4 sm:gap-6 group">
             <div className="relative w-10 h-10 sm:w-14 sm:h-14 overflow-hidden border border-red-600/50 group-hover:border-red-500 transition-all duration-500">
                <img src="/logo.png" alt="REDACTED" className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600/50 animate-terminal-scan pointer-events-none" />
                {/* Technical corners */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-600" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-600" />
             </div>
             <div className="flex flex-col leading-none">
                <div className="flex items-baseline gap-1">
                   <span className="text-lg sm:text-2xl font-black text-white tracking-[-0.05em] uppercase group-hover:text-red-500 transition-colors">REDACTED</span>
                   <span className="text-[10px] sm:text-xs font-mono text-red-600 font-black animate-pulse">PROT.</span>
                </div>
                <span className="text-[8px] sm:text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mt-1">SECURE_LEVEL_ALPHA</span>
             </div>
          </Link>

          {/* Desktop Navigation — REFINED */}
          <nav className="hidden xl:flex items-center gap-2">
             {NAV_LINKS.map(link => {
                const isActive = pathname === link.href
                return (
                  <Link key={link.href} href={link.href} className="relative group px-6 py-2 overflow-hidden">
                     <div className="relative flex flex-col items-center">
                        <span className={`text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-300 ${
                          isActive ? 'text-white' : 'text-white/30 group-hover:text-red-500 group-hover:tracking-[0.4em]'
                        }`}>
                           {link.label}
                        </span>
                        {isActive && <div className="mt-1 w-1 h-1 bg-red-600 shadow-[0_0_8px_#ff0000]" />}
                     </div>
                  </Link>
                )
             })}
          </nav>

          {/* Wallet / Action Area — OPTIMIZED FOR HEIGHT */}
          <div className="flex items-center h-full">
             
             {/* Wallet Terminal — REFINED DESKTOP */}
             <div className="relative h-20 sm:h-24 border-x border-white/5 hidden sm:flex items-center px-6 lg:px-10 bg-white/[0.01] group overflow-hidden">
                <div className="flex items-center gap-6">
                   <div className="hidden lg:flex flex-col text-right">
                      <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.4em] mb-1">OPERATOR_AUTH</span>
                      <span className="text-[9px] font-black text-red-600 uppercase tracking-widest animate-pulse">PENDING...</span>
                   </div>
                   <div className="relative">
                      <WalletMultiButton className="rdx-premium-wallet-btn !h-10 !px-8 !text-[10px]" />
                   </div>
                </div>

                {/* Biometric Scanning Line */}
                <motion.div 
                   animate={{ top: ['0%', '100%', '0%'] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                   className="absolute left-0 w-full h-[1px] bg-red-600/20 group-hover:bg-red-600/60 pointer-events-none"
                />
             </div>

             {/* Mobile Toggle */}
             <div className="xl:hidden flex items-center h-full z-[310] relative">
               <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`w-16 h-16 flex items-center justify-center transition-all duration-500 group ${
                    mobileMenuOpen ? 'bg-red-600' : 'bg-white/[0.03] hover:bg-red-600'
                  }`}
               >
                  <div className="w-6 h-6 relative flex flex-col items-center justify-center">
                     <motion.span 
                        animate={mobileMenuOpen ? { rotate: 45, y: 0, backgroundColor: '#ffffff' } : { rotate: 0, y: -6, backgroundColor: '#ffffff' }}
                        className="absolute w-full h-[2px] transition-colors"
                     />
                     <motion.span 
                        animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1, backgroundColor: '#ffffff' }}
                        className="absolute w-full h-[2px] transition-colors"
                     />
                     <motion.span 
                        animate={mobileMenuOpen ? { rotate: -45, y: 0, backgroundColor: '#ffffff' } : { rotate: 0, y: 6, backgroundColor: '#ffffff' }}
                        className="absolute w-full h-[2px] transition-colors"
                     />
                  </div>
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* MOBILE MENU — BIOS OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[300] flex flex-col pt-24"
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,26,26,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-red-600/5 via-transparent to-black pointer-events-none" />
            
            <div className="flex-1 flex flex-col p-6 sm:p-10 overflow-y-auto no-scrollbar relative z-10">
              {/* Mobile Wallet Section */}
              <div className="mb-8 p-6 border border-red-500/30 bg-red-600/5 relative group">
                 <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-mono text-red-500 font-black tracking-[0.4em]">AUTHENTICATION_REQUIRED</span>
                       <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    </div>
                    <div className="flex justify-center">
                       <WalletMultiButton className="rdx-premium-wallet-btn !w-full !justify-center" />
                    </div>
                 </div>
                 <motion.div 
                    animate={{ left: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 h-[2px] w-full bg-red-600/30"
                 />
              </div>

              {/* Nav Links */}
              <div className="flex flex-col gap-3">
                 {NAV_LINKS.map((link, i) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="group border border-white/10 bg-white/[0.02] p-6 flex flex-col gap-1 hover:bg-red-600 hover:border-red-600 transition-all duration-300"
                    >
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-mono text-red-600 group-hover:text-white/60 tracking-[0.5em] font-black">CHANNEL_00{i+1}</span>
                          <span className="text-[8px] font-mono text-white/20 group-hover:text-white/40">READY_</span>
                       </div>
                       <span className="text-xl font-black text-white tracking-tighter uppercase">{link.label}</span>
                       <span className="text-[9px] font-mono text-white/30 group-hover:text-white/80 uppercase tracking-widest">{link.desc}</span>
                    </Link>
                 ))}
              </div>

              {/* Bottom Actions */}
              <div className="mt-auto pt-10 flex flex-col gap-6">
                 <div className="flex items-center justify-between border-t border-white/10 pt-6">
                    <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.5em]">EXTERNAL_RELAYS</span>
                    <div className="flex gap-6">
                       {SOCIAL_LINKS.map(s => (
                          <a key={s.label} href={s.href} target="_blank" className="text-xl text-white/40 hover:text-red-500 transition-colors">{s.icon}</a>
                       ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-5 border border-white/10 bg-white/[0.01] text-[9px] font-black text-white uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all"
                    >
                      RETURN
                    </button>
                    <button 
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-5 border border-red-600/50 bg-red-600/10 text-[9px] font-black text-red-600 uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all"
                    >
                      TERMINATE
                    </button>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .rdx-premium-wallet-btn {
          background: #ffffff !important;
          border: none !important;
          border-radius: 0px !important;
          font-family: var(--font-mono) !important;
          font-size: 11px !important;
          font-weight: 900 !important;
          letter-spacing: 0.35em !important;
          text-transform: uppercase !important;
          height: 52px !important;
          padding: 0 2.5rem !important;
          color: #000000 !important;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
          display: flex !important;
          align-items: center !important;
          box-shadow: 8px 8px 0px rgba(255, 0, 0, 0.2) !important;
        }
        .rdx-premium-wallet-btn:hover {
          background: #ff1a1a !important;
          color: #ffffff !important;
          transform: translate(2px, 2px) !important;
          box-shadow: 0px 0px 0px rgba(255, 0, 0, 0) !important;
        }
        .wallet-adapter-button-trigger i {
          display: none !important;
        }
        .wallet-adapter-dropdown-list {
          background: #0a0a0a !important;
          border: 1px solid #ff1a1a33 !important;
          border-radius: 0px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important;
        }
        .wallet-adapter-dropdown-list-item {
          font-family: var(--font-mono) !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          letter-spacing: 0.2em !important;
          text-transform: uppercase !important;
          color: #ffffff99 !important;
        }
        .wallet-adapter-dropdown-list-item:hover {
          background: #ff1a1a11 !important;
          color: #ff1a1a !important;
        }
      `}</style>
    </header>
  )
}
