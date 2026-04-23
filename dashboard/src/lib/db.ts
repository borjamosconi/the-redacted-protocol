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
  const users = await getAllUsersList()
  return users
    .filter(u => !u.flagged)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit)
    .map((u, i) => ({
      rank: i + 1,
      walletAddress: u.walletAddress,
      telegramId: u.telegramId,
      xp: u.xp,
      level: u.level,
      streak: u.streak,
      referrals: u.referrals.length,
      badges: u.badges.length,
    }))
}

// ── Stats ──

export async function getGlobalStats() {
  const users = await getAllUsersList()
  const activeUsers = users.filter(u => !u.flagged)
  const totalXP = activeUsers.reduce((sum, u) => sum + u.xp, 0)
  const avgStreak = activeUsers.length > 0
    ? Math.round(activeUsers.reduce((sum, u) => sum + u.streak, 0) / activeUsers.length)
    : 0
  const maxStreak = Math.max(0, ...activeUsers.map(u => u.streak))

  return {
    totalUsers: activeUsers.length,
    totalXP,
    avgStreak,
    maxStreak,
    totalReferrals: activeUsers.reduce((sum, u) => sum + u.referrals.length, 0),
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
