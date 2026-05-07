'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/Header'
import { useWalletReady } from '@/components/Providers'
import { GovernancePanel } from '@/components/GovernancePanel'
import { LaunchpadPanel } from '@/components/LaunchpadPanel'
import { CinemaPanel } from '@/components/CinemaPanel'

// Safe number formatting helper - handles undefined/null/NaN values
const formatNumber = (value: any, defaultValue = '—'): string => {
  try {
    if (value === null || value === undefined) return defaultValue
    const num = Number(value)
    if (isNaN(num)) return defaultValue
    return num.toLocaleString('en-US')
  } catch (e) {
    return defaultValue
  }
}

interface UserProfile {
  walletAddress: string
  telegramId: string
  xp: number
  level: string
  levelName: string
  streak: number
  streakMultiplier: number
  referrals: number
  referralCode: string
  totalActions: number
  badges: string[]
  registeredAt: string
  airdropAmount: string
  claimedAirdropAmount: number
  airdropFormatted: string
  levelName: string
  questsCompleted: number
  quests: Array<{
    id: string
    name: string
    description: string
    xp: number
    rdx: number
    completed: boolean
    type: string
  }>
}

interface GlobalStats {
  totalUsers: number
  totalXP: number
  totalAirdrop: string
  avgLevel: number
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  CLASSIFIED:    { bg: 'rgba(60,60,60,0.4)',  text: '#888888', glow: 'rgba(136,136,136,0.2)',  border: 'rgba(136,136,136,0.2)' },
  RECONSTRUCTED: { bg: 'rgba(80,20,160,0.4)', text: '#a855f7', glow: 'rgba(153,69,255,0.25)', border: 'rgba(153,69,255,0.25)' },
  DECLASSIFIED:  { bg: 'rgba(20,60,160,0.4)', text: '#60a5fa', glow: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.25)' },
  ARCHIVIST:     { bg: 'rgba(10,100,60,0.4)',  text: '#34d399', glow: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.25)' },
  INTELLIGENCE:  { bg: 'rgba(120,80,0,0.4)',   text: '#fbbf24', glow: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.25)' },
  DECLASSIFIER:  { bg: 'rgba(120,20,20,0.4)', text: '#f87171', glow: 'rgba(239,68,68,0.25)', border: 'rgba(239,68,68,0.25)' },
  'THE FILE':    { bg: 'rgba(180,0,0,0.5)',   text: '#ff1a1a', glow: 'rgba(255,26,26,0.35)', border: 'rgba(255,26,26,0.3)' },
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  )
}

function IconGift({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M7 21h10M12 12c-2-2-4-2.5-4-5 0-1.5 1-3 4-3s4 1.5 4 3c0 2.5-2 3-4 5z" />
      <path d="M12 12c2-2 4-2.5 4-5 0-1.5-1-3-4-3s-4 1.5-4 3c0 2.5 2 3 4 5z" />
    </svg>
  )
}

function IconFlame({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-3.9 0-7-3.1-7-7 0-2.8 1.6-5.1 3-6.4V3l2.5 3.5c.5.7 1.5 1 2 0l.5-1c.5 1.5 1.5 3 3 4 2 1.4 3 3.5 3 6 0 3.9-3.1 7-7 7zm0-11c-.6 1-1 2-1 3 0 1.1.9 2 2 2s2-.9 2-2c0-1-.4-2-1-3h-2z" />
    </svg>
  )
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 01-10 0V4zM7 4H4v3a3 3 0 003 3M17 4h3v3a3 3 0 01-3 3" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20M16 14a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  )
}

function IconNetwork({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M12 7v4M8.5 16.5L10.8 14M15.2 16.5L13.2 14" />
    </svg>
  )
}

