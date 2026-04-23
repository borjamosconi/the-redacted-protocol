// Gamification API endpoints
export const dynamic = 'force-dynamic';

import {
  getLevelFromXP,
  getStreakMultiplier,
  calculateRDxBonus,
  XP_ACTIONS,
  QUESTS,
  type LevelName,
} from '@/lib/gamification';
import { getClientIP, hashIP, checkRateLimit } from '@/lib/antifraud';
import * as db from '@/lib/db';
import { LEVELS } from '@/lib/gamification';

// ── POST: Earn XP ──
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, action, questId } = body;

    if (!walletAddress || !action) {
      return Response.json({ error: 'WALLET_ADDRESS and ACTION required' }, { status: 400 });
    }

    const ipRaw = getClientIP(request);
    const ipHash = await hashIP(ipRaw);
    const rateCheck = await checkRateLimit(ipHash, 60_000, 3);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'RATE_LIMITED', retryAfter: rateCheck.retryAfter }, { status: 429 });
    }

    let user = await db.getUser(walletAddress);
    if (!user) {
      return Response.json({ error: 'USER_NOT_FOUND', message: 'Register via /api/airdrop first' }, { status: 404 });
    }
    if (user.flagged) {
      return Response.json({ error: 'ACCOUNT_FLAGGED', reason: user.flagReason }, { status: 403 });
    }

    if (action === 'daily_checkin') {
      const today = new Date().toISOString().split('T')[0];
      if (user.lastCheckin === today) {
        return Response.json({ error: 'ALREADY_CHECKED_IN', lastCheckin: user.lastCheckin }, { status: 400 });
      }
    }

    if (action === 'quest_complete' && questId) {
      if (user.questsCompleted.includes(questId)) {
        return Response.json({ error: 'QUEST_ALREADY_COMPLETED', questId }, { status: 400 });
      }
      const quest = QUESTS.find(q => q.id === questId);
      if (!quest) return Response.json({ error: 'QUEST_NOT_FOUND', questId }, { status: 404 });
      if (!checkQuestRequirement(user, quest)) {
        return Response.json({ error: 'QUEST_REQUIREMENT_NOT_MET', quest: quest.name }, { status: 400 });
      }
    }

    const xpConfig = XP_ACTIONS[action];
    if (!xpConfig) return Response.json({ error: `UNKNOWN_ACTION: ${action}` }, { status: 400 });

    const multiplier = getStreakMultiplier(user.streak);
    const xpEarned = Math.round(xpConfig.xp * multiplier);
    let streakBonus = 0;

    if (action === 'daily_checkin') {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (user.lastCheckin === yesterday) user.streak += 1;
      else if (user.lastCheckin !== new Date().toISOString().split('T')[0]) user.streak = 1;
      user.lastCheckin = new Date().toISOString().split('T')[0];

      if (user.streak === 7) { streakBonus = 500; user.badges.push('UNBREAKABLE'); }
      else if (user.streak === 14) { streakBonus = 1000; user.badges.push('TWO_WEEK_WARRIOR'); }
      else if (user.streak === 30) { streakBonus = 2000; user.badges.push('THE_FILE_BREATHES'); }
    }

    user.xp += xpEarned + streakBonus;
    user.totalActions += 1;
    user.level = getLevelFromXP(user.xp).name as LevelName;

    const prevLevel = getLevelFromXP(user.xp - xpEarned - streakBonus);
    if (prevLevel.name !== user.level) {
      user.badges.push(`LEVEL_${user.level.replace(/\s/g, '_')}`);
    }

    user.actions[action] = (user.actions[action] || 0) + 1;
    user.weeklyActions[action] = (user.weeklyActions[action] || 0) + 1;
    user = db.checkWeeklyReset(user);

    const MAX_CAP = 50_000_000_000_000;
    user.airdropAmount = Math.min(700_000_000_000 + calculateRDxBonus(user.xp), MAX_CAP);

    let questReward = 0;
    if (action === 'quest_complete' && questId) {
      const quest = QUESTS.find(q => q.id === questId);
      if (quest) {
        questReward = quest.xpReward;
        user.xp += questReward;
        user.questsCompleted.push(questId);
        user.airdropAmount = Math.min(user.airdropAmount + quest.rdxReward * 1_000_000_000, MAX_CAP);
      }
    }

    if (action === 'referral' && user.referredBy) {
      const referrer = await db.getUser(user.referredBy);
      if (referrer && !referrer.flagged) {
        const refXP = Math.round(200 * getStreakMultiplier(referrer.streak));
        referrer.xp += refXP;
        referrer.referrals.push(walletAddress);
        referrer.totalActions += 1;
        referrer.level = getLevelFromXP(referrer.xp).name as LevelName;
        referrer.airdropAmount = Math.min(700_000_000_000 + calculateRDxBonus(referrer.xp), 50_000_000_000_000);
        await db.saveUser(referrer);
      }
    }

    await db.saveUser(user);

    const totalXPEarned = action === 'quest_complete' ? questReward + streakBonus : xpEarned + streakBonus + questReward;
    await db.addXPLog({ walletAddress, action, xpEarned: totalXPEarned, multiplier, totalXP: user.xp, timestamp: new Date().toISOString() });

    const levelInfo = getLevelFromXP(user.xp);
    return Response.json({
      success: true, xpEarned: totalXPEarned, baseXP: xpConfig.xp, streakBonus, questReward,
      multiplier, streak: user.streak, totalXP: user.xp, level: levelInfo,
      airdropAmount: user.airdropAmount,
      airdropFormatted: `${(user.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      badges: user.badges, actions: user.actions, questsCompleted: user.questsCompleted,
    });
  } catch (err: any) {
    return Response.json({ error: `Failed: ${err.message || 'Unknown error'}` }, { status: 500 });
  }
}

// ── GET: Profile / Leaderboard / Stats / Quests ──
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('leaderboard')) {
    const limit = parseInt(searchParams.get('limit') || '100');
    const leaderboard = await db.getLeaderboard(limit);
    return Response.json({ leaderboard });
  }

  if (searchParams.get('stats')) {
    const stats = await db.getGlobalStats();
    return Response.json({ stats });
  }

  if (searchParams.get('quests')) {
    const wallet = searchParams.get('wallet');
    if (wallet) {
      const user = await db.getUser(wallet);
      if (user) {
        const quests = QUESTS.map(q => ({ ...q, completed: user.questsCompleted.includes(q.id), progress: getQuestProgress(user, q) }));
        return Response.json({ quests });
      }
    }
    return Response.json({ quests: QUESTS.map(q => ({ ...q, completed: false, progress: 0 })) });
  }

  const wallet = searchParams.get('wallet');
  const telegramId = searchParams.get('telegramId');

  if (wallet || telegramId) {
    const user = wallet ? await db.getUser(wallet) : await db.getUserByTelegram(telegramId || '');
    if (!user) return Response.json({ status: 'not_found', message: 'User not found' });

    const levelInfo = getLevelFromXP(user.xp);
    const xpForNext = levelInfo.nextLevel ? levelInfo.nextLevel.xpNeeded : 0;
    const currentMinXP = getLevelMinXP(levelInfo.name as LevelName);
    const nextMinXP = levelInfo.nextLevel ? getLevelMinXP(levelInfo.nextLevel.name as LevelName) : currentMinXP;
    const xpProgress = levelInfo.nextLevel ? ((user.xp - currentMinXP) / (nextMinXP - currentMinXP)) * 100 : 100;

    const quests = QUESTS.map(q => ({ ...q, completed: user.questsCompleted.includes(q.id), progress: getQuestProgress(user, q) }));

    return Response.json({
      status: 'active',
      walletAddress: user.walletAddress.slice(0, 8) + '...' + user.walletAddress.slice(-6),
      telegramId: user.telegramId,
      xp: user.xp, level: levelInfo, levelName: levelInfo.name,
      xpForNextLevel: xpForNext, xpProgress: Math.round(xpProgress),
      streak: user.streak, streakMultiplier: getStreakMultiplier(user.streak),
      lastCheckin: user.lastCheckin, referrals: user.referrals.length,
      referralCode: user.walletAddress.slice(0, 10),
      referredBy: user.referredBy ? user.referredBy.slice(0, 8) + '...' : null,
      badges: user.badges, actions: user.actions,
      questsCompleted: user.questsCompleted.length, totalQuests: QUESTS.length, quests,
      airdropAmount: user.airdropAmount,
      airdropFormatted: `${(user.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      baseAirdrop: '700 RDX',
      bonusAirdrop: `${((user.airdropAmount - 700_000_000_000) / 1_000_000_000).toLocaleString()} RDX`,
      registeredAt: user.registeredAt, flagged: user.flagged,
    });
  }

  const [leaderboard, stats] = await Promise.all([db.getLeaderboard(10), db.getGlobalStats()]);
  return Response.json({ leaderboard, stats });
}

