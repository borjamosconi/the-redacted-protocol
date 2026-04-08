'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AirdropStatus {
  telegramId: string
  walletAddress: string
  amount: number
  claimed: boolean
  registeredAt: string
}

const API_BASE = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://redacted-protocol.vercel.app'

// Floating document component
function FloatingDocument({ delay = 0, x = 0, rotation = 0 }: { delay?: number; x?: number; rotation?: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none hidden md:block"
      style={{ left: `${x}%`, top: '10%' }}
      initial={{ opacity: 0 }}
      animate={{
        y: [0, -30, 0],
        rotate: [rotation - 5, rotation + 5, rotation - 5],
        opacity: [0.05, 0.12, 0.05],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <div className="bg-rd-text/20 p-4 w-32 h-40 relative">
        <div className="space-y-2">
          <div className="h-2 bg-rd-red/30 w-full" />
          <div className="h-2 bg-rd-red/30 w-3/4" />
          <div className="h-2 bg-rd-red/30 w-5/6" />
          <div className="h-2 bg-rd-red/30 w-2/3" />
        </div>
        <div className="mt-4 space-y-1">
          <div className="h-1 bg-rd-text/10 w-full" />
          <div className="h-1 bg-rd-text/10 w-full" />
          <div className="h-1 bg-rd-text/10 w-4/5" />
        </div>
      </div>
    </motion.div>
  )
}

// Glitch text component
function GlitchText({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    const chars = '\u{2588}\u{2593}\u{2592}\u{2591}\u{2554}\u{2557}\u{255A}\u{255D}\u{2551}\u{2550}\u{2560}\u{2563}\u{256C}'
    let i = 0
    const interval = setInterval(() => {
      if (i >= text.length) {
        setDisplay(text)
        clearInterval(interval)
        return
      }
      const glitched = text
        .split('')
        .map((c, idx) => (idx < i ? c : chars[Math.floor(Math.random() * chars.length)]))
        .join('')
      setDisplay(glitched)
      i += Math.floor(Math.random() * 3) + 1
    }, 50)
    return () => clearInterval(interval)
  }, [text])

  return <span className={className}>{display}</span>
}

// Censor bar component
function CensorBar({ width = 'w-48' }: { width?: string }) {
  return (
    <motion.div
      className={`${width} h-4 censor-bar relative overflow-hidden`}
      animate={{ x: [-2, 2, -1, 1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rd-red to-transparent opacity-50" />
    </motion.div>
  )
}

// Dripping effect
function Drip({ left }: { left: string }) {
  return (
    <motion.div
      className="absolute w-0.5 bg-gradient-to-b from-rd-red to-transparent"
      style={{ left }}
      initial={{ height: 0, top: '50%' }}
      animate={{ height: [0, 30, 0], opacity: [0.8, 0.3, 0] }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: Math.random() * 3 }}
    />
  )
}

// Main page
export default function AirdropPage() {
  const [step, setStep] = useState<'landing' | 'register' | 'success' | 'check'>('landing')
  const [telegramId, setTelegramId] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [registeredCount, setRegisteredCount] = useState(0)
  const [checkResult, setCheckResult] = useState<AirdropStatus | null>(null)

  // Load count from API
  useEffect(() => {
    fetch(`${API_BASE}/api/airdrop`)
      .then(res => res.json())
      .then(data => setRegisteredCount(data.stats?.totalRegistered || 0))
      .catch(() => setRegisteredCount(0))
  }, [])

  const handleRegister = useCallback(async () => {
    setError('')
    if (!telegramId.trim() || !walletAddress.trim()) {
      setError('ALL FIELDS REQUIRED')
      return
    }
    if (walletAddress.length < 32) {
      setError('INVALID SOLANA ADDRESS')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/airdrop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: telegramId.trim(), walletAddress }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 400 && data.status === 'already_registered') {
          setError(`Already registered — Wallet: ${data.walletAddress.slice(0, 8)}...${data.walletAddress.slice(-6)}`)
          setIsLoading(false)
          return
        }
        setError(data.error || 'REGISTRATION FAILED')
        setIsLoading(false)
        return
      }

      setRegisteredCount(prev => prev + 1)
      setIsLoading(false)
      setStep('success')
    } catch {
      setError('NETWORK ERROR — PLEASE TRY AGAIN')
      setIsLoading(false)
    }
  }, [telegramId, walletAddress])

  const handleCheck = useCallback(async () => {
    setError('')
    if (!telegramId.trim()) {
      setError('TELEGRAM ID REQUIRED')
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/airdrop?telegramId=${encodeURIComponent(telegramId)}`)
      const data = await res.json()
      if (data.status === 'not_found') {
        setCheckResult(null)
      } else {
        setCheckResult(data)
      }
    } catch {
      setError('NETWORK ERROR')
    } finally {
      setIsLoading(false)
      setStep('check')
    }
  }, [telegramId])

  return (
    <div className="min-h-screen bg-rd-black grid-bg vhs-glitch relative overflow-hidden">
      {/* Scanline effect */}
      <div className="scanline" />

      {/* Floating documents */}
      <FloatingDocument delay={0} x={5} rotation={-15} />
      <FloatingDocument delay={2} x={80} rotation={10} />
      <FloatingDocument delay={4} x={15} rotation={5} />
      <FloatingDocument delay={6} x={70} rotation={-20} />

      {/* Red drips */}
      <Drip left="20%" />
      <Drip left="50%" />
      <Drip left="80%" />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-rd-red/20 bg-rd-black/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-rd-red rounded-full animate-pulse" />
            <span className="text-xs tracking-widest text-rd-muted">
              REDACTED PROTOCOL — $RDX AIRDROP
            </span>
          </div>
          <div className="text-xs text-rd-muted">
            {registeredCount.toLocaleString()} REGISTERED
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 pt-20 pb-20">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 pt-20"
            >
              {/* Logo / Title */}
              <div className="text-center mb-16">
                <motion.div
                  className="text-5xl sm:text-6xl md:text-8xl font-bold mb-4"
                  animate={{ opacity: [1, 0.8, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <GlitchText text="$RDX" className="text-rd-red" />
                </motion.div>

                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent to-rd-red/50" />
                  <CensorBar width="w-24 md:w-32" />
                  <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent to-rd-red/50" />
                </div>

                <p className="text-base md:text-lg text-rd-muted tracking-widest mb-2">
                  <GlitchText text="AIRDROP REGISTRATION" />
                </p>
                <p className="text-xs md:text-sm text-rd-muted/50">
                  FILE #0000 — CLASSIFICATION: PUBLIC
                </p>
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-16">
                {[
                  { label: 'TOTAL SUPPLY', value: '1,000,000,000', sub: 'RDX TOKENS' },
                  { label: 'AIRDROP POOL', value: '400,000,000', sub: '40% TO COMMUNITY' },
                  { label: 'PER USER', value: '1,000', sub: 'RDX GUARANTEED' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="card-redacted text-center"
                  >
                    <div className="text-xs text-rd-muted tracking-widest mb-2">{item.label}</div>
                    <div className="text-xl md:text-2xl font-bold text-rd-red">{item.value}</div>
                    <div className="text-xs text-rd-muted/50 mt-1">{item.sub}</div>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center space-y-6">
                <motion.button
                  onClick={() => setStep('register')}
                  className="btn-redacted animate-pulse-red"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  &#x2588; REGISTER WALLET &#x2588;
                </motion.button>

                <div className="flex items-center justify-center gap-4 text-xs text-rd-muted/50">
                  <span>Already registered?</span>
                  <button
                    onClick={() => setStep('check')}
                    className="text-rd-red/70 hover:text-rd-red underline"
                  >
                    CHECK STATUS
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-lg mx-auto px-4 pt-20"
            >
              <div className="card-redacted">
                {/* Header */}
                <div className="border-b border-rd-muted/20 pb-4 mb-6">
                  <div className="text-xs text-rd-muted tracking-widest mb-1">
                    REGISTRATION FORM
                  </div>
                  <div className="text-xl font-bold">
                    <GlitchText text="CONNECT WALLET" />
                  </div>
                  <div className="text-xs text-rd-muted/50 mt-1">
                    FILE #0001 — CLEARANCE: TELEGRAM VERIFIED
                  </div>
                </div>

                {/* Telegram ID */}
                <div className="mb-6">
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">
                    TELEGRAM USER ID
                  </label>
                  <input
                    type="text"
                    value={telegramId}
                    onChange={e => setTelegramId(e.target.value)}
                    placeholder="Enter your Telegram ID"
                    className="input-redacted"
                  />
                  <div className="text-xs text-rd-muted/30 mt-1">
                    Find this in @userinfobot on Telegram
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="mb-6">
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">
                    SOLANA WALLET ADDRESS
                  </label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={e => setWalletAddress(e.target.value)}
                    placeholder="Enter your Solana wallet address"
                    className="input-redacted"
                  />
                  <div className="text-xs text-rd-muted/30 mt-1">
                    Start with your public key (base58)
                  </div>
                </div>

                {/* Allocation preview */}
                {telegramId && walletAddress && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6 p-4 border border-rd-red/20 bg-rd-red/5"
                  >
                    <div className="text-xs text-rd-muted tracking-widest mb-1">
                      ESTIMATED ALLOCATION
                    </div>
                    <div className="text-2xl font-bold text-rd-red">
                      1,000 RDX
                    </div>
                    <div className="text-xs text-rd-muted/50 mt-1">
                      + Bonuses for document submissions
                    </div>
                  </motion.div>
                )}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 p-3 border border-rd-red/50 bg-rd-red/10 text-rd-red text-sm"
                  >
                    &#x26A0; {error}
                  </motion.div>
                )}

                {/* Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep('landing')}
                    className="flex-1 py-3 border border-rd-muted/30 text-rd-muted text-sm hover:border-rd-muted/50 transition-colors"
                  >
                    &#x2190; BACK
                  </button>
                  <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="flex-1 btn-redacted disabled:opacity-50"
                  >
                    {isLoading ? 'VERIFYING...' : '&#x2588; SUBMIT &#x2588;'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto px-4 pt-20 text-center"
            >
              <div className="card-redacted">
                {/* Success icon */}
                <motion.div
                  className="text-6xl mb-6"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-rd-red">&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;&#x2588;</span>
                </motion.div>

                <div className="text-2xl font-bold text-rd-red mb-2">
                  ACCESS GRANTED
                </div>

                <div className="text-sm text-rd-muted mb-6">
                  <p className="mb-4">Your wallet has been registered for the $RDX airdrop.</p>
                  <p className="text-rd-text">
                    <strong>Allocation:</strong> 1,000 RDX
                  </p>
                  <p className="text-rd-muted/50 text-xs mt-2">
                    Telegram ID: {telegramId}
                  </p>
                  <p className="text-rd-muted/50 text-xs">
                    Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                  </p>
                </div>

                <div className="border-t border-rd-muted/20 pt-4 mb-6">
                  <p className="text-xs text-rd-muted/50">
                    Tokens will be distributed upon token launch.
                  </p>
                  <p className="text-xs text-rd-muted/50">
                    Stay tuned via @theredacted_bot on Telegram.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setStep('landing')
                    setTelegramId('')
                    setWalletAddress('')
                  }}
                  className="btn-redacted"
                >
                  RETURN
                </button>
              </div>
            </motion.div>
          )}

          {step === 'check' && (
            <motion.div
              key="check"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="max-w-lg mx-auto px-4 pt-20"
            >
              <div className="card-redacted">
                <div className="border-b border-rd-muted/20 pb-4 mb-6">
                  <div className="text-xs text-rd-muted tracking-widest mb-1">
                    STATUS CHECK
                  </div>
                  <div className="text-xl font-bold">
                    <GlitchText text="CHECK ELIGIBILITY" />
                  </div>
                </div>

                {/* Telegram ID input */}
                <div className="mb-6">
                  <label className="block text-xs text-rd-muted tracking-widest mb-2">
                    TELEGRAM USER ID
                  </label>
                  <input
                    type="text"
                    value={telegramId}
                    onChange={e => setTelegramId(e.target.value)}
                    placeholder="Enter your Telegram ID"
                    className="input-redacted"
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 border border-rd-red/50 bg-rd-red/10 text-rd-red text-sm">
                    &#x26A0; {error}
                  </div>
                )}

                {/* Check button */}
                <button
                  onClick={handleCheck}
                  disabled={isLoading}
                  className="w-full btn-redacted disabled:opacity-50 mb-6"
                >
                  {isLoading ? 'SEARCHING...' : '&#x2588; CHECK STATUS &#x2588;'}
                </button>

                {/* Result */}
                {checkResult && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 border border-rd-red/20 bg-rd-red/5"
                  >
                    <div className="text-xs text-rd-muted tracking-widest mb-2">
                      STATUS: REGISTERED &#x2705;
                    </div>
                    <div className="text-xl font-bold text-rd-red">
                      1,000 RDX
                    </div>
                    <div className="text-xs text-rd-muted/50 mt-2">
                      Wallet: {checkResult.walletAddress.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-rd-muted/50">
                      Registered: {new Date(checkResult.registeredAt).toLocaleDateString()}
                    </div>
                  </motion.div>
                )}

                {checkResult === null && telegramId && !isLoading && (
                  <div className="text-center text-rd-muted/50 text-sm">
                    NOT FOUND — Register to claim your airdrop
                  </div>
                )}

                <button
                  onClick={() => setStep('landing')}
                  className="w-full py-3 border border-rd-muted/30 text-rd-muted text-sm hover:border-rd-muted/50 transition-colors mt-4"
                >
                  &#x2190; BACK
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="max-w-6xl mx-auto px-4 mt-20 pt-8 border-t border-rd-muted/10 text-center">
          <p className="text-xs text-rd-muted/30 tracking-widest">
            REDACTED PROTOCOL © 2026 — THE FILE IS BREATHING
          </p>
          <p className="text-xs text-rd-muted/20 mt-1">
            &#x2588;&#x2588;&#x2588; CANNOT BE REDACTED &#x2588;&#x2588;&#x2588;
          </p>
        </div>
      </div>
    </div>
  )
}
