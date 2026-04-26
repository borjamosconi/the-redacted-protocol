'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { RDX_PUBLIC_KEYS } from '@/lib/rdx-public-config'

interface Proposal {
  id: string;
  title: string;
  description: string;
  votesFor: number;
  votesAgainst: number;
  endTime: number;
  status: 'active' | 'passed' | 'failed';
}

export function GovernancePanel({ rdxBalance = 0 }: { rdxBalance?: number }) {
  const { publicKey } = useWallet()
  const isAdmin = Boolean(publicKey && RDX_PUBLIC_KEYS.mainAuthority && publicKey.equals(RDX_PUBLIC_KEYS.mainAuthority))
  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: '1',
      title: 'Update Airdrop Multiplier',
      description: 'Increase the streak multiplier for users with >100 days streak to 2.5x.',
      votesFor: 1250000,
      votesAgainst: 450000,
      endTime: Date.now() / 1000 + 86400 * 2,
      status: 'active'
    },
    {
      id: '2',
      title: 'Protocol Fee Burn',
      description: 'Burn 5% of all transaction fees collected by the treasury quarterly.',
      votesFor: 8900000,
      votesAgainst: 120000,
      endTime: Date.now() / 1000 - 3600,
      status: 'passed'
    }
  ])

  const [activeTab, setActiveTab] = useState<'voting' | 'council'>('voting')
  const isCouncilMember = rdxBalance >= 10000

  return (
    <div className="rd-card p-8 min-h-[600px] flex flex-col">
      {/* Header Tabs */}
      <div className="flex gap-8 border-b border-red-900/10 mb-8">
        {['voting', 'council'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${
              activeTab === tab ? 'text-red-500' : 'text-rd-muted hover:text-white'
            }`}
          >
            {tab === 'voting' ? 'DAO Voting' : 'Protocol Council Chat'}
            {activeTab === tab && (
              <motion.div layoutId="govTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_10px_#ff1a1a]" />
            )}
            {tab === 'council' && !isCouncilMember && (
              <span className="ml-2 text-[8px] text-red-900 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-900/20">LOCKED</span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {activeTab === 'voting' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold text-rd-muted uppercase tracking-widest">Active Proposals</h3>
              <button className="btn-premium px-4 py-2 text-[8px]">New Proposal</button>
            </div>

            {proposals.map((proposal) => (
              <div key={proposal.id} className="bg-red-950/5 border border-red-900/10 p-6 rounded-sm group hover:border-red-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{proposal.title}</h4>
                    <p className="text-xs text-rd-muted/60 line-clamp-2">{proposal.description}</p>
                  </div>
                  <div className={`text-[8px] font-bold px-2 py-1 rounded border ${
                    proposal.status === 'active' ? 'border-red-500/50 text-red-500' : 'border-green-500/50 text-green-500'
                  }`}>
                    {proposal.status.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-rd-muted">Votes For</span>
                    <span className="text-white">{proposal.votesFor.toLocaleString()} RDX</span>
                  </div>
                  <div className="h-1.5 w-full bg-red-950/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 shadow-[0_0_10px_rgba(255,26,26,0.3)]" 
                      style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }} 
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 py-2 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all">Vote For</button>
                   <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all">Vote Against</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {!isCouncilMember ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 bg-red-500/5 rounded-full flex items-center justify-center mb-6 border border-red-900/20">
                   <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-widest">Protocol Council Access Denied</h3>
                <p className="text-xs text-rd-muted max-w-xs mb-8">
                  The Protocol Council is a private sanctuary for top stakeholders. 
                  You need at least <span className="text-red-500 font-bold">10,000 RDX</span> to enter.
                </p>
                <div className="p-4 bg-red-950/5 border border-red-900/10 rounded-sm w-full max-w-sm">
                  <div className="flex justify-between text-[10px] mb-2 font-mono">
                    <span className="text-rd-muted">Your Balance</span>
                    <span className="text-white">{rdxBalance.toLocaleString()} / 10,000 RDX</span>
                  </div>
                  <div className="h-1 w-full bg-red-950/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${(rdxBalance / 10000) * 100}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 bg-black/40 border border-red-900/10 rounded-sm p-6 mb-4 overflow-y-auto font-mono text-[11px] space-y-4">
                  <div className="text-red-400">
                    <span className="text-rd-muted">[22:14]</span> <span className="font-bold">SYSTEM:</span> Welcome to the Protocol Council, Councilor.
                  </div>
                  <div className="text-white">
                    <span className="text-rd-muted">[22:15]</span> <span className="text-red-500 font-bold">ALPHA_REDACTED:</span> We need to discuss the hardcap for the next phase.
                  </div>
                  <div className="text-white/60 italic">
                    Waiting for more Councilors to join...
                  </div>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Message the council..."
                    className="flex-1 bg-black border border-red-900/20 rounded-sm px-4 py-3 text-xs text-white focus:outline-none focus:border-red-500/40 transition-all"
                  />
                  <button className="bg-red-600 px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(255,26,26,0.2)]">Send</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