// ── PUT: Register user ──
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, telegramId, deviceFingerprint } = body;

    if (!walletAddress || !telegramId) {
      return Response.json({ error: 'WALLET_ADDRESS and TELEGRAM_ID required' }, { status: 400 });
    }

    const existingByWallet = await db.getUser(walletAddress);
    if (existingByWallet) {
      const levelInfo = getLevelFromXP(existingByWallet.xp);
      return Response.json({
        status: 'already_registered',
        walletAddress: existingByWallet.walletAddress.slice(0, 8) + '...' + existingByWallet.walletAddress.slice(-6),
        xp: existingByWallet.xp, level: levelInfo.name,
        airdropAmount: existingByWallet.airdropAmount,
        airdropFormatted: `${(existingByWallet.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      }, { status: 200 });
    }

    const existingByTelegram = await db.getUserByTelegram(telegramId);
    if (existingByTelegram) {
      const levelInfo = getLevelFromXP(existingByTelegram.xp);
      return Response.json({
        status: 'already_registered',
        walletAddress: existingByTelegram.walletAddress.slice(0, 8) + '...' + existingByTelegram.walletAddress.slice(-6),
        xp: existingByTelegram.xp, level: levelInfo.name,
        airdropAmount: existingByTelegram.airdropAmount,
        airdropFormatted: `${(existingByTelegram.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      }, { status: 200 });
    }

    const ipRaw = getClientIP(request);
    const ipHash = await hashIP(ipRaw);
    const rateCheck = await checkRateLimit(ipHash);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'RATE_LIMITED', retryAfter: rateCheck.retryAfter }, { status: 429 });
    }

    const levelInfo = getLevelFromXP(100);
    const user: db.UserProfile = {
      walletAddress, telegramId, xp: 100, level: levelInfo.name, streak: 0,
      lastCheckin: null, referrals: [], referredBy: body.referredBy || null,
      totalActions: 1, badges: ['EARLY_ADOPTER'], registeredAt: new Date().toISOString(),
      airdropAmount: 700_000_000_000, ipHash, deviceFingerprint: deviceFingerprint || '',
      flagged: false, flagReason: '', actions: { register: 1 }, questsCompleted: [],
      weeklyActions: { register: 1 }, weeklyResetAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    if (user.referredBy) {
      const referrer = await db.getUser(user.referredBy);
      if (referrer) {
        referrer.referrals.push(walletAddress);
        referrer.xp += 200;
        referrer.level = getLevelFromXP(referrer.xp).name as LevelName;
        referrer.airdropAmount = Math.min(700_000_000_000 + calculateRDxBonus(referrer.xp), 50_000_000_000_000);
        await db.saveUser(referrer);
        user.xp += 200;
      }
    }

    await db.saveUser(user);

    return Response.json({
      status: 'registered', walletAddress: user.walletAddress, telegramId: user.telegramId,
      xp: user.xp, level: user.level, airdropAmount: user.airdropAmount,
      airdropFormatted: `${(user.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      badges: user.badges, referralCode: user.walletAddress.slice(0, 10),
      message: 'ACCESS GRANTED — Wallet registered for $RDX airdrop',
    }, { status: 201 });
  } catch (err: any) {
    console.error('PUT /api/gamify error:', err);
    return Response.json({ error: `Registration failed: ${err.message || 'Unknown error'}` }, { status: 500 });
  }
}

// ── Helpers ──
function getLevelMinXP(name: LevelName): number {
  const found = LEVELS.find(l => l.name === name);
  return found?.minXP || 0;
}

function checkQuestRequirement(user: db.UserProfile, quest: { id: string; requirement: string }): boolean {
  const req = quest.requirement;
  if (req === 'checkin_today') {
    const today = new Date().toISOString().split('T')[0];
    return user.lastCheckin === today;
  }
  if (req.startsWith('streak:')) return user.streak >= parseInt(req.split(':')[1]);
  if (req.startsWith('ocr_count:')) return (user.actions['ocr_scan'] || 0) >= parseInt(req.split(':')[1]);
  if (req.startsWith('news_count:')) return (user.actions['news_scan'] || 0) >= parseInt(req.split(':')[1]);
  if (req.startsWith('referral_count:')) return user.referrals.length >= parseInt(req.split(':')[1]);
  if (req.startsWith('image_count:')) return (user.actions['image_gen'] || 0) >= parseInt(req.split(':')[1]);
  if (req.startsWith('xp:')) return user.xp >= parseInt(req.split(':')[1]);
  return false;
}

function getQuestProgress(user: db.UserProfile, quest: { requirement: string }): number {
  const req = quest.requirement;
  if (req === 'checkin_today') return user.lastCheckin === new Date().toISOString().split('T')[0] ? 100 : 0;
  if (req.startsWith('streak:')) return Math.min(100, Math.round((user.streak / parseInt(req.split(':')[1])) * 100));
  if (req.startsWith('ocr_count:')) return Math.min(100, Math.round(((user.actions['ocr_scan'] || 0) / parseInt(req.split(':')[1])) * 100));
  if (req.startsWith('news_count:')) return Math.min(100, Math.round(((user.actions['news_scan'] || 0) / parseInt(req.split(':')[1])) * 100));
  if (req.startsWith('referral_count:')) return Math.min(100, Math.round((user.referrals.length / parseInt(req.split(':')[1])) * 100));
  if (req.startsWith('image_count:')) return Math.min(100, Math.round(((user.actions['image_gen'] || 0) / parseInt(req.split(':')[1])) * 100));
  if (req.startsWith('xp:')) return Math.min(100, Math.round((user.xp / parseInt(req.split(':')[1])) * 100));
  return 0;
}
