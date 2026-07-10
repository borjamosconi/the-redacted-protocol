'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'
import { useWalletReady } from './Providers'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

const NAV_LINKS = [
  { href: '/', label: 'HOME', code: '01', desc: 'Secure landing deck' },
  { href: '/about', label: 'ABOUT', code: '02', desc: 'System declassification report' },
  { href: '/terminal', label: 'TERMINAL', code: '03', desc: 'Document verification & swap' },
  { href: '/dashboard', label: 'LAUNCHPAD', code: '04', desc: 'Deploy new document intelligence' },
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
      className={`fixed top-0 left-0 right-0 z-[150] transition-all duration-500 ${
        scrolled
          ? 'bg-black/85 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)] backdrop-blur-md'
          : 'bg-black/30 border-b border-white/5 backdrop-blur-sm'
      }`}
    >
      {/* Top technical status grid */}
      <div className="hidden lg:grid grid-cols-12 h-8 border-b border-white/5 font-mono text-[9px] bg-black/40">
        <div className="col-span-3 flex items-center px-8 border-r border-white/5 text-red-500 font-bold tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-2.5 animate-pulse shadow-[0_0_8px_#ff0000]" />
          PROTOCOL_FEED: ONLINE
        </div>
        <div className="col-span-6 flex items-center px-8 border-r border-white/5 text-white/30 uppercase tracking-[0.25em] overflow-hidden">
          <div className="flex items-center gap-8 whitespace-nowrap">
            {[
              { label: 'CONFIDENCE', val: '98.4%', color: 'text-green-500' },
              { label: 'NODES', val: '1,204', color: 'text-blue-500' },
              { label: 'SECURE_LIQ', val: 'ACTIVE', color: 'text-red-500' },
              { label: 'THREAT', val: '0.00%', color: 'text-green-500' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-white/20">{stat.label}:</span>
                <span className={`font-black font-mono ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-3 flex items-center justify-end px-8 text-white/40 font-black tracking-widest uppercase">
          {currentTime} // UTC-0
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 sm:px-10">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo Branding */}
          <Link href="/" onClick={() => playSound('click')} className="flex items-center gap-3.5 group">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 overflow-hidden border border-white/10 group-hover:border-red-600 transition-colors duration-300 rounded-sm">
              <img src="/logo.png" alt="REDACTED" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-red-600/10 to-transparent pointer-events-none" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm sm:text-base font-black text-white tracking-widest uppercase">
                REDACTED <span className="text-red-500 font-mono text-[9px] align-super">PROTO.</span>
              </span>
              <span className="text-[7.5px] font-mono text-white/30 uppercase tracking-[0.3em] mt-1">SECURE_NETWORK</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => {
              const isActive = pathname === link.href
              return (
                <Link 
                  key={link.href} 
                  href={link.href} 
                  onClick={() => playSound('click')}
                  className="relative py-2 text-[10px] font-bold tracking-[0.25em] uppercase transition-colors duration-300"
                >
                  <span className={isActive ? 'text-white' : 'text-white/40 hover:text-white'}>
                    {link.label}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavLine"
                      className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-red-600 shadow-[0_0_8px_#ff0000]"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Socials & Wallet Actions */}
          <div className="hidden md:flex items-center gap-6">
            
            {/* Social channels (Minimal design) */}
            <div className="flex items-center gap-3 font-mono text-[9px]">
              <a href="https://t.me/theredactedprotocol" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/5 hover:border-red-600/30 bg-white/[0.01] hover:bg-red-950/20 text-white/40 hover:text-white uppercase transition-all duration-300 rounded-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" /> TELEGRAM
              </a>
              <a href="https://x.com/TheRedacted_Sol" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/5 hover:border-red-600/30 bg-white/[0.01] hover:bg-red-950/20 text-white/40 hover:text-white uppercase transition-all duration-300 rounded-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" /> TWITTER
              </a>
            </div>

            {/* Wallet Button */}
            <div className="relative">
              <WalletMultiButton className="!bg-red-600 hover:!bg-white !text-white hover:!text-black !h-9 !px-6 !text-[9px] !font-mono !font-bold !tracking-widest !rounded-none !transition-all !border !border-red-600/30" />
            </div>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => { playSound('click'); setMobileMenuOpen(!mobileMenuOpen) }}
              className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 border border-white/10 hover:border-white/20 rounded-sm bg-white/[0.01]"
            >
              <span className={`w-5 h-[2px] bg-white transition-transform duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-5 h-[2px] bg-white transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-5 h-[2px] bg-white transition-transform duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-16 sm:top-20 bg-black/95 border-b border-white/10 backdrop-blur-2xl z-[140] flex flex-col p-6 gap-6 md:hidden"
          >
            {/* Drawer Navigation Links */}
            <div className="flex flex-col gap-2">
              {NAV_LINKS.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-4 border border-white/5 bg-white/[0.01] hover:bg-red-950/20 hover:border-red-600/30 flex items-center justify-between transition-all duration-300 rounded-sm group"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-white/80 group-hover:text-white uppercase tracking-wider">{link.label}</span>
                    <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">{link.desc}</span>
                  </div>
                  <span className="text-white/20 group-hover:text-red-500 font-mono text-[9px]">0{i+1} //</span>
                </Link>
              ))}
            </div>

            {/* Mobile Socials and Wallet Connect */}
            <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
              <div className="flex items-center justify-between text-[9px] text-white/40 uppercase tracking-wider">
                <span>COMMUNICATION RELAYS</span>
                <div className="flex gap-4">
                  <a href="https://t.me/theredactedprotocol" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TELEGRAM</a>
                  <a href="https://x.com/TheRedacted_Sol" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">TWITTER</a>
                </div>
              </div>

              <div className="flex justify-center w-full">
                <WalletMultiButton className="!bg-red-600 hover:!bg-white !text-white hover:!text-black !h-10 !w-full !justify-center !text-[9px] !font-mono !font-bold !tracking-widest !rounded-none !transition-all !border !border-red-600/30" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .wallet-adapter-button-trigger i {
          display: none !important;
        }
        .wallet-adapter-dropdown-list {
          background: #0a0a0a !important;
          border: 1px solid #ff1a1a33 !important;
          border-radius: 0px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important;
          backdrop-filter: blur(20px);
        }
        .wallet-adapter-dropdown-list-item {
          font-family: var(--font-mono) !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          letter-spacing: 0.2em !important;
          text-transform: uppercase !important;
          color: #ffffff99 !important;
          padding: 12px 24px !important;
        }
        .wallet-adapter-dropdown-list-item:hover {
          background: #ff1a1a11 !important;
          color: #ff1a1a !important;
        }
      `}</style>
    </header>
  )
}
