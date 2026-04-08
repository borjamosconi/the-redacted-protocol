'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export function Header() {
  const { connected, publicKey } = useWallet()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-rd-black/95 backdrop-blur-md border-b border-rd-red/10' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-8 h-8 bg-rd-red/20 border border-rd-red/40 flex items-center justify-center">
              <span className="text-rd-red text-xs font-bold">RD</span>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rd-red rounded-full animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-widest text-rd-text group-hover:text-rd-red transition-colors">
              REDACTED
            </div>
            <div className="text-[10px] text-rd-muted tracking-widest -mt-0.5">
              PROTOCOL
            </div>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-5">
          <a href="#colosseum" className="text-xs text-rd-red hover:text-rd-red-glow tracking-widest transition-colors font-bold">
            COLOSSEUM
          </a>
          <a href="#airdrop" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            AIRDROP
          </a>
          <a href="#ocr" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            OCR
          </a>
          <a href="#images" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            IMAGES
          </a>
          <a href="#gallery" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            GALLERY
          </a>
          <a href="#news" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            NEWS
          </a>
          <a href="#token" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            TOKEN
          </a>
          <a href="https://t.me/theredacted_bot" target="_blank" rel="noopener noreferrer" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            BOT
          </a>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {connected && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-rd-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-rd-muted hover:text-rd-red transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-rd-black/95 backdrop-blur-md border-t border-rd-border">
          <nav className="px-4 py-4 space-y-4">
            <a href="#airdrop" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              AIRDROP
            </a>
            <a href="#news" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              NEWS INTEL
            </a>
            <a href="#fragments" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              FRAGMENTS
            </a>
            <a href="#tokenomics" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              TOKENOMICS
            </a>
            <a href="https://t.me/theredacted_bot" target="_blank" rel="noopener noreferrer" className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              TELEGRAM
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
