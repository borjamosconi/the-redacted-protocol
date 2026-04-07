'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export function Header() {
  const { connected } = useWallet()
  const [scrolled, setScrolled] = useState(false)

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

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#airdrop" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            AIRDROP
          </a>
          <a href="#fragments" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            FRAGMENTS
          </a>
          <a href="#tokenomics" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            TOKENOMICS
          </a>
          <a href="https://t.me/theredacted_bot" target="_blank" rel="noopener" className="text-xs text-rd-muted hover:text-rd-red tracking-widest transition-colors">
            TELEGRAM
          </a>
        </nav>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {connected && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-rd-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              CONNECTED
            </div>
          )}
          <WalletMultiButton className="!bg-transparent !border !border-rd-red/30 !text-rd-red !font-mono !text-xs !tracking-widest hover:!bg-rd-red hover:!text-rd-black !transition-all" />
        </div>
      </div>
    </header>
  )
}
