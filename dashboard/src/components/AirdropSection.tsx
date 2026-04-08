'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { motion } from 'framer-motion'
import { useState } from 'react'

export function AirdropSection() {
  const { connected, publicKey } = useWallet()
  const [telegramId, setTelegramId] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registeredData, setRegisteredData] = useState<{
    amount: string;
    wallet: string;
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
      const res = await fetch('/api/airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramId.trim(),
          walletAddress: publicKey.toString(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 400 && data.status === 'already_registered') {
          setError(`Already registered — Wallet: ${data.walletAddress.slice(0, 8)}...${data.walletAddress.slice(-6)}, Amount: ${data.amountFormatted}`)
          return
        }
        setError(data.error || 'REGISTRATION FAILED')
        return
      }

      setRegisteredData({
        amount: data.amountFormatted,
        wallet: publicKey.toString(),
      })
      setSubmitted(true)
    } catch {
      setError('NETWORK ERROR — PLEASE TRY AGAIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="airdrop" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">
            FILE #0001
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-red">$RDX</span>{' '}
            <span className="text-rd-text">AIRDROP</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm">
            1,000 RDX GUARANTEED FOR EVERY EARLY USER
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { label: 'TOTAL AIRDROP POOL', value: '400,000,000', sub: 'RDX TOKENS' },
            { label: 'PER USER', value: '1,000', sub: 'RDX GUARANTEED' },
            { label: 'BONUSES', value: '+150', sub: 'RDX PER ACTION' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rd-card text-center"
            >
              <div className="text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">{item.label}</div>
              <div className="text-2xl md:text-3xl font-bold text-rd-red">{item.value}</div>
              <div className="text-[10px] text-rd-muted/40 mt-1 tracking-widest">{item.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Registration form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rd-card max-w-lg mx-auto"
        >
          {submitted && registeredData ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">████████</div>
              <div className="text-xl font-bold text-rd-red mb-2">ACCESS GRANTED</div>
              <p className="text-rd-muted/60 text-sm mb-4">
                Your wallet has been registered for the $RDX airdrop.
              </p>
              <div className="text-xs text-rd-muted/40 space-y-1">
                <p>Telegram: {telegramId}</p>
                <p>Wallet: {registeredData.wallet.slice(0, 8)}...{registeredData.wallet.slice(-6)}</p>
                <p className="text-rd-red font-bold">Allocation: {registeredData.amount}</p>
              </div>
              <button
                onClick={() => { setSubmitted(false); setTelegramId(''); setRegisteredData(null) }}
                className="btn-ghost mt-6"
              >
                REGISTER ANOTHER
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-rd-border pb-4 mb-6">
                <div className="text-[10px] text-rd-muted/50 tracking-[0.2em] mb-1">
                  REGISTRATION FORM
                </div>
                <div className="text-lg font-bold text-rd-text">
                  CONNECT WALLET & REGISTER
                </div>
              </div>

              {/* Wallet connection */}
              <div className="mb-6">
                <label className="block text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">
                  SOLANA WALLET
                </label>
                {connected ? (
                  <div className="p-3 border border-rd-red/20 bg-rd-red/5 font-mono text-sm text-rd-red break-all">
                    {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-6)}
                    <span className="ml-2 text-green-500 text-xs">&#x2713; CONNECTED</span>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <WalletMultiButton className="!bg-rd-red/10 !border !border-rd-red/30 !text-rd-red !font-mono !text-xs !tracking-widest hover:!bg-rd-red hover:!text-rd-black !transition-all !w-full !justify-center" />
                  </div>
                )}
              </div>

              {/* Telegram ID */}
              <div className="mb-6">
                <label className="block text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">
                  TELEGRAM USER ID
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
                  className="mb-4 p-3 border border-rd-red/40 bg-rd-red/10 text-rd-red text-xs tracking-wider"
                >
                  &#x26A0; {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!connected || !telegramId || loading}
                className="w-full btn-redacted disabled:opacity-40"
              >
                {loading ? 'REGISTERING...' : '\u2588 REGISTER FOR AIRDROP \u2588'}
              </button>

              {/* Bonus info */}
              <div className="mt-6 pt-4 border-t border-rd-border">
                <div className="text-[10px] text-rd-muted/40 tracking-widest mb-2">EARN MORE RDX</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-rd-muted/50">
                  <div>&#x1F4C4; Submit document: <span className="text-rd-red">+100 RDX</span></div>
                  <div>&#x2705; Verify fragment: <span className="text-rd-red">+50 RDX</span></div>
                  <div>&#x1F4E2; Publish: <span className="text-rd-red">+25 RDX</span></div>
                  <div>&#x1F465; Referral: <span className="text-rd-red">+50 RDX</span></div>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Check status link */}
        <div className="text-center mt-8">
          <a
            href="https://t.me/theredacted_bot"
            target="_blank"
            rel="noopener"
            className="text-xs text-rd-muted/40 hover:text-rd-red/70 transition-colors tracking-widest"
          >
            CHECK STATUS ON TELEGRAM &#x2192;
          </a>
        </div>
      </div>
    </section>
  )
}
