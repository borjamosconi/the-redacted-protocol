// Gamification & Anti-Fraud types

// ── XP & Levels ──
export type LevelName = 'CLASSIFIED' | 'RECONSTRUCTED' | 'DECLASSIFIED' | 'ARCHIVIST' | 'INTELLIGENCE' | 'DECLASSIFIER' | 'THE FILE';

export const LEVELS: Array<{ name: LevelName; minXP: number; color: string; icon: string }> = [
  { name: 'CLASSIFIED', minXP: 0, color: '#666666', icon: '🔒' },
  { name: 'RECONSTRUCTED', minXP: 100, color: '#9945FF', icon: '🔓' },
  { name: 'DECLASSIFIED', minXP: 500, color: '#3b82f6', icon: '📂' },
  { name: 'ARCHIVIST', minXP: 1_000, color: '#10b981', icon: '🗃️' },
  { name: 'INTELLIGENCE', minXP: 2_500, color: '#f59e0b', icon: '🕵️' },
  { name: 'DECLASSIFIER', minXP: 5_000, color: '#ef4444', icon: '⚡' },
  { name: 'THE FILE', minXP: 10_000, color: '#ff1a1a', icon: '👁️' },
];

export const XP_ACTIONS: Record<string, { xp: number; label: string }> = {
  register: { xp: 100, label: 'Wallet Registration' },
  daily_checkin: { xp: 25, label: 'Daily Check-in' },
  referral: { xp: 200, label: 'Referral Bonus' },
  ocr_scan: { xp: 50, label: 'OCR Document Scan' },
  news_scan: { xp: 30, label: 'News Intelligence Scan' },
  image_gen: { xp: 40, label: 'Image Generation' },
  social_share: { xp: 60, label: 'Social Media Share' },
  quest_complete: { xp: 150, label: 'Quest Completed' },
  streak_7: { xp: 500, label: '7-Day Streak Bonus' },
  streak_14: { xp: 1_000, label: '14-Day Streak Bonus' },
  streak_30: { xp: 2_000, label: '30-Day Streak Bonus' },
  first_fragment: { xp: 75, label: 'First Fragment Submitted' },
  verify_fragment: { xp: 50, label: 'Fragment Verified' },
};

// ── User Profile ──
export interface UserProfile {
  walletAddress: string;
  telegramId: string;
  xp: number;
  level: LevelName;
  streak: number;
  lastCheckin: string | null; // ISO date
  referrals: string[]; // wallet addresses referred
  referredBy: string | null; // who referred this user
  totalActions: number;
  badges: string[];
  registeredAt: string; // ISO date
  airdropAmount: number; // in lamports (RDX with 9 decimals)
  // Anti-fraud
  ipHash: string;
  deviceFingerprint: string;
  flagged: boolean;
  flagReason?: string;
}

// ── XP Log Entry ──
export interface XPLogEntry {
  walletAddress: string;
  action: string;
  xpEarned: number;
  multiplier: number;
  totalXP: number;
  timestamp: string;
  ipHash: string;
}

// ── Quest ──
export interface Quest {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  rdxReward: number;
  requirement: string;
  type: 'daily' | 'weekly' | 'lifetime';
}

export const QUESTS: Quest[] = [
  {
    id: 'daily_checkin',
    name: 'DAILY RECON',
    description: 'Check in every day',
    icon: '📡',
    xpReward: 25,
    rdxReward: 10,
    requirement: 'checkin_today',
    type: 'daily',
  },
  {
    id: 'scan_3_docs',
    name: 'DOCUMENT HUNTER',
    description: 'Scan 3 documents this week',
    icon: '📄',
    xpReward: 150,
    rdxReward: 50,
    requirement: 'ocr_count:3',
    type: 'weekly',
  },
  {
    id: 'refer_2',
    name: 'RECRUITER',
    description: 'Refer 2 friends',
    icon: '👥',
    xpReward: 300,
    rdxReward: 100,
    requirement: 'referral_count:2',
    type: 'weekly',
  },
  {
    id: 'streak_7',
    name: 'UNBREAKABLE',
    description: 'Maintain 7-day checkin streak',
    icon: '🔥',
    xpReward: 500,
    rdxReward: 200,
    requirement: 'streak:7',
    type: 'lifetime',
  },
  {
    id: 'streak_30',
    name: 'THE FILE BREATHES',
    description: 'Maintain 30-day checkin streak',
    icon: '👁️',
    xpReward: 2_000,
    rdxReward: 1_000,
    requirement: 'streak:30',
    type: 'lifetime',
  },
  {
    id: 'gen_image',
    name: 'VISUAL DECLASSIFIER',
    description: 'Generate your first image',
    icon: '🎨',
    xpReward: 40,
    rdxReward: 20,
    requirement: 'image_count:1',
    type: 'lifetime',
  },
  {
    id: 'scan_5_news',
    name: 'INTEL COLLECTOR',
    description: 'Scan 5 news articles',
    icon: '📰',
    xpReward: 150,
    rdxReward: 50,
    requirement: 'news_count:5',
    type: 'weekly',
  },
  {
    id: 'reach_1000xp',
    name: 'DECLASSIFIED',
    description: 'Reach 1,000 XP',
    icon: '⚡',
    xpReward: 0,
    rdxReward: 50,
    requirement: 'xp:1000',
    type: 'lifetime',
  },
];

// ── Leaderboard Entry ──
export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  telegramId: string;
  xp: number;
  level: LevelName;
  streak: number;
  referrals: number;
}

// ── Anti-Fraud ──
export interface FraudCheck {
  ipHash: string;
  deviceFingerprint: string;
  walletAddress: string;
  registeredAt: string;
  riskScore: number; // 0-100
  flags: string[];
}

export const FRAUD_THRESHOLDS = {
  MAX_WALLETS_PER_IP: 2,
  MAX_WALLETS_PER_DEVICE: 1,
  RATE_LIMIT_WINDOW_MS: 60_000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 3,
  SUSPICIOUS_RISK_SCORE: 60,
  BLOCK_RISK_SCORE: 80,
};

// ── Helper: Get level from XP ──
export function getLevelFromXP(xp: number): { name: LevelName; color: string; icon: string; nextLevel?: { name: string; xpNeeded: number } } {
  let current = LEVELS[0];
  let next: typeof LEVELS[number] | undefined;

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      current = LEVELS[i];
      next = LEVELS[i + 1];
      break;
    }
  }

  return {
    name: current.name,
    color: current.color,
    icon: current.icon,
    nextLevel: next
      ? { name: next.name, xpNeeded: next.minXP - xp }
      : undefined,
  };
}

// ── Helper: Calculate streak multiplier ──
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 3;
  if (streak >= 14) return 2.5;
  if (streak >= 7) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

// ── Helper: Calculate RDX bonus from XP ──
export function calculateRDxBonus(xp: number): number {
  // 1 XP = 0.5 RDX bonus on top of base 700 RDX
  return Math.floor(xp * 0.5 * 1_000_000_000); // in lamports (9 decimals)
}
