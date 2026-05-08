// Upstash Redis database for gamification data
// Works with Vercel serverless — data persists across cold starts

import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
})

// Redis keys:
//   user:{walletAddress}  → JSON UserProfile
//   users:index           → Set of all wallet addresses
//   xplog                 → List of XPLogEntry (LRIM to 10000)

export interface UserProfile {
  walletAddress: string;
  telegramId: string;
  xp: number;
  level: string;
  streak: number;
  lastCheckin: string | null;
  referrals: string[];
  referredBy: string | null;
  totalActions: number;
  badges: string[];
  registeredAt: string;
  airdropAmount: number;
  claimedAirdropAmount: number; // Raw units (with 9 decimals)
  ipHash: string;
  deviceFingerprint: string;
  flagged: boolean;
  flagReason?: string;
  actions: Record<string, number>;
  questsCompleted: string[];
  weeklyActions: Record<string, number>;
  weeklyResetAt: number;
}

export interface XPLogEntry {
  walletAddress: string;
  action: string;
  xpEarned: number;
  multiplier: number;
  totalXP: number;
  timestamp: string;
}

// ── User Operations ──

export async function getUser(walletAddress: string): Promise<UserProfile | null> {
  const key = `user:${walletAddress.toLowerCase()}`
  const data = await redis.get<UserProfile>(key)
  return data
}

export async function getUserByTelegram(telegramId: string): Promise<UserProfile | null> {
  const keys = await redis.smembers('users:index')
  for (const key of keys) {
    const user = await redis.get<UserProfile>(key)
    if (user?.telegramId === telegramId) return user
  }
  return null
}

export async function getAllUsers(): Promise<Record<string, UserProfile>> {
  const keys = await redis.smembers('users:index')
  if (keys.length === 0) return {}
  const users = await Promise.all(keys.map(k => redis.get<UserProfile>(k)))
  const result: Record<string, UserProfile> = {}
  for (const u of users) {
    if (u) result[u.walletAddress.toLowerCase()] = u
  }
  return result
}

export async function getAllUsersList(): Promise<UserProfile[]> {
  const map = await getAllUsers()
  return Object.values(map)
}

export async function saveUser(profile: UserProfile) {
  const key = `user:${profile.walletAddress.toLowerCase()}`
  await redis.set(key, profile)
  await redis.sadd('users:index', key)
  // Sync to leaderboard zset for fast ranking
  await redis.zadd('rdx:leaderboard', { score: profile.xp, member: key })
}

export async function deleteUser(walletAddress: string) {
  const key = `user:${walletAddress.toLowerCase()}`
  await redis.del(key)
  await redis.srem('users:index', key)
}

// ── XP Log Operations ──

export async function addXPLog(entry: XPLogEntry) {
  await redis.lpush('xplog', JSON.stringify(entry))
  await redis.ltrim('xplog', 0, 9999)
}

export async function getXPLog(): Promise<XPLogEntry[]> {
  const items = await redis.lrange<string>('xplog', 0, 9999)
  return items.map(i => JSON.parse(i))
}

// ── Leaderboard ──

export async function getLeaderboard(limit: number = 100) {
  // Use Redis ZSET for O(log(N)) performance
  const top = await redis.zrange('rdx:leaderboard', 0, limit - 1, { rev: true, withScores: true })
  const result: any[] = []
  
  for (let i = 0; i < top.length; i += 2) {
    const key = top[i] as string
    const xp  = top[i+1] as number
    const wallet = key.split(':').pop() || ''
    const user = await getUser(wallet)
    
    result.push({
      rank: Math.floor(i / 2) + 1,
      walletAddress: wallet,
      telegramId: user?.telegramId || 'HIDDEN',
      xp,
      level: user?.level || 'CLASSIFIED',
      streak: user?.streak || 0,
      referrals: user?.referrals?.length || 0,
      badges: user?.badges?.length || 0,
    })
  }
  return result
}

// ── Stats ──

export async function getGlobalStats() {
  const count = await redis.scard('users:index')
  const top = await redis.zrange('rdx:leaderboard', 0, 0, { rev: true, withScores: true })
  
  return {
    totalUsers: count,
    totalXP: 0, // Simplified for performance
    avgStreak: 0,
    maxStreak: 0,
    totalReferrals: 0,
  }
}

// ── Weekly Reset ──

export function checkWeeklyReset(user: UserProfile): UserProfile {
  const now = Date.now()
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

  if (now > user.weeklyResetAt) {
    user.weeklyActions = {}
    user.weeklyResetAt = now + ONE_WEEK_MS
  }
  return user
}
