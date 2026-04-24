'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'

// --- Types ---
interface PresaleState {
  totalRaised: number;
  hardCap: number;
  endTime: number;
  startTime: number;
  isActive: boolean;
  isLaunched: boolean;
  participants: number;
  userContribution: number;
  userAllocation: number;
}

export function PresalePanel() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  
  const [state, setState] = useState<PresaleState>({
    totalRaised: 1250, // SOL (Mock)
    hardCap: 5000,
    startTime: Date.now() / 1000 - 3600,
    endTime: Date.now() / 1000 + 86400 * 6,
    isActive: true,
    isLaunched: false,
    participants: 452,
    userContribution: 0,
    userAllocation: 0
  })

  const [buyAmount, setBuyAmount] = useState<string>('1')
  const [loading, setLoading] = useState(false)
  const [txStatus, setTxStatus] = useState<string | null>(null)

  const progress = (state.totalRaised / state.hardCap) * 100
  const timeLeft = state.endTime - Date.now() / 1000
  const days = Math.floor(timeLeft / 86400)
  const hours = Math.floor((timeLeft % 86400) / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)

  const handleBuy = async () => {
    if (!publicKey) return
    setLoading(true)
    setTxStatus('Initializing transaction...')
    try {
      // Logic for Anchor call would go here
      // For now, we simulate a delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTxStatus('Success! RDX allocated.')
      setTimeout(() => setTxStatus(null), 3000)
    } catch (e) {
      setTxStatus('Error executing protocol.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rd-card p-8 relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ff1a1a]" />
            <h2 className="text-xl font-black tracking-widest text-white uppercase">RDX Presale</h2>
          </div>
          <p className="text-xs text-rd-muted/60 font-mono tracking-wider uppercase">Fair Launch Protocol — No Whitelist Required</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-rd-muted uppercase tracking-widest mb-1">Ends In</div>
            <div className="text-xl font-bold text-white font-mono flex gap-2">
              <span className="bg-red-950/20 px-2 py-1 rounded border border-red-900/20">{days}D</span>
              <span className="bg-red-950/20 px-2 py-1 rounded border border-red-900/20">{hours}H</span>
              <span className="bg-red-950/20 px-2 py-1 rounded border border-red-900/20">{minutes}M</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-10">
        <div className="flex justify-between items-end mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-rd-muted/40 uppercase tracking-widest mb-1">SOL Raised</span>
            <span className="text-2xl font-black text-white font-mono">
              {state.totalRaised.toLocaleString()} <span className="text-rd-red/50 text-sm">/ {state.hardCap.toLocaleString()}</span>
            </span>
          </div>
          <div className="text-right">
             <span className="text-[10px] text-rd-muted/40 uppercase tracking-widest mb-1">Progress</span>
             <div className="text-lg font-bold text-red-500 font-mono">{progress.toFixed(2)}%</div>
          </div>
        </div>
        <div className="h-3 w-full bg-red-950/10 rounded-full border border-red-900/10 overflow-hidden relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-400 relative"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            <div className="absolute inset-0 animate-pulse bg-white/20 blur-md" />
          </motion.div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Phase', value: 'EARLY BIRD', color: 'text-red-400' },
          { label: 'RDX/SOL', value: '1,000,000', color: 'text-white' },
          { label: 'Min Buy', value: '0.1 SOL', color: 'text-white' },
          { label: 'Participants', value: state.participants.toLocaleString(), color: 'text-white' },
        ].map((stat, i) => (
          <div key={i} className="bg-red-950/5 border border-red-900/10 p-4 rounded-sm">
            <div className="text-[9px] text-rd-muted uppercase tracking-[0.2em] mb-1">{stat.label}</div>
            <div className={`text-sm font-bold font-mono ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Interaction Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-red-900/10">
        <div>
          <h3 className="text-xs font-bold text-rd-muted/50 uppercase tracking-[0.3em] mb-4">Participate</h3>
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <input 
                type="number" 
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="w-full bg-black border border-red-900/20 rounded-sm px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-red-500/50 transition-all"
                placeholder="Amount in SOL"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-rd-red/40 font-bold tracking-widest">SOL</span>
            </div>
            <button 
              onClick={handleBuy}
              disabled={loading || !publicKey}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-sm font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_0_20px_rgba(255,26,26,0.2)] hover:shadow-[0_0_30px_rgba(255,26,26,0.4)]"
            >
              {loading ? 'Processing...' : 'Contribute'}
            </button>
          </div>
          <AnimatePresence>
            {txStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-[10px] font-mono text-red-400 tracking-widest uppercase animate-pulse"
              >
                {txStatus}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-red-950/5 p-6 rounded-sm border border-red-900/10 flex flex-col justify-center">
           <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] text-rd-muted uppercase tracking-widest">Your Allocation</span>
              <span className="text-lg font-bold text-white font-mono">{(state.userContribution * 1000000).toLocaleString()} RDX</span>
           </div>
           <button 
            disabled={!state.isLaunched}
            className="w-full py-2.5 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-sm hover:bg-red-500/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
           >
             {state.isLaunched ? 'Claim Tokens' : 'Claim Locked Until Launch'}
           </button>
        </div>
      </div>
    </div>
  )
}
