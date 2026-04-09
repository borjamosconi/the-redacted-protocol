// File-based database for gamification data
// In production, replace with PostgreSQL/Redis

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.rdx-data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const XP_LOG_FILE = path.join(DATA_DIR, 'xp_log.json');

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
  actions: Record<string, number>; // { ocr_scans: 5, news_scans: 3, ... }
  questsCompleted: string[]; // quest IDs
  weeklyActions: Record<string, number>; // reset weekly
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

// Ensure data directory exists
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read JSON file safely
function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Write JSON file atomically
function writeJSON<T>(filePath: string, data: T) {
  ensureDir();
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

// ── User Operations ──
export function getAllUsers(): Record<string, UserProfile> {
  return readJSON<Record<string, UserProfile>>(USERS_FILE, {});
}

export function getUser(walletAddress: string): UserProfile | null {
  const users = getAllUsers();
  return users[walletAddress.toLowerCase()] || null;
}

export function getUserByTelegram(telegramId: string): UserProfile | null {
  const users = getAllUsers();
  return Object.values(users).find(u => u.telegramId === telegramId) || null;
}

export function saveUser(profile: UserProfile) {
  const users = getAllUsers();
  users[profile.walletAddress.toLowerCase()] = profile;
  writeJSON(USERS_FILE, users);
}

export function deleteUser(walletAddress: string) {
  const users = getAllUsers();
  delete users[walletAddress.toLowerCase()];
  writeJSON(USERS_FILE, users);
}

// ── XP Log Operations ──
export function getXPLog(): XPLogEntry[] {
  return readJSON<XPLogEntry[]>(XP_LOG_FILE, []);
}

export function addXPLog(entry: XPLogEntry) {
  const log = getXPLog();
  log.push(entry);
  // Keep only last 10,000 entries
  if (log.length > 10_000) {
    log.splice(0, log.length - 10_000);
  }
  writeJSON(XP_LOG_FILE, log);
}

// ── Leaderboard ──
export function getLeaderboard(limit: number = 100): Array<{
  rank: number;
  walletAddress: string;
  telegramId: string;
  xp: number;
  level: string;
  streak: number;
  referrals: number;
  badges: number;
}> {
  const users = getAllUsers();
  return Object.values(users)
    .filter(u => !u.flagged) // Exclude flagged users
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
    }));
}

// ── Stats ──
export function getGlobalStats() {
  const users = getAllUsers();
  const allUsers = Object.values(users);
  const activeUsers = allUsers.filter(u => !u.flagged);
  const totalXP = activeUsers.reduce((sum, u) => sum + u.xp, 0);
  const avgStreak = activeUsers.length > 0
    ? Math.round(activeUsers.reduce((sum, u) => sum + u.streak, 0) / activeUsers.length)
    : 0;
  const maxStreak = Math.max(0, ...activeUsers.map(u => u.streak));

  return {
    totalUsers: activeUsers.length,
    totalXP,
    avgStreak,
    maxStreak,
    totalReferrals: activeUsers.reduce((sum, u) => sum + u.referrals.length, 0),
  };
}

// ── Weekly Reset ──
export function checkWeeklyReset(user: UserProfile): UserProfile {
  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  if (now > user.weeklyResetAt) {
    user.weeklyActions = {};
    user.weeklyResetAt = now + ONE_WEEK_MS;
    saveUser(user);
  }
  return user;
}
