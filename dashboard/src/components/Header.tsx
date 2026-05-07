'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useState, useEffect } from 'react'
import { useWalletReady } from './Providers'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/terminal/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj', label: 'Trade $RDX' },
  { href: '/dashboard', label: 'Launchpad' },
  { href: '/#tokenomics', label: 'Tokenomics' },
  { href: '/#news', label: 'News' },
  { href: '/#gamification', label: 'Tiers' },
  { href: '/terminal', label: 'All Tokens' },
]

export function Header() {
  const walletReady = useWalletReady()
  const { connected, publicKey } = useWallet()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 20)
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('scroll', handler, { passive: true })
    window.addEventListener('keydown', keyHandler)
    handler()
    return () => {
      window.removeEventListener('scroll', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [])

  useEffect(() => {
    if (pathname === '/dashboard') return;
    const sections = NAV_LINKS.map(link => link.href.replace('#', ''))
      .map(id => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`)
          }
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [pathname])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled
          ? 'bg-black/70 backdrop-blur-3xl border-b border-red-500/10 shadow-[0_0_80px_rgba(255,26,26,0.05)]'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      {/* Scroll progress bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none z-[60]"
        style={{
          background: `linear-gradient(90deg, #ff1a1a ${scrollProgress}%, rgba(255,26,26,0) ${scrollProgress}%)`,
          boxShadow: scrollProgress > 0 ? '0 0 15px rgba(255, 26, 26, 0.8)' : 'none',
        }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">

          {/* Logo - More Futuristic */}
          <Link href="/" className="flex items-center gap-4 group flex-shrink-0 relative">
            <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-2 bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0 rounded-full animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img
                src="/logo.png"
                alt="Redacted Protocol"
                className="w-12 h-12 relative z-10 transition-all duration-500 group-hover:drop-shadow-[0_0_15px_#ff1a1a] group-hover:scale-110 object-contain"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#ff1a1a] z-20 border-2 border-black" />
            </div>
            <div className="hidden sm:flex flex-col justify-center relative z-10">
              <div className="text-lg font-black tracking-[0.2em] text-white group-hover:text-red-400 transition-colors duration-300 leading-none" style={{ textShadow: '0 0 20px rgba(255,26,26,0.5)' }}>
                REDACTED
              </div>
              <div className="text-[10px] text-red-500/80 tracking-[0.4em] mt-1.5 font-mono uppercase font-bold flex items-center gap-2">
                <span className="w-2 h-[1px] bg-red-500/80 inline-block" />
                PROTOCOL
                <span className="w-12 h-[1px] bg-gradient-to-r from-red-500/80 to-transparent inline-block" />
              </div>
            </div>

            {/* LAUNCH TICKER */}
            <div className="hidden lg:flex items-center gap-4 ml-8 pl-8 border-l border-white/5">
               <div className="flex flex-col">
                  <span className="text-[8px] text-gray-600 uppercase tracking-widest font-bold">NEXT DECLASSIFICATION</span>
                  <span className="text-[11px] text-red-500 font-mono font-black">MAY 22, 2026</span>
               </div>
               <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-sm">
                  <span className="text-[9px] text-red-400 font-mono animate-pulse">SYSTEM: BOOTING</span>
               </div>
            </div>
          </Link>

          {/* Desktop Nav - Professional Glassmorphism */}
          {pathname !== '/dashboard' && (
            <nav className="hidden xl:flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              {NAV_LINKS.map(link => {
                const isPage   = link.href.startsWith('/') && !link.href.includes('#')
                const isActive = isPage ? pathname === link.href : activeSection === link.href.replace('/', '')
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-1.5 text-[0.7rem] font-mono uppercase tracking-[0.15em] rounded-full transition-all duration-300 relative group ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="relative z-10">{link.label}</span>
                    <span className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isActive ? 'bg-white/10 opacity-100' : 'bg-white/5 opacity-0 group-hover:opacity-100'}`} />
                  </a>
                )
              })}
            </nav>
          )}

          {/* Right side - Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Dashboard link — visible md+ */}
            {walletReady && connected && (
              <Link
                href="/dashboard"
                className={`hidden md:flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-300 border ${
                  pathname === '/dashboard'
                    ? 'border-red-500/50 bg-red-500/10 text-white shadow-[0_0_20px_rgba(255,26,26,0.2)]'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-red-500/30 hover:text-white hover:bg-red-500/5'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${pathname === '/dashboard' ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ff1a1a]' : 'bg-gray-500'}`} />
                Dashboard
              </Link>
            )}

            {/* Mobile: Dashboard icon button when connected */}
            {walletReady && connected && (
              <Link
                href="/dashboard"
                className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-mono uppercase tracking-wider border transition-all ${
                  pathname === '/dashboard'
                    ? 'border-red-500/50 bg-red-500/10 text-red-400'
                    : 'border-white/10 bg-white/5 text-gray-400'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_4px_#22c55e]" />
                App
              </Link>
            )}

            {/* Wallet — desktop */}
            {walletReady && (
              <div className="hidden md:block">
                <WalletMultiButton className="wallet-adapter-button-premium" />
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2.5 sm:p-3 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 hover:border-red-500/50 transition-all duration-300 relative group"
              aria-label="Toggle menu"
            >
              <div className="absolute inset-0 bg-red-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              {mobileMenuOpen ? (
                <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu - Futuristic overlay */}
      {mobileMenuOpen && (
        <div className="xl:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-3xl border-t border-red-500/20 shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,26,26,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,26,26,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          <nav className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-2 relative z-10">
            {pathname !== '/dashboard' && NAV_LINKS.map((link, i) => {
              const isActive = activeSection === link.href
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-4 px-6 text-sm font-mono uppercase tracking-[0.2em] rounded-xl transition-all duration-300 border ${
                    isActive
                      ? 'text-red-400 bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(255,26,26,0.1)]'
                      : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10 hover:translate-x-2'
                  }`}
                  style={{ animationDelay: `${i * 50}ms`, animation: 'fadeInRight 0.3s ease forwards' }}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-red-500 shadow-[0_0_10px_#ff1a1a]' : 'bg-gray-600'}`} />
                    {link.label}
                  </div>
                </a>
              )
            })}
            
            <div className="mt-6 pt-6 border-t border-red-500/20 flex flex-col gap-3">
              {/* Wallet button — full width in mobile menu */}
              {walletReady && (
                <div className="w-full flex justify-center">
                  <WalletMultiButton className="wallet-adapter-button-premium w-full !justify-center" />
                </div>
              )}

              {/* Dashboard link — only when connected */}
              {walletReady && connected && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-center gap-3 py-4 px-6 rounded-xl border font-mono text-sm uppercase tracking-widest transition-all ${
                    pathname === '/dashboard'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-red-500/20'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_#22c55e]" />
                  Agent Dashboard
                </Link>
              )}

              <a
                href="https://t.me/theredacted_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 py-4 px-6 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all font-mono text-sm uppercase tracking-widest"
              >
                Telegram Bot
              </a>
            </div>
          </nav>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-spin-slow { animation: spin 8s linear infinite; }
      `}} />
    </header>
  )
}
