'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

/**
 * BuyIncentivesPanel — replaces the airdrop section with mechanics that
 * actually drive token purchases.
 *
 * The narrative is built around the "redacted documents" theme:
 *   - Every SOL spent buys you Conspiracy Points
 *   - Points unlock tiers, each tier reveals more redacted content
 *   - Top of leaderboard gets exclusive whistleblower NFTs from the agent
 *   - Holders vote on what the agent investigates next
 *
 * No new pages — this panel renders inline on /dashboard and /.
 */

const TIERS = [
  {
    name:       'INITIATE',
    color:      '#888',
    pts:        '0+',
    perks:      ['Public document feed', 'Trade $RDX on terminal'],
  },
  {
    name:       'CIPHER',
    color:      '#a855f7',
    pts:        '500+',
    perks:      ['Holder-only news feed', 'Private agent dispatches', 'Discord access'],
  },
  {
    name:       'ARCHIVIST',
    color:      '#60a5fa',
    pts:        '5,000+',
    perks:      ['Vote on agent targets', 'Early access to new launches', 'Profile badge'],
  },
  {
    name:       'DECLASSIFIER',
    color:      '#f87171',
    pts:        '50,000+',
    perks:      ['Direct agent commands', '1/1 Whistleblower NFT drop', '0.5% creator royalty share'],
  },
  {
    name:       'THE FILE',
    color:      '#ff1a1a',
    pts:        '500,000+',
    perks:      ['Permanent leaderboard slot', 'Co-sign agent investigations', 'Full archive access'],
  },
]

const MECHANICS = [
  {
    icon:  '💰',
    title: 'Conspiracy Points',
    body:  'Every 0.01 SOL you spend buying tokens on the platform = 1 point. Points never expire. They unlock tiers that reveal more redacted content.',
  },
  {
    icon:  '🥇',
    title: 'First-Buyer NFT',
    body:  'The first wallet to buy any newly-launched token receives a 1-of-1 "Whistleblower" NFT minted by the agent. Permanent on-chain proof you were there first.',
  },
  {
    icon:  '👑',
    title: 'Holder Leaderboard',
    body:  'Top $RDX holders are publicly ranked. Top 10 get profile badges, top 3 get whitelisted into every future token launch automatically.',
  },
  {
    icon:  '🗳️',
    title: 'Agent Direction',
    body:  'Holders vote weekly on which censored topic the autonomous agent investigates next. More $RDX = more vote weight.',
  },
  {
    icon:  '🔓',
    title: 'Reveal Mechanic',
    body:  'Each token represents a redacted document. Holders progressively unredact it: the more you hold, the more black bars peel back. Sell, and they snap shut.',
  },
  {
    icon:  '💎',
    title: 'Diamond Hand Bonus',
    body:  'Hold any token for 30+ days without selling: snapshot rewards from the platform fee pool. Paper hands get nothing. The patient inherit the file.',
  },
]

export function BuyIncentivesPanel() {
  return (
    <section className="relative py-20 px-4 border-y border-red-900/20 bg-gradient-to-b from-black via-red-950/[0.02] to-black">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-[0.3em] text-rd-muted/60 mb-3">FILE #0004</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-white">WHY</span>{' '}
            <span className="text-red-500">BUY</span>
          </h2>
          <p className="text-xs md:text-sm text-rd-muted/60 max-w-2xl mx-auto leading-relaxed">
            No airdrops. No free handouts. Every token bought on this platform
            earns Conspiracy Points that unlock content, voting power, and
            on-chain rewards. The deeper you go, the more is declassified for you.
          </p>
        </div>

        {/* ── Tier ladder ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-16">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rd-card p-4"
              style={{ borderColor: tier.color + '30' }}
            >
              <div className="text-[10px] font-mono tracking-widest mb-2" style={{ color: tier.color }}>
                {tier.name}
              </div>
              <div className="text-xs text-rd-muted/40 font-mono mb-3">{tier.pts} pts</div>
              <ul className="space-y-1">
                {tier.perks.map((p, j) => (
                  <li key={j} className="text-[10px] text-rd-muted/70 leading-relaxed">
                    · {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ── Mechanics grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {MECHANICS.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rd-card p-5 hover:border-red-500/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{m.icon}</span>
                <div>
                  <div className="text-sm font-bold text-white mb-1">{m.title}</div>
                  <div className="text-xs text-rd-muted/60 leading-relaxed">{m.body}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <div className="text-center">
          <Link
            href="/terminal/Dj3S6gNJo5omvAorpQV2DS5g2UQpoB4UBpdAWngWrLnj"
            className="inline-block px-10 py-4 bg-red-500 hover:bg-red-400 text-white font-black text-xs uppercase tracking-[0.3em] rounded-sm transition-all shadow-[0_0_20px_rgba(255,26,26,0.25)] hover:shadow-[0_0_30px_rgba(255,26,26,0.5)]"
          >
            Start earning points → Buy $RDX
          </Link>
        </div>

      </div>
    </section>
  )
}
