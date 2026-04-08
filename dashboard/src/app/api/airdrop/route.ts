// POST /api/airdrop/register — Register wallet for airdrop
// GET /api/airdrop/check?telegramId=<id> — Check airdrop status

export const dynamic = 'force-dynamic';

// In-memory store (replace with database in production)
interface AirdropRegistration {
  telegramId: string;
  walletAddress: string;
  amount: number;
  claimed: boolean;
  registeredAt: string;
  bonuses: BonusRecord[];
}

interface BonusRecord {
  type: string;
  amount: number;
  timestamp: string;
}

// Simple file-based persistence using in-memory fallback
const registrations = new Map<string, AirdropRegistration>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegramId, walletAddress } = body;

    if (!telegramId || !walletAddress) {
      return Response.json(
        { error: 'TELEGRAM_ID and WALLET_ADDRESS required' },
        { status: 400 }
      );
    }

    // Validate wallet address format (Solana base58, ~32-44 chars)
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      return Response.json(
        { error: 'INVALID_SOLANA_ADDRESS' },
        { status: 400 }
      );
    }

    // Check if already registered
    if (registrations.has(telegramId)) {
      const existing = registrations.get(telegramId)!;
      return Response.json({
        status: 'already_registered',
        telegramId,
        walletAddress: existing.walletAddress,
        amount: existing.amount,
        registeredAt: existing.registeredAt,
      });
    }

    // Register with 1000 RDX base allocation
    const registration: AirdropRegistration = {
      telegramId,
      walletAddress,
      amount: 1_000_000_000_000, // 1000 RDX (with 9 decimals)
      claimed: false,
      registeredAt: new Date().toISOString(),
      bonuses: [],
    };

    registrations.set(telegramId, registration);

    return Response.json({
      status: 'registered',
      telegramId,
      walletAddress,
      amount: registration.amount,
      amountFormatted: '1,000 RDX',
      registeredAt: registration.registeredAt,
      message: 'ACCESS GRANTED — Wallet registered for $RDX airdrop',
    }, { status: 201 });
  } catch (err: any) {
    return Response.json(
      { error: `Registration failed: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get('telegramId');

  if (!telegramId) {
    // Return aggregate stats
    const totalRegistered = registrations.size;
    const totalAllocated = Array.from(registrations.values())
      .reduce((sum, r) => sum + r.amount, 0);

    return Response.json({
      stats: {
        totalRegistered,
        totalAllocated,
        totalAllocatedFormatted: `${(totalAllocated / 1_000_000_000_000).toLocaleString()} RDX`,
      },
    });
  }

  const registration = registrations.get(telegramId);

  if (!registration) {
    return Response.json({
      status: 'not_found',
      telegramId,
      message: 'No registration found for this Telegram ID',
    });
  }

  const amountRdx = registration.amount / 1_000_000_000_000;

  return Response.json({
    status: 'registered',
    telegramId: registration.telegramId,
    walletAddress: maskWallet(registration.walletAddress),
    walletAddressFull: registration.walletAddress,
    amount: registration.amount,
    amountFormatted: `${amountRdx.toLocaleString()} RDX`,
    claimed: registration.claimed,
    registeredAt: registration.registeredAt,
    bonuses: registration.bonuses,
  });
}

function maskWallet(wallet: string): string {
  if (wallet.length < 16) return wallet;
  return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
}
