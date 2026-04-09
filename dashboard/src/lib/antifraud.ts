// Anti-fraud: IP detection + device fingerprinting

// ── Fraud thresholds ──
export const FRAUD_THRESHOLDS = {
  MAX_WALLETS_PER_IP: 2,
  MAX_WALLETS_PER_DEVICE: 1,
  RATE_LIMIT_WINDOW_MS: 60_000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 3,
  SUSPICIOUS_RISK_SCORE: 60,
  BLOCK_RISK_SCORE: 80,
};

// ── Server-side: Hash IP address ──
export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + 'rdx_salt_2026_anonymous');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// ── Server-side: Extract IP from request ──
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be comma-separated list, take first
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();
  // Fallback (for local dev)
  return '127.0.0.1';
}

// ── Client-side: Simple device fingerprint ──
export function getDeviceFingerprint(): string {
  const parts: string[] = [];

  // User agent
  parts.push(navigator.userAgent);

  // Screen resolution
  parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  parts.push(String(new Date().getTimezoneOffset()));

  // Language
  parts.push(navigator.language);

  // Platform
  parts.push(navigator.platform);

  // Canvas fingerprint (simple)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(10, 5, 80, 40);
      ctx.fillStyle = '#069';
      ctx.font = '16px Arial';
      ctx.fillText('RDX Protocol 🔒', 10, 30);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '12px Times';
      ctx.fillText('Anti-Fraud Check', 80, 40);
      parts.push(canvas.toDataURL());
    }
  } catch {
    // Canvas blocked or not available
  }

  // Installed plugins count
  parts.push(String(navigator.plugins?.length || 0));

  // Hardware concurrency
  parts.push(String(navigator.hardwareConcurrency || 0));

  // Device memory
  parts.push(String((navigator as any).deviceMemory || 0));

  // Simple hash of the combined string
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36) + '_' + btoa(str).substring(0, 12);
}

// ── Server-side: Fraud risk assessment ──
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

  // Check IP collision
  const sameIP = params.existingUsers.filter(u => u.ipHash === params.ipHash);
  if (sameIP.length >= 2) {
    riskScore += 40;
    flags.push(`Multiple wallets on same IP (${sameIP.length})`);
  }

  // Check device collision
  const sameDevice = params.existingUsers.filter(u => u.deviceFingerprint === params.deviceFingerprint);
  if (sameDevice.length >= 1) {
    riskScore += 50;
    flags.push('Same device fingerprint detected');
  }

  // Check if wallet already registered
  const sameWallet = params.existingUsers.find(u => u.walletAddress === params.walletAddress);
  if (sameWallet) {
    riskScore += 80;
    flags.push('Wallet already registered');
  }

  // Check if any existing user is flagged
  const flaggedUser = params.existingUsers.find(u => u.flagged);
  if (flaggedUser && (flaggedUser.ipHash === params.ipHash || flaggedUser.deviceFingerprint === params.deviceFingerprint)) {
    riskScore += 30;
    flags.push('Associated with flagged account');
  }

  return {
    riskScore: Math.min(riskScore, 100),
    flags,
    blocked: riskScore >= 80,
  };
}

// ── Rate limiting (in-memory, replace with Redis in production) ──
const rateLimitStore = new Map<string, { count: number; firstRequest: number }>();

export function checkRateLimit(ipHash: string, windowMs: number = 60_000, maxRequests: number = 3): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ipHash);

  if (!entry || (now - entry.firstRequest) > windowMs) {
    rateLimitStore.set(ipHash, { count: 1, firstRequest: now });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.firstRequest + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.firstRequest > 120_000) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);
