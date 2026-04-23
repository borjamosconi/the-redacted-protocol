// Anti-fraud: IP detection + device fingerprinting + Redis rate limiting

import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
})

export const FRAUD_THRESHOLDS = {
  MAX_WALLETS_PER_IP: 2,
  MAX_WALLETS_PER_DEVICE: 1,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX_REQUESTS: 3,
  SUSPICIOUS_RISK_SCORE: 60,
  BLOCK_RISK_SCORE: 80,
};

export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'rdx_salt_2026_anonymous');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();
  return '127.0.0.1';
}

export function getDeviceFingerprint(): string {
  const parts: string[] = [];
  parts.push(navigator.userAgent);
  parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  parts.push(String(new Date().getTimezoneOffset()));
  parts.push(navigator.language);
  parts.push(navigator.platform);

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200; canvas.height = 50;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60'; ctx.fillRect(10, 5, 80, 40);
      ctx.fillStyle = '#069'; ctx.font = '16px Arial';
      ctx.fillText('RDX Protocol', 10, 30);
      parts.push(canvas.toDataURL());
    }
  } catch { /* Canvas blocked */ }

  parts.push(String(navigator.plugins?.length || 0));
  parts.push(String(navigator.hardwareConcurrency || 0));
  parts.push(String((navigator as any).deviceMemory || 0));

  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + '_' + btoa(str).substring(0, 12);
}

export interface FraudAssessment {
  riskScore: number;
  flags: string[];
  blocked: boolean;
}

export async function assessFraudRisk(params: {
  ipHash: string;
  deviceFingerprint: string;
  walletAddress: string;
  existingUsers: Array<{ ipHash: string; deviceFingerprint: string; walletAddress: string; flagged?: boolean }>;
}): Promise<FraudAssessment> {
  let riskScore = 0;
  const flags: string[] = [];

  const sameIP = params.existingUsers.filter(u => u.ipHash === params.ipHash);
  if (sameIP.length >= 2) {
    riskScore += 40;
    flags.push(`Multiple wallets on same IP (${sameIP.length})`);
  }

  const sameDevice = params.existingUsers.filter(u => u.deviceFingerprint === params.deviceFingerprint);
  if (sameDevice.length >= 1) {
    riskScore += 50;
    flags.push('Same device fingerprint detected');
  }

  const sameWallet = params.existingUsers.find(u => u.walletAddress === params.walletAddress);
  if (sameWallet) {
    riskScore += 80;
    flags.push('Wallet already registered');
  }

  const flaggedUser = params.existingUsers.find(u => u.flagged);
  if (flaggedUser && (flaggedUser.ipHash === params.ipHash || flaggedUser.deviceFingerprint === params.deviceFingerprint)) {
    riskScore += 30;
    flags.push('Associated with flagged account');
  }

  return { riskScore: Math.min(riskScore, 100), flags, blocked: riskScore >= 80 };
}

// ── Redis-based rate limiting (works in serverless) ──
export async function checkRateLimit(ipHash: string, windowMs: number = 60_000, maxRequests: number = 3): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  const key = `rl:${ipHash}`

  const current = await redis.get<{ count: number; firstRequest: number }>(key)

  if (!current || (now - current.firstRequest) > windowMs) {
    await redis.set(key, { count: 1, firstRequest: now }, { ex: Math.ceil(windowMs / 1000) + 10 })
    return { allowed: true }
  }

  if (current.count >= maxRequests) {
    const retryAfter = Math.ceil(((current.firstRequest + windowMs) - now) / 1000)
    return { allowed: false, retryAfter }
  }

  current.count += 1
  await redis.set(key, current, { ex: Math.ceil(windowMs / 1000) + 10 })
  return { allowed: true }
}

export function checkWalletRegistration(params: {
  walletAddress: string;
  existingUsers: Array<{ ipHash: string; deviceFingerprint: string; walletAddress: string; flagged?: boolean }>;
  ipHash: string;
  deviceFingerprint: string;
}): { flagged: boolean; flags: string[] } {
  const flags: string[] = [];
  const { walletAddress, existingUsers, ipHash, deviceFingerprint } = params;

  const sameWallet = existingUsers.find(u => u.walletAddress === walletAddress);
  if (sameWallet) flags.push('Wallet already registered');

  const sameIP = existingUsers.filter(u => u.ipHash === ipHash);
  const uniqueWalletsOnIP = new Set(sameIP.map(u => u.walletAddress)).size;
  if (uniqueWalletsOnIP >= FRAUD_THRESHOLDS.MAX_WALLETS_PER_IP) {
    flags.push(`Multiple wallets on same IP (${uniqueWalletsOnIP})`);
  }

  const sameDevice = existingUsers.filter(u => u.deviceFingerprint === deviceFingerprint);
  const uniqueWalletsOnDevice = new Set(sameDevice.map(u => u.walletAddress)).size;
  if (uniqueWalletsOnDevice >= FRAUD_THRESHOLDS.MAX_WALLETS_PER_DEVICE) {
    flags.push(`Multiple wallets on same device (${uniqueWalletsOnDevice})`);
  }

  return { flagged: flags.length > 0, flags };
}
