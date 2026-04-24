'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useState, useEffect } from 'react'
import { useWalletReady } from './Providers'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '#colosseum', label: 'Colosseum' },
  { href: '#airdrop', label: 'Airdrop' },
  { href: '#gamification', label: 'Gamification' },
  { href: '#ocr', label: 'OCR' },
  { href: '#images', label: 'Images' },
  { href: '#news', label: 'News' },
  { href: '#token', label: 'Token' },
  { href: '/terminal', label: 'Terminal' },
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
          </Link>

          {/* Desktop Nav - Glassmorphism & Neon */}
          {pathname !== '/dashboard' && (
            <nav className="hidden xl:flex items-center gap-1 px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
              {NAV_LINKS.map(link => {
                const isPage   = link.href.startsWith('/')
                const isActive = isPage ? pathname === link.href : activeSection === link.href
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`px-5 py-2 text-xs font-mono uppercase tracking-widest rounded-full transition-all duration-500 relative group overflow-hidden ${
                      isActive
                        ? 'text-white bg-red-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="relative z-10">{link.label}</span>
                    {isActive && (
                      <>
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-red-500 shadow-[0_0_12px_#ff1a1a] rounded-t-full" />
                        <span className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent opacity-50" />
                      </>
                    )}
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
                <WalletMultiButton
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,26,26,0.1) 0%, rgba(255,26,26,0.02) 100%)',
                    border: '1px solid rgba(255, 26, 26, 0.3)',
                    color: '#ff1a1a',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.15em',
                    height: '40px',
                    padding: '0 1.5rem',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 20px rgba(255,26,26,0.1), inset 0 0 10px rgba(255,26,26,0.05)',
                  }}
                />
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
                <WalletMultiButton
                  style={{
                    background: 'rgba(255,26,26,0.1)',
                    border: '1px solid rgba(255,26,26,0.3)',
                    color: '#ff1a1a',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.15em',
                    height: '52px',
                    width: '100%',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                  }}
                />
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
