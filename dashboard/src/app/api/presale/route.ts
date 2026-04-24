import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  verifyVaultPayment,
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
const KEY_TOTAL    = 'presale:totalRaised'
const KEY_COUNT    = 'presale:participants'
const KEY_CONTRIB  = (w: string) => `presale:contribution:${w}`
const KEY_TXS      = (w: string) => `presale:txs:${w}`

// GET — return global stats + optionally user stats
export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet')
    const [total, count] = await Promise.all([
      redis.get<number>(KEY_TOTAL),
      redis.get<number>(KEY_COUNT),
    ])
    const totalRaised   = Number(total  ?? 0)
    const participants  = Number(count  ?? 0)

    let userContribution = 0
    let userAllocation   = 0
    if (wallet) {
      const c = await redis.get<number>(KEY_CONTRIB(wallet))
      userContribution = Number(c ?? 0)
      userAllocation   = Math.floor(userContribution * RDX_PER_SOL)
    }

    return NextResponse.json({ totalRaised, participants, userContribution, userAllocation })
  } catch {
    return NextResponse.json({ totalRaised: 0, participants: 0, userContribution: 0, userAllocation: 0 })
  }
}

// POST — record a confirmed contribution and attempt RDX distribution
export async function POST(req: NextRequest) {
  try {
    const { wallet, solAmount, txSignature } = await req.json()
    if (!wallet || !solAmount || !txSignature) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const amount = parseFloat(solAmount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // ── On-chain payment verification ──────────────────────────────────────
    const expectedLamports = Math.floor(amount * LAMPORTS_PER_SOL)
    const paymentValid = await verifyVaultPayment(txSignature, wallet, expectedLamports)
    if (!paymentValid) {
      return NextResponse.json(
        { error: 'Payment verification failed — transaction not found, unconfirmed, or vault not credited' },
        { status: 400 },
      )
    }

    // ── Idempotency: skip if tx already recorded ───────────────────────────
    const txKey = `presale:tx:${txSignature}`
    const exists = await redis.get(txKey)
    if (exists) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    // Read existing contribution BEFORE pipeline (for participant count logic)
    const existing = await redis.get<number>(KEY_CONTRIB(wallet))

    const pipe = redis.pipeline()
    pipe.set(txKey, 1, { ex: 60 * 60 * 24 * 365 }) // keep 1 year
    pipe.incrbyfloat(KEY_TOTAL, amount)
    pipe.incrbyfloat(KEY_CONTRIB(wallet), amount)
    if (!existing || Number(existing) === 0) {
      pipe.incr(KEY_COUNT)
    }
    pipe.lpush(KEY_TXS(wallet), JSON.stringify({ txSignature, solAmount: amount, ts: Date.now() }))
    await pipe.exec()

    // ── RDX Distribution ───────────────────────────────────────────────────
    const tokensAllocated = Math.floor(amount * RDX_PER_SOL)
    let rdxSent            = false
    let rdxTxSignature: string | undefined

    if (getRdxMint() && getDistributorKeypair()) {
      try {
        // Convert to raw units (9 decimals)
        const rawAmount = BigInt(tokensAllocated) * BigInt(10 ** RDX_DECIMALS)
        rdxTxSignature = await sendRdxToWallet(wallet, rawAmount)
        rdxSent = true
      } catch (distErr) {
        // Non-fatal: allocation is already recorded for manual/claim distribution
        console.error('[presale/POST] RDX distribution failed:', distErr)
      }
    }

    return NextResponse.json({
      ok: true,
      tokensAllocated,
      rdxSent,
      ...(rdxTxSignature ? { rdxTxSignature } : {}),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
