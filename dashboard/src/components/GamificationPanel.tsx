'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface LevelInfo {
  name: string;
  color: string;
  icon: string;
  nextLevel?: { name: string; xpNeeded: number };
}

interface Quest {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rdxReward: number;
  type: string;
  completed: boolean;
  progress: number;
}

export function GamificationPanel({ walletAddress, telegramId, onXPEarned }: {
  walletAddress?: string;
  telegramId?: string;
  onXPEarned?: (xp: number) => void;
}) {
  const [xp, setXP] = useState(0)
  const [level, setLevel] = useState<LevelInfo | null>(null)
  const [streak, setStreak] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [airdropAmount, setAirdropAmount] = useState('700 RDX')
  const [badges, setBadges] = useState<string[]>([])
  const [quests, setQuests] = useState<Quest[]>([])
  const [leaderboard, setLeaderboard] = useState<Array<{
    rank: number;
    walletAddress: string;
    telegramId: string;
    xp: number;
    level: string;
    streak: number;
    referrals: number;
    badges: number;
  }>>([])
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalXP: number;
    avgStreak: number;
    maxStreak: number;
    totalReferrals: number;
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'quests' | 'leaderboard'>('profile')
  const [loading, setLoading] = useState(true)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (walletAddress) fetchProfile()
    fetchLeaderboard()
    fetchStats()
  }, [walletAddress])

  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    if (!walletAddress) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gamify?wallet=${walletAddress}`)
      if (!res.ok) {
        if (res.status === 404) {
          fetchQuestsForUnregistered()
          return
        }
        throw new Error(`API ${res.status}: ${await res.text()}`)
      }
      const data = await res.json()
      if (data.status !== 'not_found') {
        setXP(data.xp)
        setLevel(data.level)
        setStreak(data.streak)
        setMultiplier(data.streakMultiplier)
        setAirdropAmount(data.airdropFormatted)
        setBadges(data.badges || [])
        setQuests(data.quests || [])
        setReferralCode(data.referralCode || '')
      } else {
        fetchQuestsForUnregistered()
      }
    } catch (e: any) { 
      console.error('[GamificationPanel]', e);
      setError(e.message || 'Failed to load profile')
    } finally { setLoading(false) }
  }

  const fetchQuestsForUnregistered = async () => {
    try {
      const res = await fetch(`/api/gamify?quests=1`)
      const data = await res.json()
      setQuests(data.quests || [])
    } catch (e) { console.error('[GamificationPanel]', e); }
  }

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/gamify?leaderboard=1&limit=20')
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (e) { console.error('[GamificationPanel]', e); }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/gamify?stats=1')
      const data = await res.json()
      setStats(data.stats || null)
    } catch (e) { console.error('[GamificationPanel]', e); }
  }

  const handleCheckin = async () => {
    if (!walletAddress) return
    setCheckinLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gamify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          telegramId,
          action: 'daily_checkin',
        }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      if (data.success) {
        setXP(data.totalXP)
        setLevel(data.level)
        setStreak(data.streak)
        setMultiplier(data.multiplier)
        setAirdropAmount(data.airdropFormatted)
        setBadges(data.badges || [])
        onXPEarned?.(data.xpEarned)
      }
    } catch (e: any) { 
      console.error('[GamificationPanel]', e);
      setError(e.message || 'Check-in failed')
    } finally { setCheckinLoading(false) }
  }

  const completeQuest = async (questId: string) => {
    if (!walletAddress) return
    try {
      const res = await fetch('/api/gamify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          action: 'quest_complete',
          questId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setXP(data.totalXP)
        setLevel(data.level)
        setAirdropAmount(data.airdropFormatted)
        setBadges(data.badges || [])
        fetchProfile()
        onXPEarned?.(data.xpEarned)
      }
    } catch (e) { console.error('[GamificationPanel]', e); }
  }

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const xpProgress = level?.nextLevel
    ? Math.max(0, Math.min(100, 100 - ((level.nextLevel.xpNeeded / (level.nextLevel.xpNeeded + xp)) * 100)))
    : 100

  const getLevelColor = (color: string) => {
    if (color === '#ff1a1a') return 'text-rd-red'
    if (color === '#ef4444') return 'text-red-500'
    if (color === '#f59e0b') return 'text-yellow-500'
    if (color === '#10b981') return 'text-green-500'
    if (color === '#3b82f6') return 'text-blue-500'
    if (color === '#9945FF') return 'text-purple-500'
    return 'text-rd-muted'
  }

  if (!walletAddress) {
    return (
      <section id="gamification" className="py-24 relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="rd-card text-center p-12">
            <div className="text-4xl mb-4">🔒</div>
            <div className="text-xl font-bold text-rd-text mb-2">CONNECT WALLET TO UNLOCK</div>
            <p className="text-rd-muted/50 text-sm">
              Connect your Solana wallet to access XP, levels, quests, and the leaderboard.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="gamification" className="py-24 relative">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rd-red/5 rounded-full blur-[150px]" />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-xs tracking-[0.3em] text-rd-muted mb-3">FILE #0006</div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-rd-red">OPERATOR</span>{' '}
            <span className="text-rd-text">STATUS</span>
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-rd-red/30" />
            <div className="w-24 h-2 censor-bar" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-rd-red/30" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['profile', 'quests', 'leaderboard'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs tracking-widest transition-all ${
                activeTab === tab
                  ? 'border border-rd-red/40 bg-rd-red/10 text-rd-red'
                  : 'border border-rd-border text-rd-muted hover:text-rd-red'
              }`}
            >
              {tab === 'profile' ? '📊 PROFILE' : tab === 'quests' ? '🎯 QUESTS' : '🏆 LEADERBOARD'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rd-card text-center p-12">
            <div className="text-rd-muted/50 text-sm animate-pulse">LOADING DATA...</div>
          </div>
        ) : activeTab === 'profile' ? (
          /* ═══════════════ PROFILE TAB ═══════════════ */
          <div className="space-y-6">
            {/* XP + Level Card */}
            <div className="rd-card">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Level + XP */}
                <div className="text-center">
                  {level && (
                    <>
                      <div className={`text-6xl mb-2`}>{level.icon}</div>
                      <div className={`text-2xl font-bold ${getLevelColor(level.color)} mb-1`}>
                        {level.name}
                      </div>
                      <div className="text-xs text-rd-muted/50 tracking-widest">
                        {(xp ?? 0).toLocaleString()} XP
                      </div>
                    </>
                  )}

                  {/* XP Progress Bar */}
                  {level?.nextLevel && (
                    <div className="mt-4">
                      <div className="text-[10px] text-rd-muted/40 tracking-widest mb-1">
                        {level.nextLevel.xpNeeded} XP TO {level.nextLevel.name.toUpperCase()}
                      </div>
                      <div className="w-full h-3 bg-rd-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, xpProgress)}%` }}
                          transition={{ duration: 1 }}
                          className="h-full bg-gradient-to-r from-rd-red to-rd-red-glow"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Stats */}
                <div className="space-y-4">
                  {/* Streak */}
                  <div className="flex items-center justify-between p-3 border border-rd-border">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔥</span>
                      <div>
                        <div className="text-sm text-rd-text font-bold">{streak} DAY STREAK</div>
                        <div className="text-[10px] text-rd-muted/40">{multiplier}x XP MULTIPLIER</div>
                      </div>
                    </div>
                    <button
                      onClick={handleCheckin}
                      disabled={checkinLoading}
                      className="px-3 py-1.5 text-[10px] tracking-widest border border-rd-red/30 bg-rd-red/10 text-rd-red hover:bg-rd-red hover:text-rd-black transition-all disabled:opacity-40"
                    >
                      {checkinLoading ? '...' : 'CHECK IN'}
                    </button>
                  </div>

                  {/* Airdrop Amount */}
                  <div className="p-3 border border-rd-red/20 bg-rd-red/5">
                    <div className="text-[10px] text-rd-muted/40 tracking-widest mb-1">
                      TOTAL AIRDROP ALLOCATION
                    </div>
                    <div className="text-2xl font-bold text-rd-red">{airdropAmount}</div>
                    <div className="text-[10px] text-rd-muted/40 mt-1">
                      Base: 700 RDX + XP Bonuses
                    </div>
                  </div>

                  {/* Referral Code */}
                  <div className="p-3 border border-rd-border">
                    <div className="text-[10px] text-rd-muted/40 tracking-widest mb-2">
                      REFERRAL CODE
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-rd-red/70 bg-rd-black px-3 py-1.5 flex-1">
                        {referralCode || '---'}
                      </code>
                      <button
                        onClick={copyReferral}
                        className="px-3 py-1.5 text-[10px] tracking-widest border border-rd-border text-rd-muted hover:border-rd-red/30 hover:text-rd-red transition-all"
                      >
                        {copied ? '✓ COPIED' : 'COPY'}
                      </button>
                    </div>
                    <div className="text-[10px] text-rd-muted/30 mt-1">
                      Earn 200 XP + 5% of friend's XP per referral
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="rd-card">
                <div className="text-xs tracking-[0.3em] text-rd-muted/50 mb-4 text-center">
                  BADGES EARNED ({badges.length})
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {badges.map((badge, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-3 py-1.5 text-[10px] tracking-widest border border-rd-red/20 bg-rd-red/5 text-rd-red"
                    >
                      {badge.replace(/_/g, ' ')}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Global Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'TOTAL AGENTS', value: stats?.totalUsers?.toString() || '0', icon: '👥' },
                  { label: 'TOTAL XP', value: stats?.totalXP?.toLocaleString() || '0', icon: '⚡' },
                  { label: 'AVG STREAK', value: `${stats?.avgStreak || 0} days`, icon: '🔥' },
                  { label: 'MAX STREAK', value: `${stats?.maxStreak || 0} days`, icon: '👁️' },
                ].map((stat, i) => (
                  <div key={i} className="rd-card text-center p-4">
                    <div className="text-lg mb-1">{stat.icon}</div>
                    <div className="text-sm font-bold text-rd-red">{stat.value}</div>
                    <div className="text-[10px] text-rd-muted/40 tracking-widest mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'quests' ? (
          /* ═══════════════ QUESTS TAB ═══════════════ */
          <div className="space-y-4">
            {quests.length === 0 ? (
              <div className="rd-card text-center p-12">
                <div className="text-rd-muted/50 text-sm">NO QUESTS AVAILABLE</div>
              </div>
            ) : (
              quests.map((quest, i) => (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rd-card ${quest.completed ? 'border-green-500/30 bg-green-500/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{quest.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-rd-text">{quest.name}</span>
                        {quest.completed && (
                          <span className="text-[10px] text-green-500 tracking-wider">✓ COMPLETE</span>
                        )}
                        {!quest.completed && (
                          <span className={`text-[10px] tracking-wider ${
                            quest.type === 'daily' ? 'text-blue-400' :
                            quest.type === 'weekly' ? 'text-yellow-400' : 'text-rd-muted/50'
                          }`}>
                            {quest.type.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-rd-muted/50">{quest.description}</div>
                      {/* Progress bar */}
                      {!quest.completed && (
                        <div className="mt-2">
                          <div className="w-full h-1.5 bg-rd-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rd-red/60"
                              style={{ width: `${quest.progress}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-rd-muted/30 mt-1">{quest.progress}%</div>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-rd-red font-bold">+{quest.xpReward} XP</div>
                      <div className="text-[10px] text-rd-muted/40">+{quest.rdxReward} RDX</div>
                      {!quest.completed && (
                        <button
                          onClick={() => completeQuest(quest.id)}
                          className="mt-2 px-3 py-1 text-[10px] tracking-widest border border-rd-red/30 bg-rd-red/10 text-rd-red hover:bg-rd-red hover:text-rd-black transition-all"
                        >
                          CLAIM
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          /* ═══════════════ LEADERBOARD TAB ═══════════════ */
          <div className="rd-card">
            {leaderboard.length === 0 ? (
              <div className="text-center p-12">
                <div className="text-rd-muted/50 text-sm">NO DATA YET</div>
              </div>
            ) : (
              <>
                <div className="text-xs tracking-[0.3em] text-rd-muted/50 mb-6 text-center">
                  TOP 20 AGENTS BY XP
                </div>
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-4 p-3 border ${
                        i === 0 ? 'border-yellow-500/40 bg-yellow-500/5' :
                        i === 1 ? 'border-gray-400/40 bg-gray-400/5' :
                        i === 2 ? 'border-orange-600/40 bg-orange-600/5' :
                        'border-rd-border'
                      }`}
                    >
                      <div className="text-lg font-bold text-rd-muted w-8 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.rank}`}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-rd-text font-mono">
                          {entry.walletAddress.slice(0, 8)}...{entry.walletAddress.slice(-6)}
                        </div>
                        <div className="text-[10px] text-rd-muted/40">
                          {entry.level} · 🔥{entry.streak} · 👥{entry.referrals}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-rd-red">{(entry?.xp || 0).toLocaleString()} XP</div>
                        {entry.badges > 0 && (
                          <div className="text-[10px] text-rd-muted/30">{entry.badges} badges</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
