'use client'

import { motion } from 'framer-motion'

export function TokenomicsSection() {
  const allocations = [
    { label: 'Community Airdrop', pct: 40, amount: '400M', vesting: 'Immediate', color: 'bg-rd-red' },
    { label: 'Liquidity Pool', pct: 20, amount: '200M', vesting: 'LP Burn', color: 'bg-rd-purple' },
    { label: 'Staking Rewards', pct: 15, amount: '150M', vesting: '24 months', color: 'bg-blue-500' },
    { label: 'Team (Vested)', pct: 15, amount: '150M', vesting: '6mo cliff', color: 'bg-yellow-500' },
    { label: 'Treasury / DAO', pct: 10, amount: '100M', vesting: 'DAO Vote', color: 'bg-green-500' },
  ]

  return (
    <section id="tokenomics" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">
            FILE #0003
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-text">$RDX</span>{' '}
            <span className="text-rd-red">TOKENOMICS</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm">
            TOTAL SUPPLY: 1,000,000,000 RDX
          </p>
        </div>

        {/* Distribution bars */}
        <div className="space-y-4 mb-16">
          {allocations.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rd-card"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-rd-text tracking-wider">{item.label}</span>
                <span className="text-rd-red font-bold">{item.pct}%</span>
              </div>
              <div className="w-full h-2 bg-rd-border rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={`h-full ${item.color}`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-rd-muted/40 tracking-widest">
                <span>{item.amount} RDX</span>
                <span>{item.vesting}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Utility */}
        <div className="rd-card">
          <div className="text-center mb-8">
            <div className="text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">
              TOKEN UTILITY
            </div>
            <div className="text-xl font-bold text-rd-text">
              WHAT CAN YOU DO WITH $RDX?
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '\u{1F4C4}', title: 'Document Processing', desc: 'Pay 0.1 RDX per document analysis' },
              { icon: '\u{1F512}', title: 'Staking', desc: 'Earn 70% of protocol fees' },
              { icon: '\u{1F5F3}\u{FE0F}', title: 'Governance', desc: 'Vote on protocol parameters' },
              { icon: '\u{1F5BC}\u{FE0F}', title: 'Archivo 0 NFTs', desc: 'Mint rare declassified fragments' },
              { icon: '\u{1F50D}', title: 'Premium API', desc: 'Access advanced search' },
              { icon: '\u{1F381}', title: 'Rewards', desc: 'Earn for submissions & verification' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-4 border border-rd-border hover:border-rd-red/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-rd-text mb-1">{item.title}</div>
                    <div className="text-xs text-rd-muted/50">{item.desc}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Token contracts section */}
        <div className="mt-8 rd-card">
          <div className="text-center mb-6">
            <div className="text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">
              TOKEN CONTRACTS
            </div>
            <div className="text-lg font-bold text-rd-text">
              PROGRAM ADDRESSES
            </div>
          </div>

          <div className="space-y-3">
            {[
              { name: 'RDX Token', address: 'REPLACEME_TOKEN_MINT_ADDRESS' },
              { name: 'Fragment Program', address: 'RDfrag11111111111111111111111111111111111111' },
              { name: 'Staking Program', address: 'RDstk111111111111111111111111111111111111111' },
              { name: 'Rewards Program', address: 'RDrew111111111111111111111111111111111111111' },
              { name: 'Treasury Program', address: 'RDtr11111111111111111111111111111111111111' },
            ].map((prog, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-rd-border gap-2">
                <span className="text-sm text-rd-text font-bold">{prog.name}</span>
                <code className="text-xs text-rd-red/70 bg-rd-red/5 px-2 py-1 break-all text-center sm:text-right">
                  {prog.address}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
