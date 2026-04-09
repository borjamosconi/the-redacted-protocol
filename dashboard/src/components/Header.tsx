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
            <img src="/icon.svg" alt="Redacted Protocol" className="w-8 h-8" />
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
          <a href="#colosseum" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            COLOSSEUM
          </a>
          <a href="#airdrop" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            AIRDROP
          </a>
          <a href="#gamification" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            🎮 GAMIFICATION
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
          <a
            href="https://github.com/whalesconspiracy-33/the_redacted_protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            CODE
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
            <a href="#colosseum" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              COLOSSEUM
            </a>
            <a href="#airdrop" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              AIRDROP
            </a>
            <a href="#gamification" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              🎮 GAMIFICATION
            </a>
            <a href="#ocr" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              OCR
            </a>
            <a href="#images" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              IMAGES
            </a>
            <a href="#gallery" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              GALLERY
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
            <div className="pt-2 border-t border-rd-border" />
            <a href="https://github.com/whalesconspiracy-33/the_redacted_protocol" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GITHUB REPO
            </a>
            <a href="https://t.me/theredacted_bot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              TELEGRAM BOT
            </a>
            <a href="https://x.com/theprotocol_sol" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-rd-muted hover:text-rd-red tracking-widest transition-colors py-2">
              <span className="text-xs font-bold">&#x1D54F;</span>
              X / TWITTER
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
