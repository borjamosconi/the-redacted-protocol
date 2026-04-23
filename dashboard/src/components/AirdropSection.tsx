'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { getDeviceFingerprint } from '@/lib/antifraud'

export function AirdropSection() {
  const { connected, publicKey } = useWallet()
  const [telegramId, setTelegramId] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registeredData, setRegisteredData] = useState<{
    amount: string;
    wallet: string;
    xp: number;
    level: string;
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!telegramId.trim()) {
      setError('TELEGRAM ID REQUIRED')
      return
    }
    if (!connected || !publicKey) {
      setError('CONNECT WALLET FIRST')
      return
    }

    setLoading(true)

    try {
      const deviceFingerprint = getDeviceFingerprint()

      const res = await fetch('/api/airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramId.trim(),
          walletAddress: publicKey.toString(),
          deviceFingerprint,
          referredBy: getReferralFromURL(),
        }),
      })

      const data = await res.json()

      if (res.status === 200 && data.status === 'already_registered') {
        setRegisteredData({
          amount: data.amountFormatted,
          wallet: data.walletAddress,
          xp: data.xp,
          level: data.level,
        })
        setSubmitted(true)
        return
      }

      if (!res.ok) {
        if (res.status === 429) {
          setError(`RATE LIMITED — Wait ${data.retryAfter}s and try again`)
          return
        }
        if (res.status === 400) {
          setError(data.error || 'ALREADY REGISTERED')
          return
        }
        setError(data.error || 'REGISTRATION FAILED')
        return
      }

      setRegisteredData({
        amount: data.amountFormatted,
        wallet: publicKey.toString(),
        xp: data.xp,
        level: data.level,
      })
      setSubmitted(true)
    } catch {
      setError('NETWORK ERROR — PLEASE TRY AGAIN')
    } finally {
      setLoading(false)
    }
  }

  const getReferralFromURL = (): string | null => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('ref')
  }

  return (
    <section id="airdrop" className="py-24 sm:py-32 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-gray-600 tracking-[0.3em] uppercase mb-4">
            File #0001
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            <span className="text-red-500 neon-red">$RDX</span>{' '}
            <span className="text-white">Airdrop</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-red-900/40" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-red-900/40" />
          </div>
          <p className="text-gray-400 text-sm sm:text-base tracking-wide">
            500 RDX base + 200 RDX wallet bonus ={' '}
            <span className="text-white font-semibold">700 RDX guaranteed</span>
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { label: 'Total Airdrop Pool', value: '400M', sub: 'RDX tokens' },
            { label: 'Per User', value: '700', sub: 'RDX (500 + 200 bonus)' },
            { label: 'Action Bonus', value: '+150', sub: 'RDX per action' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="rd-card text-center py-6"
            >
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">{item.label}</div>
              <div className="text-3xl font-bold text-red-500 mb-1">{item.value}</div>
              <div className="text-xs text-gray-600">{item.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Registration form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rd-card max-w-lg mx-auto"
        >
          {submitted && registeredData ? (
            <div className="text-center py-10">
              {/* Access granted icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl border border-red-900/40 bg-red-950/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Access Granted</h3>
              <p className="text-gray-400 text-sm mb-6">
                Your wallet is registered for the $RDX airdrop.
              </p>

              <div className="space-y-3 mb-8 text-left max-w-sm mx-auto">
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Telegram ID</span>
                  <span className="text-sm text-white font-mono">{telegramId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Wallet</span>
                  <span className="text-sm text-white font-mono">
                    {registeredData.wallet.slice(0, 6)}...{registeredData.wallet.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-gray-500">Allocation</span>
                  <span className="text-sm text-red-400 font-bold">{registeredData.amount} RDX</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">XP / Level</span>
                  <span className="text-sm text-purple-400 font-mono">
                    {registeredData.xp} · Lv.{registeredData.level}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-red-900/20 bg-red-950/10 mb-6">
                <p className="text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">Unlock Gamification</p>
                <p className="text-sm text-gray-300">
                  Check in daily for XP, complete quests, and earn bonus RDX.
                </p>
              </div>

              <button
                onClick={() => { setSubmitted(false); setTelegramId(''); setRegisteredData(null) }}
                className="btn-ghost"
              >
                Register Another
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-white/[0.04] pb-5 mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">Register for Airdrop</h3>
                <p className="text-sm text-gray-500">Connect your wallet and link your Telegram ID.</p>
              </div>

              {/* Wallet connection */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
                  Solana Wallet
                </label>
                {connected ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-green-900/30 bg-green-950/10">
                    <div className="w-8 h-8 rounded-lg bg-green-950/40 border border-green-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-mono text-green-400">Connected</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-6)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <WalletMultiButton
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 26, 26, 0.35)',
                      color: '#ff1a1a',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      height: '48px',
                      padding: '0 1.5rem',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textTransform: 'uppercase',
                      width: '100%',
                    }}
                  />
                )}
              </div>

              {/* Telegram ID */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
                  Telegram User ID
                </label>
                <input
                  type="text"
                  value={telegramId}
                  onChange={e => setTelegramId(e.target.value)}
                  placeholder="Find in @userinfobot on Telegram"
                  className="input-rd"
                />
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-5 p-4 rounded-lg border border-red-900/40 bg-red-950/20"
                >
                  <p className="text-sm font-mono text-red-400">⚠ {error}</p>
                </motion.div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!connected || !telegramId || loading}
                className="w-full btn-redacted text-sm py-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                    Registering...
                  </span>
                ) : (
                  'Register for Airdrop'
                )}
              </button>

              {/* XP Info */}
              <div className="mt-6 pt-5 border-t border-white/[0.04]">
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">
                  Earn XP → More RDX
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { action: 'Daily check-in', xp: '+25 XP' },
                    { action: 'OCR scan', xp: '+50 XP' },
                    { action: 'News scan', xp: '+30 XP' },
                    { action: 'Referral', xp: '+200 XP' },
                    { action: 'Gen image', xp: '+40 XP' },
                    { action: '7-day streak', xp: '+500 XP' },
                  ].map((item) => (
                    <div key={item.action} className="flex justify-between text-xs">
                      <span className="text-gray-500">{item.action}</span>
                      <span className="text-red-400 font-mono">{item.xp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Check status */}
        <div className="text-center mt-8">
          <a
            href="https://t.me/theredacted_bot"
            target="_blank"
            rel="noopener"
            className="text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            Check status on Telegram →
          </a>
        </div>
      </div>
    </section>
  )
}
