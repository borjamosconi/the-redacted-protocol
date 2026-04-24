'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'

const VAULT = new PublicKey('BWhHF85ZNoR3x7GhoxhXEK6C4bBZvCyMFDZfMWNRXiME')
const HARD_CAP_SOL  = 500
const RDX_PER_SOL   = 1_400_000   // 1 SOL = 1.4M RDX  →  500 SOL = 700M RDX
const MIN_BUY_SOL   = 0.1
const MAX_BUY_SOL   = 10
// Presale ends 14 days from a fixed start (kept server-side agnostic)
const PRESALE_END_TS = 1747180800  // 2026-05-14 00:00 UTC

interface PresaleStats {
  totalRaised: number
  participants: number
  userContribution: number
  userAllocation: number
}

interface ClaimStatus {
  presaleAllocation: number
  bondingAllocation: number
  totalClaimable: number
  claimed: boolean
  claimTxSignature?: string
}

export function PresalePanel() {
  const { connection }              = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const [buyAmount, setBuyAmount]   = useState('1')
  const [loading, setLoading]       = useState(false)
  const [status, setStatus]         = useState<{ type: 'idle'|'pending'|'success'|'error'; msg: string }>({ type: 'idle', msg: '' })
  const [stats, setStats]           = useState<PresaleStats>({ totalRaised: 0, participants: 0, userContribution: 0, userAllocation: 0 })
  const [now, setNow]               = useState(Math.floor(Date.now() / 1000))

  // Claim state
  const [claimStatus, setClaimStatus]   = useState<ClaimStatus | null>(null)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimMsg, setClaimMsg]         = useState<{ type: 'idle'|'success'|'error'; msg: string }>({ type: 'idle', msg: '' })

  // Countdown ticker
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  // Load stats from API
  useEffect(() => {
    fetchStats()
  }, [publicKey])

  // Load claim status when presale ends and wallet is connected
  useEffect(() => {
    if (publicKey) fetchClaimStatus()
  }, [publicKey])

  const fetchStats = async () => {
    try {
      const url = publicKey ? `/api/presale?wallet=${publicKey.toString()}` : '/api/presale'
      const res = await fetch(url)
      if (res.ok) setStats(await res.json())
    } catch { /* silent */ }
  }

  const fetchClaimStatus = async () => {
    if (!publicKey) return
    try {
      const res = await fetch(`/api/claim?wallet=${publicKey.toString()}`)
      if (res.ok) setClaimStatus(await res.json())
    } catch { /* silent */ }
  }

  const timeLeft = PRESALE_END_TS - now
  const days     = Math.max(0, Math.floor(timeLeft / 86400))
  const hours    = Math.max(0, Math.floor((timeLeft % 86400) / 3600))
  const mins     = Math.max(0, Math.floor((timeLeft % 3600) / 60))
  const secs     = Math.max(0, timeLeft % 60)
  const ended    = timeLeft <= 0

  const solAmt   = Math.max(MIN_BUY_SOL, Math.min(MAX_BUY_SOL, parseFloat(buyAmount) || 0))
  const rdxOut   = Math.floor(solAmt * RDX_PER_SOL)
  const progress = Math.min(100, (stats.totalRaised / HARD_CAP_SOL) * 100)

  const handleBuy = async () => {
    if (!publicKey) return
    const amount = parseFloat(buyAmount)
    if (isNaN(amount) || amount < MIN_BUY_SOL || amount > MAX_BUY_SOL) {
      setStatus({ type: 'error', msg: `Amount must be ${MIN_BUY_SOL}–${MAX_BUY_SOL} SOL` })
      return
    }
    if (ended) {
      setStatus({ type: 'error', msg: 'Presale has ended.' })
      return
    }
    if (stats.totalRaised >= HARD_CAP_SOL) {
      setStatus({ type: 'error', msg: 'Hard cap reached — presale full.' })
      return
    }

    setLoading(true)
    setStatus({ type: 'pending', msg: 'Checking balance...' })

    try {
      const balance = await connection.getBalance(publicKey)
      const needed  = Math.floor(amount * LAMPORTS_PER_SOL) + 10_000 // + gas
      if (balance < needed) {
        throw new Error(`Insufficient SOL. Need ${amount} + gas.`)
      }

      setStatus({ type: 'pending', msg: 'Waiting for wallet approval...' })
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey:   VAULT,
          lamports:   Math.floor(amount * LAMPORTS_PER_SOL),
        })
      )

      const sig = await sendTransaction(tx, connection)
      setStatus({ type: 'pending', msg: 'Confirming on-chain...' })
      await connection.confirmTransaction(sig, 'confirmed')

      // Record contribution — server verifies on-chain before saving
      const apiRes = await fetch('/api/presale', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet: publicKey.toString(), solAmount: amount, txSignature: sig }),
      })
      const apiData = await apiRes.json()

      if (apiData.rdxSent && apiData.rdxTxSignature) {
        setStatus({ type: 'success', msg: `Sent! ${rdxOut.toLocaleString()} RDX in wallet. Tx: ${apiData.rdxTxSignature.slice(0,8)}...` })
      } else {
        setStatus({ type: 'success', msg: `${rdxOut.toLocaleString()} RDX allocated. Claim after launch. Tx: ${sig.slice(0,8)}...` })
      }
      fetchStats()
      fetchClaimStatus()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transaction failed.'
      setStatus({ type: 'error', msg })
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!publicKey) return
    if (!claimStatus || claimStatus.totalClaimable <= 0) return

    setClaimLoading(true)
    setClaimMsg({ type: 'idle', msg: '' })

    try {
      const res = await fetch('/api/claim', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet: publicKey.toString() }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Claim failed')
      }

      setClaimMsg({
        type: 'success',
        msg: `${data.rdxClaimed.toLocaleString()} RDX claimed! Tx: ${data.txSignature.slice(0,8)}...`,
      })
      fetchClaimStatus()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Claim failed.'
      setClaimMsg({ type: 'error', msg })
    } finally {
      setClaimLoading(false)
    }
  }

  // Show claim section when presale has ended AND wallet has allocation AND not yet claimed
  const showClaimSection =
    ended &&
    publicKey &&
    claimStatus !== null &&
    (claimStatus.totalClaimable > 0 || claimStatus.claimed)

  return (
    <div className="rd-card relative overflow-hidden">
      {/* Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-red-600/8 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="p-6 sm:p-8 border-b border-red-900/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ff1a1a]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/80">Live Now</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">$RDX Presale</h2>
            <p className="text-[10px] text-gray-600 font-mono mt-1 tracking-wider">FAIR LAUNCH — NO WHITELIST — 1 SOL = {RDX_PER_SOL.toLocaleString()} RDX</p>
          </div>

          {/* Countdown */}
          {!ended ? (
            <div className="flex gap-2 flex-shrink-0">
              {[
                { v: days,  l: 'D' },
                { v: hours, l: 'H' },
                { v: mins,  l: 'M' },
                { v: secs,  l: 'S' },
              ].map(({ v, l }) => (
                <div key={l} className="flex flex-col items-center bg-red-950/20 border border-red-900/20 rounded px-3 py-2 min-w-[48px]">
                  <span className="text-lg font-black text-white font-mono leading-none">{String(v).padStart(2, '0')}</span>
                  <span className="text-[9px] text-gray-600 font-mono">{l}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-2 border border-gray-700 rounded text-xs font-mono text-gray-500">PRESALE ENDED</div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 sm:px-8 py-6 border-b border-red-900/10">
        <div className="flex justify-between items-end mb-3">
          <div>
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">SOL Raised</div>
            <div className="text-2xl font-black text-white font-mono">
              {stats.totalRaised.toLocaleString()}
              <span className="text-sm text-gray-600 font-normal ml-1">/ {HARD_CAP_SOL.toLocaleString()} SOL</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5">Progress</div>
            <div className="text-xl font-black text-red-500 font-mono">{progress.toFixed(1)}%</div>
          </div>
        </div>
        <div className="h-3 w-full bg-red-950/10 rounded-full border border-red-900/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400"
          >
            <div className="absolute inset-0 animate-pulse bg-white/10" />
          </motion.div>
        </div>
        <div className="flex justify-between mt-2 text-[9px] font-mono text-gray-700">
          <span>{stats.participants.toLocaleString()} participants</span>
          <span>{(HARD_CAP_SOL - stats.totalRaised).toLocaleString()} SOL remaining</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-red-900/10">
        {[
          { label: 'Rate',     value: `${(RDX_PER_SOL / 1_000_000).toFixed(1)}M RDX/SOL` },
          { label: 'Min Buy',  value: `${MIN_BUY_SOL} SOL` },
          { label: 'Max Buy',  value: `${MAX_BUY_SOL} SOL` },
          { label: 'Hard Cap', value: `${HARD_CAP_SOL} SOL` },
        ].map((s) => (
          <div key={s.label} className="bg-black/40 p-4 text-center">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">{s.label}</div>
            <div className="text-xs font-bold text-white font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Buy section */}
      <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Input */}
        <div>
          <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-3">Amount (SOL)</label>
          <div className="relative mb-3">
            <input
              type="number"
              step="0.1"
              min={MIN_BUY_SOL}
              max={MAX_BUY_SOL}
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              className="w-full bg-black/60 border border-red-900/20 focus:border-red-500/50 outline-none px-4 py-3 text-white font-mono text-lg rounded-sm transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600">SOL</span>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mb-4">
            {[0.5, 1, 2, 5].map((v) => (
              <button
                key={v}
                onClick={() => setBuyAmount(String(v))}
                className={`flex-1 py-1.5 text-[9px] font-bold border rounded-sm transition-all ${
                  buyAmount === String(v)
                    ? 'border-red-500/60 bg-red-500/10 text-red-400'
                    : 'border-red-900/20 text-gray-600 hover:border-red-900/40 hover:text-gray-400'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* You receive */}
          <div className="flex justify-between items-center py-3 border-t border-red-900/10 mb-4">
            <span className="text-[10px] text-gray-600 font-mono">You receive</span>
            <span className="text-sm font-black text-white font-mono">
              {solAmt > 0 ? rdxOut.toLocaleString() : '—'} <span className="text-red-500">RDX</span>
            </span>
          </div>

          <button
            onClick={handleBuy}
            disabled={loading || !publicKey || ended}
            className="w-full py-4 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_0_20px_rgba(255,26,26,0.2)] hover:shadow-[0_0_30px_rgba(255,26,26,0.35)] rounded-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : !publicKey ? 'Connect Wallet' : ended ? 'Presale Ended' : 'Contribute SOL'}
          </button>

          {/* Status */}
          <AnimatePresence mode="wait">
            {status.type !== 'idle' && (
              <motion.div
                key={status.msg}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-3 p-3 rounded-sm text-[10px] font-mono tracking-wider border ${
                  status.type === 'success' ? 'border-green-900/30 bg-green-950/20 text-green-400' :
                  status.type === 'error'   ? 'border-red-900/30 bg-red-950/20 text-red-400' :
                  'border-yellow-900/30 bg-yellow-950/10 text-yellow-500'
                }`}
              >
                {status.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Your allocation */}
        <div className="flex flex-col gap-4">
          <div className="rd-card p-5 flex-1 flex flex-col justify-between">
            <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-4">Your Allocation</div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-mono">Contributed</span>
                <span className="text-sm font-bold text-white font-mono">{stats.userContribution.toFixed(2)} SOL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-mono">Allocation</span>
                <span className="text-sm font-bold text-red-400 font-mono">{stats.userAllocation.toLocaleString()} RDX</span>
              </div>
              <div className="h-px bg-red-900/10" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-mono">Status</span>
                <span className={`text-[10px] font-bold font-mono ${ended ? 'text-green-400' : 'text-yellow-500'}`}>
                  {ended ? 'CLAIMABLE' : 'LOCKED UNTIL LAUNCH'}
                </span>
              </div>
            </div>

            <button
              disabled={!ended || stats.userAllocation === 0}
              className="w-full py-3 border border-red-900/20 text-[10px] font-black uppercase tracking-widest text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-500/30 hover:text-white transition-all rounded-sm"
            >
              {ended && stats.userAllocation > 0 ? 'Claim RDX' : 'Claim Locked Until Launch'}
            </button>
          </div>

          {/* Vault info */}
          <div className="rd-card p-4">
            <div className="text-[9px] text-gray-700 uppercase tracking-widest mb-2">Vault Address</div>
            <div className="text-[9px] font-mono text-gray-600 break-all select-all hover:text-gray-400 transition-colors cursor-text">
              {VAULT.toString()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Claim RDX Section ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showClaimSection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mx-6 sm:mx-8 mb-6 sm:mb-8 border border-green-900/20 bg-green-950/10 rounded-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500/80">Token Claim</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div className="bg-black/30 border border-green-900/10 rounded-sm p-4">
                  <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Presale</div>
                  <div className="text-base font-black text-white font-mono">
                    {(claimStatus?.presaleAllocation ?? 0).toLocaleString()}
                    <span className="text-[10px] text-green-500 ml-1">RDX</span>
                  </div>
                </div>
                <div className="bg-black/30 border border-green-900/10 rounded-sm p-4">
                  <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Bonding Curve</div>
                  <div className="text-base font-black text-white font-mono">
                    {(claimStatus?.bondingAllocation ?? 0).toLocaleString()}
                    <span className="text-[10px] text-green-500 ml-1">RDX</span>
                  </div>
                </div>
                <div className="bg-black/30 border border-green-900/10 rounded-sm p-4">
                  <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Total Claimable</div>
                  <div className="text-base font-black text-green-400 font-mono">
                    {(claimStatus?.totalClaimable ?? 0).toLocaleString()}
                    <span className="text-[10px] text-green-500 ml-1">RDX</span>
                  </div>
                </div>
              </div>

              {claimStatus?.claimed ? (
                <div className="flex flex-col gap-2">
                  <div className="py-3 px-4 border border-green-900/30 bg-green-950/20 text-[10px] font-mono text-green-400 rounded-sm text-center">
                    Tokens already claimed
                  </div>
                  {claimStatus.claimTxSignature && (
                    <div className="text-[9px] font-mono text-gray-600 text-center">
                      Tx: {claimStatus.claimTxSignature.slice(0, 20)}...
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={handleClaim}
                    disabled={claimLoading || (claimStatus?.totalClaimable ?? 0) <= 0}
                    className="w-full py-4 bg-gradient-to-r from-green-800 to-green-600 hover:from-green-700 hover:to-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_0_20px_rgba(34,197,94,0.15)] hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] rounded-sm"
                  >
                    {claimLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Claiming...
                      </span>
                    ) : (
                      `Claim ${(claimStatus?.totalClaimable ?? 0).toLocaleString()} RDX`
                    )}
                  </button>

                  <AnimatePresence mode="wait">
                    {claimMsg.type !== 'idle' && (
                      <motion.div
                        key={claimMsg.msg}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`mt-3 p-3 rounded-sm text-[10px] font-mono tracking-wider border ${
                          claimMsg.type === 'success'
                            ? 'border-green-900/30 bg-green-950/20 text-green-400'
                            : 'border-red-900/30 bg-red-950/20 text-red-400'
                        }`}
                      >
                        {claimMsg.msg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
