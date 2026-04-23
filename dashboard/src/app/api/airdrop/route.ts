export const dynamic = 'force-dynamic';

import * as db from '@/lib/db';
import * as antifraud from '@/lib/antifraud';

const TELEGRAM_USER_AMOUNT = 500_000_000_000;
const WALLET_CONNECT_BONUS = 200_000_000_000;
const MAX_PER_USER_CAP = 50_000_000_000_000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegramId, walletAddress, deviceFingerprint, referredBy } = body;

    if (!telegramId || !walletAddress) {
      return Response.json({ error: 'TELEGRAM_ID and WALLET_ADDRESS required' }, { status: 400 });
    }
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      return Response.json({ error: 'INVALID_SOLANA_ADDRESS' }, { status: 400 });
    }

    const ipHash = request.headers.get('x-forwarded-for') || 'unknown';
    const users = await db.getAllUsersList();
    const fraudCheck = antifraud.checkWalletRegistration({
      walletAddress, existingUsers: users, ipHash,
      deviceFingerprint: deviceFingerprint || 'unknown',
    });
    if (fraudCheck.flagged) {
      return Response.json({ error: 'FRAUD_DETECTED', reasons: fraudCheck.flags }, { status: 403 });
    }

    const existingByWallet = await db.getUser(walletAddress);
    if (existingByWallet) {
      return Response.json({
        status: 'already_registered',
        walletAddress: existingByWallet.walletAddress.slice(0, 8) + '...' + existingByWallet.walletAddress.slice(-6),
        amount: existingByWallet.airdropAmount,
        amountFormatted: `${(existingByWallet.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
        message: 'Wallet already registered',
      });
    }

    const existingByTelegram = await db.getUserByTelegram(telegramId);
    if (existingByTelegram) {
      return Response.json({
        status: 'already_registered',
        telegramId,
        walletAddress: existingByTelegram.walletAddress.slice(0, 8) + '...' + existingByTelegram.walletAddress.slice(-6),
        amount: existingByTelegram.airdropAmount,
        amountFormatted: `${(existingByTelegram.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
        message: 'Telegram account already registered',
      });
    }

    const baseAmount = TELEGRAM_USER_AMOUNT + WALLET_CONNECT_BONUS;
    const cappedAmount = Math.min(baseAmount, MAX_PER_USER_CAP);
    const now = new Date();

    const profile: db.UserProfile = {
      walletAddress, telegramId, xp: 100, level: 'CLASSIFIED', streak: 0,
      lastCheckin: null, referrals: [], referredBy: referredBy || null, totalActions: 1,
      badges: ['early_adopter'], registeredAt: now.toISOString(),
      airdropAmount: cappedAmount, ipHash, deviceFingerprint: deviceFingerprint || 'unknown',
      flagged: false, actions: { airdrop_register: 1 }, questsCompleted: [],
      weeklyActions: { airdrop_register: 1 },
      weeklyResetAt: now.getTime() + 7 * 24 * 60 * 60 * 1000,
    };

    // Handle referral bonus
    if (profile.referredBy) {
      const referrer = await db.getUser(profile.referredBy);
      if (referrer && !referrer.flagged) {
        referrer.referrals.push(walletAddress);
        referrer.xp += 200;
        referrer.level = 'CLASSIFIED'; // Will be recalculated on display
        referrer.airdropAmount = Math.min(referrer.airdropAmount + 100_000_000_000, 50_000_000_000_000);
        await db.saveUser(referrer);
        profile.xp += 200; // Referred user also gets bonus
      }
    }

    await db.saveUser(profile);

    return Response.json({
      status: 'registered', telegramId,
      walletAddress: profile.walletAddress.slice(0, 8) + '...' + profile.walletAddress.slice(-6),
      amount: profile.airdropAmount,
      amountFormatted: `${(profile.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
      breakdown: {
        base: `${(TELEGRAM_USER_AMOUNT / 1_000_000_000).toLocaleString()} RDX`,
        walletBonus: `${(WALLET_CONNECT_BONUS / 1_000_000_000).toLocaleString()} RDX`,
        total: `${(cappedAmount / 1_000_000_000).toLocaleString()} RDX`,
      },
      xp: profile.xp, level: profile.level, registeredAt: profile.registeredAt,
      message: 'ACCESS GRANTED — Wallet registered for $RDX airdrop',
    }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: `Registration failed: ${err.message || 'Unknown error'}` }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');
  const telegramId = searchParams.get('telegramId');

  if (!wallet && !telegramId) {
    const allUsers = await db.getAllUsersList();
    const totalAllocated = allUsers.reduce((sum, u) => sum + u.airdropAmount, 0);
    return Response.json({
      stats: {
        totalRegistered: allUsers.length,
        totalAllocated,
        totalAllocatedFormatted: `${(totalAllocated / 1_000_000_000).toLocaleString()} RDX`,
      },
    });
  }

  const user = wallet ? await db.getUser(wallet) : telegramId ? await db.getUserByTelegram(telegramId) : null;
  if (!user) return Response.json({ status: 'not_found', message: 'No registration found' });

  return Response.json({
    status: 'registered', telegramId: user.telegramId,
    walletAddress: user.walletAddress.slice(0, 8) + '...' + user.walletAddress.slice(-6),
    amount: user.airdropAmount,
    amountFormatted: `${(user.airdropAmount / 1_000_000_000).toLocaleString()} RDX`,
    xp: user.xp, level: user.level, streak: user.streak,
    badges: user.badges, registeredAt: user.registeredAt, referrals: user.referrals.length,
  });
}
