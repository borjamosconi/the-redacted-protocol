'use client'

import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
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
  onChain?: boolean;
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
  const [airdropAmount, setAirdropAmount] = useState('0 RDX')
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
  const [activeTab, setActiveTab] = useState<'profile' | 'quests' | 'leaderboard'>('quests')
  const [loading, setLoading] = useState(true)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [claimingId, setClaimingId] = useState<string | null>(null)

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
    // High-stakes, clear mission descriptors for airdrop qualification
    const missions = [
      { id: 'm1', name: 'SECURE_INITIATION', description: 'Complete your first document launch to establish your node identity. QUALIFIES FOR AIRDROP.', icon: '🚀', xpReward: 500, rdxReward: 100, completed: false, progress: 0 },
      { id: 'm2', name: 'INTEL_RECOVERY', description: 'Participate in the bonding curve of any classified document. QUALIFIES FOR AIRDROP.', icon: '📊', xpReward: 300, rdxReward: 50, completed: false, progress: 0 },
      { id: 'm3', name: 'NODE_RECRUITMENT', description: 'Refer 3 other operators using your recruit hash. AIRDROP MULTIPLIER: 1.5x', icon: '📡', xpReward: 1000, rdxReward: 250, completed: false, progress: 0 },
      { id: 'm4', name: 'DAILY_SYNC', description: 'Maintain a 5-day system check-in streak. QUALIFIES FOR LOYALTY REWARDS.', icon: '🔥', xpReward: 200, rdxReward: 20, completed: false, progress: 0 },
    ]
    setQuests(missions as any)
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

  const claimOnChainMission = async (questId: string) => {
    if (!walletAddress) return
    setClaimingId(questId)
    // Simulated on-chain interaction
    await new Promise(r => setTimeout(r, 2000))
    try {
      const res = await fetch('/api/gamify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          action: 'mission_claim_onchain',
          questId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setXP(data.totalXP)
        setLevel(data.level)
        setAirdropAmount(data.airdropFormatted)
        fetchProfile()
        onXPEarned?.(data.xpEarned)
      }
    } catch (e) { console.error('[GamificationPanel]', e); }
    finally { setClaimingId(null) }
  }

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const xpProgress = level?.nextLevel
    ? Math.max(0, Math.min(100, 100 - ((level.nextLevel.xpNeeded / (level.nextLevel.xpNeeded + xp)) * 100)))
    : 100

  if (!walletAddress) {
    return (
      <section id="gamification" className="py-24 relative bg-black">
        <div className="max-w-4xl mx-auto px-4">
          <div className="border border-white/10 bg-white/[0.02] p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-red-500/50" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-red-500/50" />
            <div className="text-6xl mb-6 text-white/10 font-black tracking-tighter">RESTRICTED_ACCESS</div>
            <div className="text-sm font-mono tracking-[0.5em] text-red-600 mb-8 uppercase font-black underline">WALLET_AUTHENTICATION_REQUIRED</div>
            <p className="text-white/40 text-[10px] font-mono tracking-[0.2em] uppercase max-w-md mx-auto leading-relaxed">
              Operator identity cannot be verified. Connect your Solana wallet to establish a secure tunnel and access the mission registry.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="gamification" className="py-24 relative bg-black overflow-hidden border-t border-white/5">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 relative z-10">
        
        {/* TOP STATUS BAR - HIGH END */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-20 border border-white/10 bg-white/[0.02] p-8 relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-[2px] h-full bg-red-600 group-hover:h-0 transition-all duration-1000" />
           
           <div className="flex items-center gap-8">
              <div className="w-20 h-20 border border-white/10 bg-white/5 flex items-center justify-center text-4xl relative">
                 <div className="absolute -inset-2 bg-red-500/10 blur-xl animate-pulse" />
                 {level?.icon || '🤖'}
              </div>
              <div>
                 <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-mono text-red-500 font-black tracking-widest uppercase">OPERATOR_ID</span>
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-tighter">[{walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}]</span>
                 </div>
                 <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{level?.name || 'INITIALIZING...'}</h2>
                 <div className="flex items-center gap-4 mt-3">
                    <div className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black tracking-widest">CLEARANCE_LEVEL_0{level?.name === 'Rookie' ? '1' : '5'}</div>
                    <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest">XP_MULTIPLIER: {multiplier}x</div>
                 </div>
              </div>
           </div>

            <div className="flex flex-col items-end gap-3 text-right">
               <div className="text-[10px] font-mono text-white/20 tracking-widest uppercase">PROTOCOL_REWARD_BALANCE</div>
               <div className="flex items-center gap-4">
                  <div className="text-[9px] bg-red-600/20 text-red-500 border border-red-600/30 px-3 py-1 font-black animate-pulse tracking-[0.2em]">AIRDROP_PHASE_1_ACTIVE</div>
                  <div className="text-4xl font-black text-white tracking-tighter">{airdropAmount.split(' ')[0]} <span className="text-sm text-red-600">RDX</span></div>
               </div>
               <div className="w-64 h-[1px] bg-white/10 relative overflow-hidden mt-1">
                 <motion.div 
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-red-500" 
                 />
              </div>
           </div>
        </div>

        {/* MISSION CONTROL CENTER */}
        <div className="grid lg:grid-cols-4 gap-8">
           
           {/* Sidebar: Navigation & Sub-Stats */}
           <div className="lg:col-span-1 space-y-6">
              <div className="border border-white/10 bg-white/[0.01] overflow-hidden">
                 {(['profile', 'quests', 'leaderboard'] as const).map((tab, i) => (
                    <button
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`w-full p-6 text-left border-b border-white/5 transition-all relative group ${
                          activeTab === tab ? 'bg-red-500/5' : 'hover:bg-white/[0.03]'
                       }`}
                    >
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.3em] mb-1">MODULE_0{i+1}</span>
                             <span className={`text-[11px] font-black tracking-[0.4em] uppercase transition-colors ${
                                activeTab === tab ? 'text-white' : 'text-white/40 group-hover:text-white/80'
                             }`}>
                                {tab === 'profile' ? 'OPERATOR_STATS' : tab === 'quests' ? 'ACTIVE_MISSIONS' : 'GLOBAL_RANKING'}
                             </span>
                          </div>
                          {activeTab === tab && <div className="w-1.5 h-1.5 bg-red-600 shadow-[0_0_8px_#ff0000]" />}
                       </div>
                       {activeTab === tab && <div className="absolute left-0 top-0 h-full w-1 bg-red-600" />}
                    </button>
                 ))}
              </div>

              {/* Mini Stats Card */}
              <div className="p-6 border border-white/10 bg-white/[0.01] relative">
                 <div className="text-[9px] font-mono text-white/30 tracking-widest uppercase mb-6">NETWORK_RECRUITS</div>
                 <div className="flex items-end justify-between mb-8">
                    <div className="text-3xl font-black text-white">05 <span className="text-[10px] text-white/20 ml-1">NODES</span></div>
                    <div className="text-[9px] font-mono text-green-500 uppercase">+12%_EXP</div>
                 </div>
                 <button 
                    onClick={copyReferral}
                    className="w-full py-3 bg-white text-black text-[9px] font-black tracking-widest uppercase hover:bg-red-600 hover:text-white transition-all duration-300"
                 >
                    {copied ? 'HASH_COPIED' : 'COPY_RECRUIT_HASH'}
                 </button>
              </div>
           </div>

           {/* Main Content Area */}
           <div className="lg:col-span-3">
              <AnimatePresence mode="wait">
                 {loading ? (
                    <motion.div 
                       key="loading"
                       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                       className="h-[500px] flex items-center justify-center border border-white/10 bg-white/[0.01]"
                    >
                       <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-2 border-red-600 border-t-transparent animate-spin" />
                          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.5em]">DECRYPTING_INTEL...</span>
                       </div>
                    </motion.div>
                 ) : activeTab === 'quests' ? (
                    <motion.div 
                       key="quests"
                       initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                       className="grid md:grid-cols-2 gap-6"
                    >
                       {quests.map((quest, i) => (
                          <div 
                             key={quest.id}
                             className={`group relative p-8 border transition-all duration-500 overflow-hidden ${
                                quest.completed 
                                   ? 'border-green-500/20 bg-green-500/[0.02]' 
                                   : 'border-white/10 bg-white/[0.02] hover:border-red-500/40'
                             }`}
                          >
                             {/* Technical accents */}
                             <div className="absolute top-0 left-0 w-1 h-1 bg-white/20" />
                             <div className="absolute top-0 right-0 w-1 h-1 bg-white/20" />
                             <div className="absolute bottom-0 left-0 w-1 h-1 bg-white/20" />
                             <div className="absolute bottom-0 right-0 w-1 h-1 bg-white/20" />
                             
                             <div className="flex items-start justify-between mb-8">
                                <div className="w-14 h-14 border border-white/10 bg-white/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                   {quest.icon}
                                </div>
                                <div className={`px-2 py-1 border text-[7px] font-black tracking-[0.3em] uppercase ${
                                   quest.completed ? 'border-green-500/50 text-green-500' : 'border-red-500/50 text-red-500 animate-pulse'
                                }`}>
                                   {quest.completed ? 'COMPLETED' : 'PENDING_VALIDATION'}
                                </div>
                             </div>

                             <h4 className="text-xl font-black text-white tracking-widest uppercase mb-3 group-hover:text-red-500 transition-colors">
                                {quest.name}
                             </h4>
                             <p className="text-[10px] font-mono text-white/40 leading-relaxed uppercase h-12 line-clamp-2">
                                {quest.description}
                             </p>

                             <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/5">
                                <div className="flex gap-6">
                                   <div className="flex flex-col">
                                      <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest mb-1">INTEL</span>
                                      <span className="text-xs font-black text-white">{quest.xpReward} XP</span>
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[7px] font-mono text-white/30 uppercase tracking-widest mb-1">ASSET</span>
                                      <span className="text-xs font-black text-red-600">{quest.rdxReward} RDX</span>
                                   </div>
                                </div>

                                {quest.completed ? (
                                   <div className="text-green-500 text-[9px] font-black tracking-widest flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 bg-green-500" />
                                      ON_CHAIN_SECURED
                                   </div>
                                ) : (
                                   <button
                                      onClick={() => claimOnChainMission(quest.id)}
                                      disabled={!!claimingId}
                                      className="px-6 py-3 bg-white text-black text-[9px] font-black tracking-widest uppercase hover:bg-red-600 hover:text-white transition-all shadow-[6px_6px_0px_rgba(255,0,0,0.3)] disabled:opacity-50"
                                   >
                                      {claimingId === quest.id ? 'UPLOADING...' : 'CLAIM_REWARD'}
                                   </button>
                                )}
                             </div>
                          </div>
                       ))}
                    </motion.div>
                 ) : activeTab === 'profile' ? (
                    <motion.div 
                       key="profile"
                       initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                       className="space-y-8"
                    >
                       <div className="grid sm:grid-cols-2 gap-8">
                          <div className="border border-white/10 bg-white/[0.01] p-10 relative group overflow-hidden">
                             <div className="absolute inset-0 bg-red-600/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                             <div className="relative z-10">
                                <div className="text-[9px] font-mono text-white/20 tracking-widest uppercase mb-8">DAILY_SYSTEM_SYNC</div>
                                <div className="flex items-end justify-between">
                                   <div className="text-5xl font-black text-white">{streak}<span className="text-lg text-red-600 ml-2">DAYS</span></div>
                                   <button 
                                      onClick={handleCheckin}
                                      disabled={checkinLoading}
                                      className="px-8 py-4 bg-white text-black text-[10px] font-black tracking-widest uppercase hover:bg-red-600 hover:text-white transition-all shadow-[6px_6px_0px_rgba(255,0,0,0.2)] disabled:opacity-50"
                                   >
                                      {checkinLoading ? 'SYNCING...' : 'SYNC_STREAK'}
                                   </button>
                                </div>
                             </div>
                          </div>

                          <div className="border border-white/10 bg-white/[0.01] p-10">
                             <div className="text-[9px] font-mono text-white/20 tracking-widest uppercase mb-8">PROGRESS_TO_NEXT_CLEARANCE</div>
                             <div className="flex justify-between text-[11px] font-mono text-white mb-3">
                                <span>{xp.toLocaleString()} XP</span>
                                <span className="text-white/40">{level?.nextLevel?.xpNeeded ? `TARGET: ${level.nextLevel.xpNeeded.toLocaleString()}` : 'CLEARANCE_MAX'}</span>
                             </div>
                             <div className="h-2 bg-white/5 relative overflow-hidden">
                                <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${xpProgress}%` }}
                                   className="h-full bg-red-600"
                                />
                             </div>
                             <div className="mt-4 text-[8px] font-mono text-red-500/40 tracking-[0.3em] uppercase">SYSTEM_INTEGRITY_CHECK_OK</div>
                          </div>
                       </div>

                       <div className="border border-white/10 bg-white/[0.01] p-10">
                          <h4 className="text-sm font-black text-white tracking-[0.4em] uppercase mb-8 border-b border-white/5 pb-6">ACHIEVEMENTS_LOG</h4>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-6">
                             {badges.length > 0 ? badges.map((badge, i) => (
                                <div key={i} className="aspect-square border border-white/10 bg-white/5 flex items-center justify-center text-xl grayscale hover:grayscale-0 transition-all cursor-help" title={badge}>
                                   {badge === 'verified' ? '✅' : '🔰'}
                                </div>
                             )) : (
                                [1,2,3,4,5,6,7,8].map(i => (
                                   <div key={i} className="aspect-square border border-white/5 bg-white/[0.01] flex items-center justify-center text-[10px] text-white/5 font-mono">LOCKED</div>
                                ))
                             )}
                          </div>
                       </div>
                    </motion.div>
                 ) : (
                    <motion.div 
                       key="ranking"
                       initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                       className="border border-white/10 bg-white/[0.01] overflow-hidden shadow-2xl"
                    >
                       <table className="w-full text-left">
                          <thead>
                             <tr className="border-b border-white/10 bg-white/[0.03]">
                                <th className="p-8 text-[9px] font-mono text-white/20 tracking-[0.4em] uppercase">RANK</th>
                                <th className="p-8 text-[9px] font-mono text-white/20 tracking-[0.4em] uppercase">OPERATOR</th>
                                <th className="p-8 text-[9px] font-mono text-white/20 tracking-[0.4em] uppercase text-right">STREAK</th>
                                <th className="p-8 text-[9px] font-mono text-white/20 tracking-[0.4em] uppercase text-right">XP_VALUATION</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {leaderboard.map((entry, i) => (
                                <tr key={i} className="hover:bg-red-600/[0.03] transition-colors group">
                                   <td className="p-8 font-mono text-xs">
                                      <span className={i < 3 ? 'text-red-600 font-black' : 'text-white/20'}>
                                         {String(i + 1).padStart(2, '0')}
                                      </span>
                                   </td>
                                   <td className="p-8">
                                      <div className="flex items-center gap-6">
                                         <div className={`w-10 h-10 border flex items-center justify-center text-sm transition-all duration-500 ${
                                            i < 3 ? 'border-red-600/50 bg-red-600/10' : 'border-white/10 bg-white/5'
                                         }`}>
                                            {i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤'}
                                         </div>
                                         <div className="flex flex-col">
                                            <span className="text-sm text-white font-black font-mono tracking-tighter group-hover:text-red-500 transition-colors">
                                               {entry.walletAddress.slice(0, 10)}...{entry.walletAddress.slice(-6)}
                                            </span>
                                            <span className="text-[9px] text-white/20 font-mono uppercase tracking-widest">{entry.level}</span>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="p-8 text-right font-mono text-xs text-white/40">{entry.streak} DAYS</td>
                                   <td className="p-8 text-right">
                                      <span className="text-lg font-black text-red-600 font-mono tracking-tighter">{(entry?.xp || 0).toLocaleString()}</span>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </motion.div>
                 )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </section>
  )
}
