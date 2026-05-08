'use client'

/**
 * /missions — gamified mission board.
 *
 * For now, shows missions for the canonical $RDX mint (env
 * NEXT_PUBLIC_RDX_TOKEN_MINT). Future: switch to per-token via ?mint= query.
 *
 * Manual verification: admin marks a mission "completed", users then click
 * Claim — claim moves tokens from the missions reserve to the user's
 * claimable balance.
 */

import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Header } from '@/components/Header'

type Mission = {
  id: string
  title: string
  description: string
  reward_tokens: number
  type: string
  status: 'open' | 'completed'
}

export default function MissionsPage() {
  const { publicKey } = useWallet()
  const wallet = publicKey?.toBase58() ?? ''

  const queryMint = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('mint')
    : null
  const mint =
    queryMint ||
    process.env.NEXT_PUBLIC_RDX_TOKEN_MINT ||
    'RDX'

  const [missions, setMissions]   = useState<Mission[]>([])
  const [reserve, setReserve]     = useState<number>(0)
  const [graduated, setGraduated] = useState<boolean>(false)
  const [claimable, setClaimable] = useState<number>(0)
  const [loading, setLoading]     = useState(true)
  const [busyId, setBusyId]       = useState<string | null>(null)
  const [msg, setMsg]             = useState<string>('')

  const refresh = async () => {
    setLoading(true)
    try {
      const [m, r, c] = await Promise.all([
        fetch(`/api/missions/${mint}`).then(r => r.json()).catch(() => ({})),
        fetch(`/api/tokens/${mint}/missions/reserve`).then(r => r.json()).catch(() => ({})),
        wallet
          ? fetch(`/api/missions/${mint}/claimable/${wallet}`).then(r => r.json()).catch(() => ({ claimable: 0 }))
          : Promise.resolve({ claimable: 0 }),
      ])
      setMissions(m.missions ?? [])
      setReserve(Number(r.reserve ?? 0))
      setGraduated(Boolean(r.graduated))
      setClaimable(Number(c.claimable ?? 0))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mint, wallet])

  const claim = async (id: string) => {
    if (!wallet) { setMsg('Connect your wallet first'); return }
    setBusyId(id); setMsg('')
    try {
      const res = await fetch(`/api/missions/${mint}/${id}/claim`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet }),
      })
      const d = await res.json()
      if (!res.ok) setMsg(d.error || 'Claim failed')
      else setMsg(`Claimed ${d.reward ?? 0} tokens`)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        <div className="mb-8">
          <p className="text-[10px] font-mono text-gray-600 tracking-[0.3em] uppercase mb-3">
            Mint · {mint.slice(0, 10)}…
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Missions</h1>
          <p className="text-gray-400 text-sm">
            Complete missions to earn tokens from the on-graduation reserve.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <Stat label="Reserve" value={reserve.toLocaleString()} />
          <Stat label="Graduated" value={graduated ? 'Yes' : 'Not yet'} />
          <Stat label="Your claimable" value={claimable.toLocaleString()} />
        </div>

        {msg && (
          <div className="mb-6 p-3 border border-red-900/30 bg-red-950/20 rounded-sm text-[11px] font-mono text-red-300">
            {msg}
          </div>
        )}

        {/* Missions */}
        {loading ? (
          <div className="text-gray-500 text-sm font-mono">Loading…</div>
        ) : missions.length === 0 ? (
          <div className="rd-card text-center py-12">
            <p className="text-gray-500 text-sm font-mono">No missions yet — check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {missions.map(m => {
              const completed = m.status === 'completed'
              return (
                <div
                  key={m.id}
                  className="rd-card flex items-center justify-between gap-4 p-4 border-red-900/15"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{m.title}</div>
                    <div className="text-xs text-gray-500 truncate">{m.description}</div>
                    <div className="text-[10px] text-gray-600 font-mono mt-1 uppercase tracking-widest">
                      {m.type} · +{m.reward_tokens.toLocaleString()} tokens
                    </div>
                  </div>
                  <button
                    onClick={() => claim(m.id)}
                    disabled={!completed || busyId === m.id}
                    className={`flex-shrink-0 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm border transition-all ${
                      completed
                        ? 'bg-red-600 hover:bg-red-500 text-white border-red-500/40'
                        : 'bg-gray-900/40 text-gray-600 border-gray-800 cursor-not-allowed'
                    }`}
                  >
                    {busyId === m.id ? '…' : completed ? 'Claim' : 'Locked'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rd-card p-4">
      <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-lg font-bold text-white font-mono">{value}</div>
    </div>
  )
}
