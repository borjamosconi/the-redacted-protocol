'use client'

import { motion } from 'framer-motion'

/**
 * TokenomicsSection — what $RDX is, what it does.
 *
 * Positioning: pump.fun for classified / censored / redacted documents.
 * Anyone can launch a token tied to a leaked file, banned news article,
 * conspiracy thread, or whistleblower drop. The autonomous RDX-AGENT
 * continuously scans the news, flags censored content, and mints it as
 * tradeable NFTs and seed tokens. RDX is the gas of that ecosystem —
 * fees, governance, staking, agent operations.
 */

export function TokenomicsSection() {
  // No public presale. RDX is the FIRST token launched on the platform
  // itself, via the same bonding-curve mechanic everyone else will use.
  // The supply below is the genesis allocation that funds the protocol.
  const allocations = [
    {
      label:   'Launchpad Liquidity',
      pct:     30,
      amount:  '300M',
      vesting: 'Locked at launch',
      detail:  'Bonding curve seed + Raydium pool at graduation',
      color:   'bg-rd-red',
    },
    {
      label:   'Autonomous Agent',
      pct:     20,
      amount:  '200M',
      vesting: 'Continuous spend',
      detail:  'RDX-AGENT uses these to mint NFTs from censored news, fund infra, pay verifiers',
      color:   'bg-rd-purple',
    },
    {
      label:   'Community Missions',
      pct:     20,
      amount:  '200M',
      vesting: 'Earn on claim',
      detail:  'Gamified airdrop — complete missions to earn RDX',
      color:   'bg-blue-500',
    },
    {
      label:   'Staking Rewards',
      pct:     15,
      amount:  '150M',
      vesting: '24 months linear',
      detail:  'Stakers earn protocol fees + RDX emissions',
      color:   'bg-green-500',
    },
    {
      label:   'DAO Treasury',
      pct:     10,
      amount:  '100M',
      vesting: 'DAO vote',
      detail:  'Governance-controlled, funds proposals + the agent\'s research targets',
      color:   'bg-yellow-500',
    },
    {
      label:   'Team (Vested)',
      pct:     5,
      amount:  '50M',
      vesting: '12mo cliff + 24mo vest',
      detail:  'Long-term alignment',
      color:   'bg-gray-500',
    },
  ]

  const utility = [
    {
      icon:   '\u{1F310}',
      title:  'Launch a Token',
      desc:   'Pay 0.02 SOL or stake RDX to spawn a bonding-curve token for any classified file, banned article, or conspiracy thread.',
    },
    {
      icon:   '\u{1F916}',
      title:  'Direct the Agent',
      desc:   'Spend RDX to make RDX-AGENT chase a specific news angle, redaction, or whistleblower lead. Output: minted NFTs.',
    },
    {
      icon:   '\u{1F5F3}\u{FE0F}',
      title:  'DAO Governance',
      desc:   'Vote on which censored topics the agent prioritises, fee splits, listing rules, and treasury spend.',
    },
    {
      icon:   '\u{1F512}',
      title:  'Stake for Rewards',
      desc:   'Lock RDX to earn 70% of every token-launch fee + protocol emissions. Higher tiers vote with more weight.',
    },
    {
      icon:   '\u{1F5BC}\u{FE0F}',
      title:  'Mint Archivo 0 NFTs',
      desc:   'Each declassified fragment surfaced by the agent is mintable as a 1/1 NFT — the on-chain record of a redacted truth.',
    },
    {
      icon:   '\u{1F381}',
      title:  'Mission Rewards',
      desc:   'Submit fragments, verify others, refer users, share proofs. Each token launched reserves 5% for missions.',
    },
  ]

  return (
    <section id="tokenomics" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="text-center mb-16">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">FILE #0003</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-text">$RDX</span>{' '}
            <span className="text-rd-red">TOKENOMICS</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
          <p className="text-rd-muted/60 tracking-widest text-sm mb-2">
            TOTAL SUPPLY: 1,000,000,000 RDX
          </p>
          <p className="text-rd-muted/40 text-xs max-w-xl mx-auto leading-relaxed">
            Pump.fun for <span className="text-rd-red">classified documents</span>.
            Anyone launches a token for any redacted file, banned article, or
            conspiracy thread. The autonomous <span className="text-rd-red">RDX-AGENT</span>{' '}
            continuously scrapes news for censored content and mints it on-chain.
            RDX is the gas of the protocol — no public presale, the genesis
            supply funds liquidity, the agent, and the community.
          </p>
        </div>

        {/* ── Distribution bars ──────────────────────────────────────────── */}
        <div className="space-y-4 mb-16">
          {allocations.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
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
                  transition={{ duration: 1, delay: i * 0.06 }}
                  className={`h-full ${item.color}`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-rd-muted/40 tracking-widest mb-2">
                <span>{item.amount} RDX</span>
                <span>{item.vesting}</span>
              </div>
              <p className="text-[11px] text-rd-muted/55 leading-relaxed">{item.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Utility ────────────────────────────────────────────────────── */}
        <div className="rd-card mb-8">
          <div className="text-center mb-8">
            <div className="text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">
              TOKEN UTILITY
            </div>
            <div className="text-xl font-bold text-rd-text">
              WHAT $RDX DOES
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {utility.map((item, i) => (
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
                    <div className="text-xs text-rd-muted/55 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── How the launchpad works (pump.fun-for-docs flow) ─────────── */}
        <div className="rd-card">
          <div className="text-center mb-6">
            <div className="text-[10px] text-rd-muted/50 tracking-[0.2em] mb-2">
              THE LAUNCHPAD FLOW
            </div>
            <div className="text-lg font-bold text-rd-text">
              PUMP.FUN FOR REDACTED INTEL
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                n: '01',
                title: 'AGENT SCRAPES',
                body:  'RDX-AGENT continuously scans global news, flags censorship signals, and surfaces redacted fragments. Anyone can also submit a file manually.',
              },
              {
                n: '02',
                title: 'COMMUNITY LAUNCHES',
                body:  'Anyone clicks "Launch Token", attaches the document or news angle, pays the fee. A bonding-curve token spawns instantly.',
              },
              {
                n: '03',
                title: 'TRADE ON CURVE',
                body:  '800M token supply on a virtual-reserves curve (pump.fun mechanic). Buy / sell from the terminal. Live chart. Live trades.',
              },
              {
                n: '04',
                title: 'GRADUATION',
                body:  'When the curve fills (~85 SOL raised), liquidity migrates to a Raydium pool with LP locked permanently. 5% of the supply is reserved for missions.',
              },
              {
                n: '05',
                title: 'NFT + ARCHIVE',
                body:  'The original document is minted as an Archivo 0 NFT — the on-chain record of the redacted truth. Holders earn from every related token launched.',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 border border-rd-red/30 flex items-center justify-center text-rd-red font-mono text-xs font-bold">
                  {s.n}
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-xs font-bold text-rd-text tracking-widest mb-1">{s.title}</div>
                  <div className="text-[11px] text-rd-muted/55 leading-relaxed">{s.body}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
