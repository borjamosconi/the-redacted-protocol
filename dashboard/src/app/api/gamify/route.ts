// Gamification API endpoints
// POST /api/gamify — Earn XP, check-in, refer, etc.
// GET /api/gamify?wallet=<address> — Get user profile
// GET /api/gamify?leaderboard=1 — Get leaderboard
// GET /api/gamify?stats=1 — Get global stats
// GET /api/gamify?quests=1 — Get available quests

export const dynamic = 'force-dynamic';

import {
  getLevelFromXP,
  getStreakMultiplier,
  calculateRDxBonus,
  XP_ACTIONS,
  QUESTS,
  type LevelName,
} from '@/lib/gamification';
import {
  getClientIP,
  hashIP,
  getDeviceFingerprint as getDeviceFP,
  assessFraudRisk,
  checkRateLimit,
  FRAUD_THRESHOLDS,
} from '@/lib/antifraud';
import * as db from '@/lib/db';

// ── POST: Earn XP / Actions ──
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, telegramId, action, deviceFingerprint, questId } = body;

    if (!walletAddress || !action) {
      return Response.json({ error: 'WALLET_ADDRESS and ACTION required' }, { status: 400 });
    }

    // Rate limiting
    const ipRaw = getClientIP(request);
    const ipHash = await hashIP(ipRaw);
    const rateCheck = checkRateLimit(ipHash, FRAUD_THRESHOLDS.RATE_LIMIT_WINDOW_MS, FRAUD_THRESHOLDS.RATE_LIMIT_MAX_REQUESTS);
    if (!rateCheck.allowed) {
      return Response.json(
        { error: `RATE_LIMITED`, retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    // Get or create user
    let user = db.getUser(walletAddress);

    if (!user) {
      return Response.json({ error: 'USER_NOT_FOUND', message: 'Register via /api/airdrop first' }, { status: 404 });
    }

    // Check if flagged
    if (user.flagged) {
      return Response.json({ error: 'ACCOUNT_FLAGGED', reason: user.flagReason }, { status: 403 });
    }

    // Check daily check-in cooldown
    if (action === 'daily_checkin') {
      const today = new Date().toISOString().split('T')[0];
      if (user.lastCheckin === today) {
        return Response.json({ error: 'ALREADY_CHECKED_IN', lastCheckin: user.lastCheckin }, { status: 400 });
      }
    }

    // Check quest completion
    if (action === 'quest_complete' && questId) {
      if (user.questsCompleted.includes(questId)) {
        return Response.json({ error: 'QUEST_ALREADY_COMPLETED', questId }, { status: 400 });
      }
      const quest = QUESTS.find(q => q.id === questId);
      if (!quest) {
        return Response.json({ error: 'QUEST_NOT_FOUND', questId }, { status: 404 });
      }
      // Check quest requirements
      if (!checkQuestRequirement(user, quest)) {
        return Response.json({ error: 'QUEST_REQUIREMENT_NOT_MET', quest: quest.name }, { status: 400 });
      }
    }

    // Calculate XP
    const xpConfig = XP_ACTIONS[action];
    if (!xpConfig) {
      return Response.json({ error: `UNKNOWN_ACTION: ${action}` }, { status: 400 });
    }

    // Check streak multiplier
    const multiplier = getStreakMultiplier(user.streak);
    const xpEarned = Math.round(xpConfig.xp * multiplier);

    // Update streak for daily check-in
    let streakBonus = 0;
    if (action === 'daily_checkin') {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (user.lastCheckin === yesterday) {
        user.streak += 1;
      } else if (user.lastCheckin !== new Date().toISOString().split('T')[0]) {
        user.streak = 1;
      }
      user.lastCheckin = new Date().toISOString().split('T')[0];

      // Streak bonuses
      if (user.streak === 7) {
        streakBonus = 500;
        user.badges.push('UNBREAKABLE');
      } else if (user.streak === 14) {
        streakBonus = 1000;
        user.badges.push('TWO_WEEK_WARRIOR');
      } else if (user.streak === 30) {
        streakBonus = 2000;
        user.badges.push('THE_FILE_BREATHES');
      }
    }

    // Update user
    user.xp += xpEarned + streakBonus;
    user.totalActions += 1;
    const levelInfo = getLevelFromXP(user.xp);
    user.level = levelInfo.name as LevelName;

    // Check for new level badge
    const prevLevel = getLevelFromXP(user.xp - xpEarned - streakBonus);
    if (prevLevel.name !== user.level) {
      user.badges.push(`LEVEL_${user.level.replace(/\s/g, '_')}`);
    }

    // Track action count
    user.actions[action] = (user.actions[action] || 0) + 1;

    // Track weekly actions
    user.weeklyActions[action] = (user.weeklyActions[action] || 0) + 1;
    user = db.checkWeeklyReset(user);

    // Update airdrop amount (base 1000 RDX + XP bonus)
    user.airdropAmount = 1_000_000_000_000 + calculateRDxBonus(user.xp);

    // Handle referral XP
    if (action === 'referral' && user.referredBy) {
      const referrer = db.getUser(user.referredBy);
      if (referrer && !referrer.flagged) {
        const refXP = Math.round(200 * getStreakMultiplier(referrer.streak)); // 200 XP for referrer
        referrer.xp += refXP;
        referrer.referrals.push(walletAddress);
        referrer.totalActions += 1;
        const refLevelInfo = getLevelFromXP(referrer.xp);
        referrer.level = refLevelInfo.name as LevelName;
        referrer.airdropAmount = 1_000_000_000_000 + calculateRDxBonus(referrer.xp);
        db.saveUser(referrer);
      }
    }

    // Handle quest completion
    let questReward = 0;
    if (action === 'quest_complete' && questId) {
      const quest = QUESTS.find(q => q.id === questId);
      if (quest) {
        questReward = quest.xpReward;
        user.xp += questReward;
        user.questsCompleted.push(questId);
        user.airdropAmount += quest.rdxReward * 1_000_000_000; // RDX in lamports
      }
    }

    // Save user
    db.saveUser(user);

    // Log XP
    db.addXPLog({
      walletAddress,
      action,
      xpEarned: xpEarned + streakBonus + questReward,
      multiplier,
      totalXP: user.xp,
      timestamp: new Date().toISOString(),
    });

    const levelInfo2 = getLevelFromXP(user.xp);

    return Response.json({
      success: true,
      xpEarned: xpEarned + streakBonus + questReward,
      baseXP: xpConfig.xp,
      streakBonus,
      questReward,
      multiplier,
      streak: user.streak,
      totalXP: user.xp,
      level: levelInfo2,
      airdropAmount: user.airdropAmount,
      airdropFormatted: `${(user.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      badges: user.badges,
      actions: user.actions,
      questsCompleted: user.questsCompleted,
    });
  } catch (err: any) {
    return Response.json({ error: `Failed: ${err.message || 'Unknown error'}` }, { status: 500 });
  }
}

// ── GET: User profile / Leaderboard / Stats / Quests ──
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Leaderboard
  if (searchParams.get('leaderboard')) {
    const limit = parseInt(searchParams.get('limit') || '100');
    const leaderboard = db.getLeaderboard(limit);
    return Response.json({ leaderboard });
  }

  // Global stats
  if (searchParams.get('stats')) {
    const stats = db.getGlobalStats();
    return Response.json({ stats });
  }

  // Available quests
  if (searchParams.get('quests')) {
    const wallet = searchParams.get('wallet');
    if (wallet) {
      const user = db.getUser(wallet);
      if (user) {
        const availableQuests = QUESTS.map(q => ({
          ...q,
          completed: user.questsCompleted.includes(q.id),
          progress: getQuestProgress(user, q),
        }));
        return Response.json({ quests: availableQuests });
      }
    }
    return Response.json({ quests: QUESTS.map(q => ({ ...q, completed: false, progress: 0 })) });
  }

  // Fraud check (admin)
  if (searchParams.get('fraud_check')) {
    const users = db.getAllUsers();
    const allUsers = Object.values(users);
    const flaggedUsers = allUsers.filter(u => u.flagged);
    const highRisk = allUsers.filter(u => !u.flagged && u.ipHash && allUsers.filter(x => x.ipHash === u.ipHash).length >= 2);

    return Response.json({
      totalUsers: allUsers.length,
      flaggedUsers: flaggedUsers.length,
      highRiskUsers: highRisk.length,
      flaggedDetails: flaggedUsers.map(u => ({
        wallet: u.walletAddress.slice(0, 8) + '...' + u.walletAddress.slice(-6),
        reason: u.flagReason,
        registeredAt: u.registeredAt,
      })),
    });
  }

  // User profile
  const wallet = searchParams.get('wallet');
  const telegramId = searchParams.get('telegramId');

  if (wallet || telegramId) {
    const user = wallet ? db.getUser(wallet) : db.getUserByTelegram(telegramId || '');
    if (!user) {
      return Response.json({ status: 'not_found', message: 'User not found' });
    }

    const levelInfo = getLevelFromXP(user.xp);
    const xpForNext = levelInfo.nextLevel ? levelInfo.nextLevel.xpNeeded : 0;
    const xpProgress = levelInfo.nextLevel
      ? ((user.xp - getLevelMinXP(levelInfo.name as LevelName)) / (getLevelMinXP(levelInfo.nextLevel.name as LevelName) - getLevelMinXP(levelInfo.name as LevelName))) * 100
      : 100;

    // Get available quests with progress
    const quests = QUESTS.map(q => ({
      ...q,
      completed: user.questsCompleted.includes(q.id),
      progress: getQuestProgress(user, q),
    }));

    return Response.json({
      status: 'active',
      walletAddress: user.walletAddress.slice(0, 8) + '...' + user.walletAddress.slice(-6),
      walletFull: user.walletAddress,
      telegramId: user.telegramId,
      xp: user.xp,
      level: levelInfo,
      levelName: levelInfo.name,
      xpForNextLevel: xpForNext,
      xpProgress: Math.round(xpProgress),
      streak: user.streak,
      streakMultiplier: getStreakMultiplier(user.streak),
      lastCheckin: user.lastCheckin,
      referrals: user.referrals.length,
      referralCode: user.walletAddress.slice(0, 10),
      referredBy: user.referredBy ? user.referredBy.slice(0, 8) + '...' : null,
      badges: user.badges,
      actions: user.actions,
      questsCompleted: user.questsCompleted.length,
      totalQuests: QUESTS.length,
      quests,
      airdropAmount: user.airdropAmount,
      airdropFormatted: `${(user.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      baseAirdrop: '1,000 RDX',
      bonusAirdrop: `${((user.airdropAmount - 1_000_000_000_000) / 1_000_000_000).toLocaleString()} RDX`,
      registeredAt: user.registeredAt,
      flagged: user.flagged,
    });
  }

  // Default: return leaderboard top 10
  const leaderboard = db.getLeaderboard(10);
  const stats = db.getGlobalStats();
  return Response.json({ leaderboard, stats });
}

// ── POST: Register user with anti-fraud ──
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, telegramId, deviceFingerprint } = body;

    if (!walletAddress || !telegramId) {
      return Response.json({ error: 'WALLET_ADDRESS and TELEGRAM_ID required' }, { status: 400 });
    }

    // Rate limiting
    const ipRaw = getClientIP(request);
    const ipHash = await hashIP(ipRaw);
    const rateCheck = checkRateLimit(ipHash);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'RATE_LIMITED', retryAfter: rateCheck.retryAfter }, { status: 429 });
    }

    // Check if already registered
    const existingUser = db.getUser(walletAddress);
    if (existingUser) {
      return Response.json({
        status: 'already_registered',
        walletAddress: existingUser.walletAddress.slice(0, 8) + '...' + existingUser.walletAddress.slice(-6),
        xp: existingUser.xp,
        level: existingUser.level,
      });
    }

    // Fraud assessment
    const users = db.getAllUsers();
    const allUsers = Object.values(users);
    const fraudCheck = await assessFraudRisk({
      ipHash,
      deviceFingerprint: deviceFingerprint || '',
      walletAddress,
      existingUsers: allUsers.map(u => ({
        ipHash: u.ipHash,
        deviceFingerprint: u.deviceFingerprint,
        walletAddress: u.walletAddress,
        flagged: u.flagged,
      })),
    });

    // Create user
    const user: db.UserProfile = {
      walletAddress,
      telegramId,
      xp: 100, // Registration bonus
      level: 'CLASSIFIED',
      streak: 0,
      lastCheckin: null,
      referrals: [],
      referredBy: body.referredBy || null,
      totalActions: 1,
      badges: ['EARLY_ADOPTER'],
      registeredAt: new Date().toISOString(),
      airdropAmount: 1_000_000_000_000, // 1000 RDX base
      ipHash,
      deviceFingerprint: deviceFingerprint || '',
      flagged: fraudCheck.riskScore >= FRAUD_THRESHOLDS.BLOCK_RISK_SCORE,
      flagReason: fraudCheck.flags.join('; '),
      actions: { register: 1 },
      questsCompleted: [],
      weeklyActions: { register: 1 },
      weeklyResetAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    // Handle referral
    if (user.referredBy) {
      const referrer = db.getUser(user.referredBy);
      if (referrer) {
        referrer.referrals.push(walletAddress);
        referrer.xp += 200;
        referrer.airdropAmount = 1_000_000_000_000 + calculateRDxBonus(referrer.xp);
        db.saveUser(referrer);
        user.xp += 200; // Referral bonus for new user too
      }
    }

    db.saveUser(user);

    // Log XP
    db.addXPLog({
      walletAddress,
      action: 'register',
      xpEarned: user.xp,
      multiplier: 1,
      totalXP: user.xp,
      timestamp: new Date().toISOString(),
    });

    if (user.flagged) {
      return Response.json({
        status: 'flagged',
        message: 'Registration under review',
        walletAddress: user.walletAddress.slice(0, 8) + '...' + user.walletAddress.slice(-6),
        xp: user.xp,
        level: user.level,
        fraudFlags: fraudCheck.flags,
        riskScore: fraudCheck.riskScore,
      }, { status: 202 });
    }

    return Response.json({
      status: 'registered',
      walletAddress: user.walletAddress,
      telegramId: user.telegramId,
      xp: user.xp,
      level: user.level,
      airdropAmount: user.airdropAmount,
      airdropFormatted: `${(user.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      badges: user.badges,
      referralCode: user.walletAddress.slice(0, 10),
      message: 'ACCESS GRANTED — Wallet registered for $RDX airdrop',
    }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: `Registration failed: ${err.message || 'Unknown error'}` }, { status: 500 });
  }
}

// ── Helpers ──
function getLevelMinXP(name: string): number {
  const level = XP_ACTIONS['register']; // fallback
  const levels = [
    { name: 'CLASSIFIED', minXP: 0 },
    { name: 'RECONSTRUCTED', minXP: 100 },
    { name: 'DECLASSIFIED', minXP: 500 },
    { name: 'ARCHIVIST', minXP: 1_000 },
    { name: 'INTELLIGENCE', minXP: 2_500 },
    { name: 'DECLASSIFIER', minXP: 5_000 },
    { name: 'THE FILE', minXP: 10_000 },
  ];
  const found = levels.find(l => l.name === name);
  return found?.minXP || 0;
}

function checkQuestRequirement(user: db.UserProfile, quest: any): boolean {
  const req = quest.requirement;
  if (req === 'checkin_today') {
    const today = new Date().toISOString().split('T')[0];
    return user.lastCheckin === today;
  }
  if (req.startsWith('streak:')) {
    const needed = parseInt(req.split(':')[1]);
    return user.streak >= needed;
  }
  if (req.startsWith('ocr_count:')) {
    const needed = parseInt(req.split(':')[1]);
    return (user.actions['ocr_scan'] || 0) >= needed;
  }
  if (req.startsWith('news_count:')) {
    const needed = parseInt(req.split(':')[1]);
    return (user.actions['news_scan'] || 0) >= needed;
  }
  if (req.startsWith('referral_count:')) {
    const needed = parseInt(req.split(':')[1]);
    return user.referrals.length >= needed;
  }
  if (req.startsWith('image_count:')) {
    const needed = parseInt(req.split(':')[1]);
    return (user.actions['image_gen'] || 0) >= needed;
  }
  if (req.startsWith('xp:')) {
    const needed = parseInt(req.split(':')[1]);
    return user.xp >= needed;
  }
  return false;
}

function getQuestProgress(user: db.UserProfile, quest: any): number {
  const req = quest.requirement;
  if (req === 'checkin_today') {
    const today = new Date().toISOString().split('T')[0];
    return user.lastCheckin === today ? 100 : 0;
  }
  if (req.startsWith('streak:')) {
    const needed = parseInt(req.split(':')[1]);
    return Math.min(100, Math.round((user.streak / needed) * 100));
  }
  if (req.startsWith('ocr_count:')) {
    const needed = parseInt(req.split(':')[1]);
    return Math.min(100, Math.round(((user.actions['ocr_scan'] || 0) / needed) * 100));
  }
  if (req.startsWith('news_count:')) {
    const needed = parseInt(req.split(':')[1]);
    return Math.min(100, Math.round(((user.actions['news_scan'] || 0) / needed) * 100));
  }
  if (req.startsWith('referral_count:')) {
    const needed = parseInt(req.split(':')[1]);
    return Math.min(100, Math.round((user.referrals.length / needed) * 100));
  }
  if (req.startsWith('image_count:')) {
    const needed = parseInt(req.split(':')[1]);
    return Math.min(100, Math.round(((user.actions['image_gen'] || 0) / needed) * 100));
  }
  if (req.startsWith('xp:')) {
    const needed = parseInt(req.split(':')[1]);
    return Math.min(100, Math.round((user.xp / needed) * 100));
  }
  return 0;
}