function SkeletonLine({ className = 'w-32 h-4' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export default function DashboardPage() {
  return <DashboardContent />
}

function DashboardContent() {
  const walletReady = useWalletReady()
  const { connected, publicKey } = useWallet()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'quests' | 'referrals' | 'missions' | 'governance' | 'launchpad' | 'cinema'>('overview')
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [claimStatus, setClaimStatus] = useState<{ loading: boolean, success?: string, error?: string }>({ loading: false })

  useEffect(() => {
    if (!connected || !publicKey) return
    fetchProfile()
    fetchStats()
  }, [connected, publicKey])

  const fetchProfile = async () => {
    if (!publicKey) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/gamify?wallet=${publicKey.toString()}`)
      const data = await res.json()
      if (data && data.xp !== undefined) {
        setProfile(data)
      } else {
        setProfile(null)
      }
    } catch {
      console.error('Failed to fetch profile')
    }
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/gamify?stats=1')
      const data = await res.json()
      if (data && data.stats) {
        setStats(data.stats)
      } else {
        setStats(data) // Fallback if API structure is different
      }
    } catch {
      console.error('Failed to fetch stats')
    }
  }

  const handleDailyCheckin = async () => {
    if (!publicKey || claiming) return
    setClaiming(true)
    try {
      const res = await fetch('/api/gamify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          action: 'daily_checkin',
        }),
      })
      const data = await res.json()
      if (data.xp) {
        setClaimed(true)
        fetchProfile()
        setTimeout(() => setClaimed(false), 3000)
      }
    } catch {
      console.error('Check-in failed')
    }
    setClaiming(false)
  }

  const handleCopyRef = () => {
    if (!profile?.referralCode) return
    const url = `${window.location.origin}?ref=${profile.referralCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClaimAirdrop = async () => {
    if (!publicKey || claimStatus.loading) return
    setClaimStatus({ loading: true })
    try {
      const res = await fetch('/api/gamify/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() }),
      })
      const data = await res.json()
      if (data.ok) {
        setClaimStatus({ loading: false, success: data.message })
        fetchProfile()
      } else {
        setClaimStatus({ loading: false, error: data.message || data.error })
      }
    } catch {
      setClaimStatus({ loading: false, error: 'Connection failed' })
    }
  }

  if (!walletReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-5 h-5 border border-red-900/30 border-t-red-500 rounded-full animate-spin" />
          <span className="text-gray-600 text-xs font-mono tracking-widest">INITIALIZING PROTOCOL...</span>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <>
        <Header />
        <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg"
          >
            <div className="relative p-8 sm:p-12 rounded-[24px] bg-black/40 backdrop-blur-2xl border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden text-center group">
              {/* Card glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative z-10">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-900/5 border border-red-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,26,26,0.1)] relative"
                >
                  <div className="absolute inset-0 rounded-2xl border border-red-500/30 animate-pulse" />
                  <IconWallet className="w-10 h-10 text-red-500 drop-shadow-[0_0_15px_rgba(255,26,26,0.5)]" />
                </motion.div>
                
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
                  Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Terminal</span>
                </h1>
                
                <p className="text-gray-400 mb-10 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
                  Connect your Solana wallet to authenticate your agent identity, access the launchpad, and earn Conspiracy Points.
                </p>
                
                <div className="flex justify-center relative">
                  {/* Button glow behind */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[120%] bg-red-500/20 blur-xl rounded-full" />
                  <WalletMultiButton className="wallet-adapter-button-premium w-full sm:w-auto !justify-center" />
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-3 text-xs font-mono text-gray-500 tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Secure Solana Connection
            </div>
          </motion.div>
        </div>
      </>
    )
  }

  const currentLevel = (typeof profile?.level === 'object' ? (profile?.level as any)?.name : profile?.level) || 'CLASSIFIED'
  const levelStyle = LEVEL_STYLES[currentLevel] || LEVEL_STYLES.CLASSIFIED

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-24 sm:pt-28 pb-20">

        {/* Welcome card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rd-card mb-6 relative overflow-hidden"
        >
          {/* Glow */}
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            style={{ background: levelStyle.glow }}
          />

          <div className="relative flex flex-row items-center gap-4">

            {/* Avatar block */}
            <div
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 border"
              style={{
                background: levelStyle.bg,
                borderColor: levelStyle.border,
                boxShadow: `0 0 30px ${levelStyle.glow}`,
              }}
            >
              <span className="text-2xl sm:text-3xl font-bold" style={{ color: levelStyle.text }}>
                {profile?.levelName?.charAt(0) || 'C'}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {profile?.levelName || 'Classified'} Agent
                </h1>
                <span
                  className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border"
                  style={{
                    background: levelStyle.bg,
                    color: levelStyle.text,
                    borderColor: levelStyle.border,
                  }}
                >
                  Level {profile?.level || '?'}
                </span>
              </div>
              <p className="text-gray-500 font-mono text-xs mb-3">
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-6)}
              </p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2">
                <StatChip label="XP" value={formatNumber(profile?.xp)} accent="text-purple-400" />
                <StatChip label="Streak" value={`${profile?.streak || 0}d`} accent="text-orange-400" />
                <StatChip label="Conspiracy Pts" value={formatNumber((profile?.totalActions ?? 0) * 10)} accent="text-red-400" />
                <StatChip label="Rank" value="#—" accent="text-blue-400" />
              </div>
            </div>

            {/* Daily check-in */}
            <button
              onClick={handleDailyCheckin}
              disabled={claiming || claimed}
              className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-mono font-bold transition-all ${
                claimed
                  ? 'bg-green-950/40 text-green-400 border border-green-900/30'
                  : 'bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-900/30'
              }`}
            >
              {claimed ? (
                <>
                  <IconCheck className="w-4 h-4" />
                  Checked In
                </>
              ) : claiming ? (
                'Processing...'
              ) : (
                <>
                  <IconFlame className="w-4 h-4" />
                  Daily Check-in
                </>
              )}
            </button>
          </div>

          {/* XP progress bar */}
          {profile && profile.xp !== undefined && (
            <div className="mt-6 pt-5 border-t border-white/[0.04]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono text-gray-500">
                  {(profile?.xp ?? 0).toLocaleString()} XP
                </span>
                <span className="text-xs text-gray-600">Next Level</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((profile.xp / 10000) * 100, 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${levelStyle.text}cc, ${levelStyle.text})`,
                    boxShadow: `0 0 12px ${levelStyle.glow}`,
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <div className="mb-8 relative">
          {/* Decorative line */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-900/30 to-transparent" />

          <div className="flex items-stretch gap-0 overflow-x-auto scrollbar-none">
            {[
              { id: 'overview',    label: 'Overview',    icon: '◈' },
              { id: 'quests',      label: 'Quests',      icon: '◎' },
              { id: 'referrals',   label: 'Referrals',   icon: '⌁' },
              { id: 'missions',    label: 'Missions',    icon: '◉' },
              { id: 'governance',  label: 'Governance',  icon: '⬡' },
              { id: 'launchpad',   label: 'Launchpad',   icon: '⊕' },
              { id: 'cinema',      label: 'Cinema',      icon: '🎬' },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2.5 px-6 py-4 text-[10px] font-black uppercase tracking-[0.25em] whitespace-nowrap transition-all duration-300 border-b-2 ${
                    isActive
                      ? 'text-white border-red-500 bg-gradient-to-b from-red-500/5 to-transparent'
                      : 'text-rd-muted/50 border-transparent hover:text-white/70 hover:border-red-900/40 hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Icon */}
                  <span className={`text-base leading-none transition-all duration-300 ${
                    isActive ? 'text-red-500 drop-shadow-[0_0_8px_rgba(255,26,26,0.8)]' : 'text-rd-muted/30'
                  }`}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {/* Active glow dot */}
                  {isActive && (
                    <motion.div
                      layoutId="tabIndicator"
                      className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ff1a1a]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rd-card">
                      <SkeletonLine className="w-8 h-8 rounded mb-3" />
                      <SkeletonLine className="w-20 h-7 mb-2" />
                      <SkeletonLine className="w-16 h-3" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <StatCard
                    label="Total XP"
                    value={(profile?.xp ?? 0).toLocaleString()}
                    icon={<IconZap className="w-5 h-5" />}
                    color="#a855f7"
                  />
                  <StatCard
                    label="Conspiracy Pts"
                    value={`${(profile?.totalActions ?? 0) * 10}`}
                    icon={<IconGift className="w-5 h-5" />}
                    color="#ef4444"
                  />
                  <StatCard
                    label="Streak"
                    value={`${profile?.streak || 0} days`}
                    icon={<IconFlame className="w-5 h-5" />}
                    color="#fb923c"
                  />
                  <StatCard
                    label="Actions"
                    value={profile?.totalActions?.toString() || '0'}
                    icon={<IconTrophy className="w-5 h-5" />}
                    color="#60a5fa"
                  />
                </div>
              )}

              {/* Airdrop Claim Section */}
              {!loading && profile && (
                <div className="rd-card mb-6 border-red-500/20 bg-red-500/[0.02]">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-red-500 mb-1">On-Chain Airdrop</h3>
                      <p className="text-gray-400 text-xs font-mono">
                        Allocate your earned $RDX to your wallet. You have {formatNumber((Number(profile.airdropAmount) - (profile.claimedAirdropAmount || 0)) / 1_000_000_000)} RDX pending.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={handleClaimAirdrop}
                        disabled={claimStatus.loading || (Number(profile.airdropAmount) - (profile.claimedAirdropAmount || 0)) <= 0}
                        className={`px-8 py-3 rounded-sm font-mono text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                          claimStatus.loading 
                            ? 'bg-gray-800 text-gray-500 cursor-wait' 
                            : (Number(profile.airdropAmount) - (profile.claimedAirdropAmount || 0)) <= 0
                              ? 'bg-green-950/20 text-green-500/50 border border-green-500/10'
                              : 'bg-red-500 text-black hover:bg-white shadow-[0_0_20px_rgba(255,26,26,0.3)]'
                        }`}
                      >
                        {claimStatus.loading ? 'Processing...' : (Number(profile.airdropAmount) - (profile.claimedAirdropAmount || 0)) <= 0 ? 'Fully Claimed' : 'Claim $RDX Now'}
                      </button>
                      {claimStatus.success && <p className="text-[10px] text-green-400 font-mono animate-pulse">{claimStatus.success}</p>}
                      {claimStatus.error && <p className="text-[10px] text-red-400 font-mono">{claimStatus.error}</p>}
                    </div>
                  </div>
                  
                  {/* Progress bar for claimed vs total */}
                  <div className="mt-6">
                    <div className="flex justify-between text-[10px] font-mono text-gray-600 mb-1">
                      <span>CLAIMED: {formatNumber((profile.claimedAirdropAmount || 0) / 1_000_000_000)} RDX</span>
                      <span>TOTAL: {formatNumber(Number(profile.airdropAmount) / 1_000_000_000)} RDX</span>
                    </div>
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, ((profile.claimedAirdropAmount || 0) / Number(profile.airdropAmount)) * 100)}%` }}
                        className="h-full bg-red-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Badges */}
              {!loading && profile?.badges && profile.badges.length > 0 && (
                <div className="rd-card mb-6">
                  <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">Badges</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.badges.map((badge, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono border"
                        style={{
                          background: 'rgba(153,69,255,0.08)',
                          borderColor: 'rgba(153,69,255,0.2)',
                          color: '#a855f7',
                        }}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Network stats */}
              {!loading && stats && (
                <div className="rd-card">
                  <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-5">Network Stats</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <NetworkStat
                      label="Total Agents"
                      value={(stats?.totalUsers ?? 0).toLocaleString()}
                      icon={<IconUser className="w-4 h-4" />}
                    />
                    <NetworkStat
                      label="Total XP"
                      value={(stats?.totalXP ?? 0).toLocaleString()}
                      icon={<IconZap className="w-4 h-4" />}
                    />
                    <NetworkStat
                      label="$RDX Holders"
                      value={(stats?.totalUsers ?? 0).toLocaleString()}
                      icon={<IconGift className="w-4 h-4" />}
                    />
                    <NetworkStat
                      label="Avg Level"
                      value={stats?.avgLevel?.toFixed(1) || '0.0'}
                      icon={<IconNetwork className="w-4 h-4" />}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'quests' && (
            <motion.div
              key="quests"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="rd-card flex items-center gap-4">
                    <SkeletonLine className="w-10 h-10 rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <SkeletonLine className="w-40 h-4 mb-2" />
                      <SkeletonLine className="w-60 h-3" />
                    </div>
                    <SkeletonLine className="w-16 h-3" />
                  </div>
                ))
              ) : profile?.quests && profile.quests.length > 0 ? (
                profile.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`rd-card flex items-center justify-between gap-4 ${
                      quest.completed ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
                        style={{
                          background: quest.completed ? 'rgba(52,211,153,0.1)' : 'rgba(255,26,26,0.06)',
                          borderColor: quest.completed ? 'rgba(52,211,153,0.2)' : 'rgba(255,26,26,0.12)',
                        }}
                      >
                        {quest.completed ? (
                          <IconCheck className="w-5 h-5 text-green-400" />
                        ) : (
                          <div className="w-5 h-5 rounded border border-red-900/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{quest.name}</div>
                        <div className="text-xs text-gray-500 truncate">{quest.description}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-mono text-purple-400">+{quest.xp} XP</div>
                      <div className="text-xs font-mono text-green-400">+{quest.rdx} RDX</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rd-card text-center py-16">
                  <IconTrophy className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm font-mono">No quests available</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'referrals' && (
            <motion.div
              key="referrals"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rd-card max-w-lg mx-auto text-center py-12">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl border border-red-900/30 bg-red-950/20 flex items-center justify-center">
                  <IconLink className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Refer & Earn</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Share your referral link and earn 200 XP + 100 RDX for each agent who joins.
                </p>

                {profile?.referralCode && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] mb-2">
                      <span className="text-sm font-mono text-gray-400 flex-1 text-left truncate">
                        {typeof window !== 'undefined' ? `${window.location.origin}?ref=${profile.referralCode}` : `?ref=${profile.referralCode}`}
                      </span>
                      <button
                        onClick={handleCopyRef}
                        className="flex-shrink-0 p-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.05] transition-colors group"
                      >
                        {copied ? (
                          <IconCheck className="w-4 h-4 text-green-400" />
                        ) : (
                          <IconCopy className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      {copied ? 'Copied to clipboard' : 'Click to copy your referral link'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{profile?.referrals || 0}</div>
                    <div className="text-xs text-gray-600 mt-1">Referred</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{(profile?.referrals || 0) * 200}</div>
                    <div className="text-xs text-gray-600 mt-1">XP Earned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{(profile?.referrals || 0) * 100}</div>
                    <div className="text-xs text-gray-600 mt-1">RDX Earned</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'missions' && (
            <motion.div
              key="missions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rd-card p-8 text-center"
            >
              <p className="text-sm text-gray-400 mb-4">Token-specific missions live on the dedicated missions page.</p>
              <a href="/missions" className="inline-block px-6 py-3 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-sm font-mono text-xs uppercase tracking-widest transition">
                Open Missions →
              </a>
            </motion.div>
          )}

          {activeTab === 'governance' && (
            <motion.div
              key="governance"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
               <GovernancePanel rdxBalance={profile?.xp || 0} />
            </motion.div>
          )}

          {activeTab === 'launchpad' && (
            <motion.div
              key="launchpad"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
               <LaunchpadPanel />
            </motion.div>
          )}

          {activeTab === 'cinema' && (
            <motion.div
              key="cinema"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CinemaPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-4 h-4 border border-red-900/30 border-t-red-500 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm font-mono">Loading agent data...</p>
          </div>
        )}
      </main>
    </>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rd-card relative overflow-hidden group">
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 transition-opacity duration-300 group-hover:opacity-30"
        style={{ background: color }}
      />
      <div style={{ color }} className="mb-3">{icon}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs font-mono text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function NetworkStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-gray-500">
        {icon}
      </div>
      <div className="text-xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  )
}

function StatChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-600 font-mono">{label}</span>
      <span className={`text-sm font-bold font-mono ${accent}`}>{value}</span>
    </div>
  )
}

