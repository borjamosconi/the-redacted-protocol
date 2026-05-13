import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Genesis $RDX Airdrop | The Redacted Protocol',
  description:
    'Every wallet that interacts with The Redacted Protocol on Solana devnet qualifies for the Genesis $RDX airdrop. No minimum, no allowlist, no vesting tricks.',
}

const ELIGIBILITY = [
  {
    step: '01',
    label: 'CONNECT_WALLET',
    desc: 'Use any Solana wallet (Phantom, Solflare, Backpack) and switch to devnet. Connection alone marks your wallet as a participant.',
  },
  {
    step: '02',
    label: 'INTERACT',
    desc: 'Inspect a token in /terminal, complete a mission in /missions, or trade on a bonding curve. Every devnet action increases your XP.',
  },
  {
    step: '03',
    label: 'BUILD_XP',
    desc: 'Higher XP at snapshot time = larger Genesis allocation. The earlier and more often you participate, the bigger your share.',
  },
  {
    step: '04',
    label: 'CLAIM_AT_LAUNCH',
    desc: 'On the day $RDX goes live on mainnet, your devnet XP is converted 1:1 to a claimable allocation. Connect the same wallet to claim.',
  },
]

const PILLARS = [
  {
    title: 'OPEN_TO_ALL',
    color: 'text-yellow-400',
    body:
      'No allowlist, no application form, no KYC. If your wallet has at least one valid interaction with the devnet dashboard before the snapshot, you qualify. Period.',
  },
  {
    title: 'NO_MINIMUM',
    color: 'text-red-500',
    body:
      'You do not need to hold anything. You do not need to spend SOL. You do not need to launch a token. A single connection + one mission is enough to start earning.',
  },
  {
    title: 'EARLY_BONUS',
    color: 'text-yellow-400',
    body:
      'Every wallet active during the devnet hackathon window earns a permanent Early Operator multiplier baked into the snapshot. Joining later still works, but the bonus is bigger now.',
  },
  {
    title: 'TRANSPARENT_FORMULA',
    color: 'text-red-500',
    body:
      'Base allocation = 700,000 RDX. Bonus = f(XP) capped at 50,000,000 RDX. XP is calculated from on-chain devnet activity recorded in the gamification engine. No black box.',
  },
]

export default function AirdropPage() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* DEVNET BANNER (sticky) */}
      <div className="sticky top-0 z-[200] w-full bg-yellow-500 text-black text-center py-2 px-4 flex items-center justify-center gap-4 font-black text-[11px] uppercase tracking-[0.4em]">
        <span className="w-2 h-2 bg-black rounded-full animate-pulse inline-block" />
        RUNNING ON SOLANA DEVNET — ALL INTERACTIONS QUALIFY FOR GENESIS AIRDROP
        <span className="w-2 h-2 bg-black rounded-full animate-pulse inline-block" />
      </div>

      {/* Background grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,26,26,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,26,26,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 sm:py-24">
        {/* Header */}
        <Link
          href="/"
          className="text-[10px] font-mono text-white/40 hover:text-white tracking-[0.4em] uppercase"
        >
          ← BACK_TO_BASE
        </Link>

        <div className="mt-8 flex items-center gap-4">
          <div className="w-12 h-[1px] bg-red-600/50" />
          <span className="text-[10px] sm:text-xs font-mono text-red-600 font-black tracking-[0.6em] uppercase">
            ALLOCATION_RESERVE_V2
          </span>
        </div>

        <h1 className="mt-6 text-5xl sm:text-7xl lg:text-8xl font-black text-white tracking-[-0.04em] leading-[0.9] uppercase">
          GENESIS{' '}
          <span className="text-yellow-400" style={{ textShadow: '0 0 30px rgba(255,215,0,0.5)' }}>
            $RDX
          </span>
          <br />
          AIRDROP
        </h1>

        <p className="mt-8 text-white/70 font-mono text-sm sm:text-base leading-relaxed max-w-3xl tracking-wide">
          Every wallet that interacts with The Redacted Protocol on Solana <span className="text-yellow-400">devnet</span> is automatically recorded for the Genesis $RDX airdrop. No minimum required, no allowlist, no vesting traps. The protocol rewards the people who showed up early.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-10 py-4 bg-yellow-500 hover:bg-white text-black font-black uppercase text-xs tracking-[0.5em] transition-all"
          >
            CONNECT_WALLET ▸
          </Link>
          <Link
            href="/missions"
            className="inline-flex items-center justify-center px-10 py-4 border border-white/20 hover:border-yellow-400 text-white/70 hover:text-white font-black uppercase text-xs tracking-[0.5em] transition-all"
          >
            START_MISSIONS
          </Link>
        </div>

        {/* Eligibility steps */}
        <div className="mt-24 sm:mt-32">
          <h2 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-tight mb-2">
            HOW_TO_QUALIFY
          </h2>
          <div className="w-24 h-1 bg-yellow-500 mb-12" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-white/10">
            {ELIGIBILITY.map((step) => (
              <div
                key={step.step}
                className="p-8 sm:p-10 border-b md:border-b border-r-0 md:border-r last:border-r-0 [&:nth-child(2n)]:md:border-r-0 [&:nth-child(n+3)]:md:border-b-0 border-white/10 bg-white/[0.02] hover:bg-yellow-500 group transition-colors duration-500"
              >
                <span className="text-[10px] font-mono text-yellow-500 group-hover:text-black block mb-4 font-black tracking-widest">
                  STEP_{step.step}
                </span>
                <h3 className="text-xl font-black text-white group-hover:text-black uppercase mb-3 tracking-widest">
                  {step.label}
                </h3>
                <p className="text-[12px] text-white/50 group-hover:text-black/80 leading-relaxed uppercase tracking-widest">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pillars */}
        <div className="mt-24 sm:mt-32">
          <h2 className="font-black text-2xl sm:text-3xl text-white uppercase tracking-tight mb-2">
            THE_RULES
          </h2>
          <div className="w-24 h-1 bg-red-600 mb-12" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10 border border-white/10">
            {PILLARS.map((p) => (
              <div key={p.title} className="bg-black p-8 sm:p-10 hover:bg-white/5 transition-colors">
                <h3 className={`font-black text-lg ${p.color} uppercase tracking-widest mb-4`}>
                  ◢ {p.title}
                </h3>
                <p className="text-[13px] text-white/70 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-24 sm:mt-32 border-t border-white/10 pt-12">
          <p className="text-[10px] font-mono text-white/40 tracking-[0.4em] uppercase mb-4">
            SNAPSHOT_DATE
          </p>
          <p className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            TBD ·{' '}
            <span className="text-yellow-400">PRE-MAINNET_LAUNCH</span>
          </p>
          <p className="mt-4 text-white/50 font-mono text-xs sm:text-sm leading-relaxed max-w-2xl">
            Devnet activity accumulates from your first connection until the day The Redacted Protocol activates on Solana mainnet. The longer and more meaningfully you participate, the higher your Genesis allocation. Begin today, claim later.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-12 py-5 bg-yellow-500 hover:bg-white text-black font-black uppercase text-xs tracking-[0.5em] transition-all"
            >
              ENTER_DASHBOARD
            </Link>
            <a
              href="https://github.com/whalesconspiracy-33/the-redacted-protocol"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center px-12 py-5 border border-white/20 hover:border-yellow-400 text-white/70 hover:text-white font-black uppercase text-xs tracking-[0.5em] transition-all"
            >
              READ_THE_CODE
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
