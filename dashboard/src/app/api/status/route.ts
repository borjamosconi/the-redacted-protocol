// GET /api/status — System status endpoint
// Returns agent status, token info, and network data

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();

  return Response.json({
    agent: {
      status: 'ONLINE',
      version: '0.1.0',
      uptime: 'active',
      lastActivity: now.toISOString(),
    },
    token: {
      symbol: 'RDX',
      name: 'Redacted Protocol',
      totalSupply: '1,000,000,000',
      decimals: 9,
      mintAddress: process.env.NEXT_PUBLIC_TOKEN_MINT || 'REPLACEME_TOKEN_MINT_ADDRESS',
      distribution: {
        communityAirdrop: { pct: 40, amount: '400,000,000', vesting: 'Immediate' },
        liquidityPool: { pct: 20, amount: '200,000,000', vesting: 'LP Burn' },
        stakingRewards: { pct: 15, amount: '150,000,000', vesting: '24 months' },
        teamVested: { pct: 15, amount: '150,000,000', vesting: '6mo cliff, 18mo vest' },
        treasuryDao: { pct: 10, amount: '100,000,000', vesting: 'DAO Vote' },
      },
    },
    staking: {
      apy: '50%',
      minStake: '10 RDX',
      lockPeriod: '7 days',
      feeShare: '70%',
    },
    network: {
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.devnet.solana.com',
      cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet',
    },
    features: {
      newsScanning: true,
      telegramBot: true,
      airdropRegistration: true,
      fragmentProcessing: true,
    },
    timestamp: now.toISOString(),
  });
}
