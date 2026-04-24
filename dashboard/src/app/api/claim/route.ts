import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import {
  getRdxMint,
  getDistributorKeypair,
  sendRdxToWallet,
} from '@/lib/solana-distributor'

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

const RDX_PER_SOL  = 1_400_000
const RDX_DECIMALS = 9

// Redis key helpers
const KEY_PRESALE_CONTRIB = (w: string) => `presale:contribution:${w}`
const KEY_BONDING_USER    = (w: string) => `bonding:user:${w}`
const KEY_CLAIM_DONE      = (w: string) => `claim:done:${w}`
const KEY_CLAIM_TX        = (w: string) => `claim:tx:${w}`

// ── GET /api/claim?wallet=xxx ──────────────────────────────────────────────
// Returns claimable amounts and whether the wallet has already claimed.
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet')
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 })
    }

    const [presaleContrib, bondingTokens, claimDone, claimTx] = await Promise.all([
      redis.get<number>(KEY_PRESALE_CONTRIB(wallet)),
      redis.get<number>(KEY_BONDING_USER(wallet)),
      redis.get<number>(KEY_CLAIM_DONE(wallet)),
      redis.get<string>(KEY_CLAIM_TX(wallet)),
    ])

    const presaleAllocation = Math.floor(Number(presaleContrib ?? 0) * RDX_PER_SOL)
    const bondingAllocation = Math.floor(Number(bondingTokens  ?? 0))
    const totalClaimable    = presaleAllocation + bondingAllocation
    const claimed           = Number(claimDone ?? 0) === 1

    return NextResponse.json({
      presaleAllocation,
      bondingAllocation,
      totalClaimable,
      claimed,
      ...(claimed && claimTx ? { claimTxSignature: claimTx } : {}),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST /api/claim ────────────────────────────────────────────────────────
// Executes the claim: calculates owed RDX, sends tokens, marks as claimed.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const wallet = body?.wallet as string | undefined
    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet field' }, { status: 400 })
    }

    // Distributor must be configured
    if (!getRdxMint()) {
      return NextResponse.json(
        { error: 'Token not deployed yet — RDX_TOKEN_MINT not configured' },
        { status: 503 },
      )
    }
    if (!getDistributorKeypair()) {
      return NextResponse.json(
        { error: 'Distributor not configured — DISTRIBUTOR_KEYPAIR not set' },
        { status: 503 },
      )
    }

    // Already claimed?
    const alreadyClaimed = await redis.get<number>(KEY_CLAIM_DONE(wallet))
    if (Number(alreadyClaimed ?? 0) === 1) {
      const claimTx = await redis.get<string>(KEY_CLAIM_TX(wallet))
      return NextResponse.json(
        { error: 'Already claimed', claimTxSignature: claimTx ?? undefined },
        { status: 409 },
      )
    }

    // Calculate total RDX owed
    const [presaleContrib, bondingTokens] = await Promise.all([
      redis.get<number>(KEY_PRESALE_CONTRIB(wallet)),
      redis.get<number>(KEY_BONDING_USER(wallet)),
    ])

    const presaleAllocation = Math.floor(Number(presaleContrib ?? 0) * RDX_PER_SOL)
    const bondingAllocation = Math.floor(Number(bondingTokens  ?? 0))
    const totalRdx          = presaleAllocation + bondingAllocation

    if (totalRdx <= 0) {
      return NextResponse.json(
        { error: 'No claimable allocation for this wallet' },
        { status: 400 },
      )
    }

    // Send tokens — raw units with 9 decimals
    const rawAmount = BigInt(totalRdx) * BigInt(10 ** RDX_DECIMALS)
    const txSignature = await sendRdxToWallet(wallet, rawAmount)

    // Mark as claimed in Redis
    const pipe = redis.pipeline()
    pipe.set(KEY_CLAIM_DONE(wallet), 1, { ex: 60 * 60 * 24 * 365 * 3 }) // 3 years
    pipe.set(KEY_CLAIM_TX(wallet),   txSignature, { ex: 60 * 60 * 24 * 365 * 3 })
    await pipe.exec()

    return NextResponse.json({
      ok: true,
      rdxClaimed: totalRdx,
      txSignature,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
