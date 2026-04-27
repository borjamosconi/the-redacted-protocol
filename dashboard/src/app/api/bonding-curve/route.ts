import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  verifyVaultPayment,
  getRdxMint,
  getDistributorKeypair,
  sendRdxToWallet,
} from '@/lib/solana-distributor'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

// ── Bonding curve config ────────────────────────────────────────────────────
// Price formula: P(sold) = BASE_PRICE * (1 + sold / CURVE_SCALE)
// This gives a linear curve: more tokens sold → higher price per token
const BASE_PRICE_SOL  = 0.000001          // starting price: 1 SOL = 1,000,000 RDX
const CURVE_SCALE     = 200_000_000       // curve steepness
const MAX_SUPPLY      = 200_000_000       // 200M RDX available on bonding curve (20%)
const VAULT           = 'CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8'
const RDX_DECIMALS    = 9

const KEY_SOLD  = 'bonding:tokensSold'
const KEY_SOL   = 'bonding:solRaised'
const KEY_COUNT = 'bonding:buyers'

function priceAtSupply(sold: number): number {
  return BASE_PRICE_SOL * (1 + sold / CURVE_SCALE)
}

// How many tokens for `solAmount` SOL starting at `currentSold`
// Numerical integration (100 steps)
function tokensForSol(solAmount: number, currentSold: number): number {
  const STEPS = 100
  const stepSol = solAmount / STEPS
  let tokens = 0
  let sold = currentSold
  for (let i = 0; i < STEPS; i++) {
    const price = priceAtSupply(sold)
    const bought = stepSol / price
    tokens += bought
    sold += bought
  }
  return Math.floor(tokens)
}

// Cost in SOL to buy `tokenAmount` tokens starting at `currentSold`
function solForTokens(tokenAmount: number, currentSold: number): number {
  const STEPS = 100
  const stepTokens = tokenAmount / STEPS
  let sol = 0
  let sold = currentSold
  for (let i = 0; i < STEPS; i++) {
    sol += priceAtSupply(sold) * stepTokens
    sold += stepTokens
  }
  return sol
}

// GET — current curve state + quote
export async function GET(req: NextRequest) {
  try {
    const solAmount   = parseFloat(req.nextUrl.searchParams.get('sol') ?? '0')
    const wallet      = req.nextUrl.searchParams.get('wallet') ?? ''
    const [sold, solR, buyers] = await Promise.all([
      redis.get<number>(KEY_SOLD),
      redis.get<number>(KEY_SOL),
      redis.get<number>(KEY_COUNT),
    ])
    const tokensSold = Number(sold  ?? 0)
    const solRaised  = Number(solR  ?? 0)
    const buyerCount = Number(buyers ?? 0)

    const currentPrice     = priceAtSupply(tokensSold)
    const rdxPerSol        = Math.floor(1 / currentPrice)
    const tokensRemaining  = MAX_SUPPLY - tokensSold
    const progress         = (tokensSold / MAX_SUPPLY) * 100

    let quote = { tokensOut: 0, avgPrice: currentPrice }
    if (solAmount > 0) {
      const tokensOut = Math.min(tokensForSol(solAmount, tokensSold), tokensRemaining)
      quote = { tokensOut, avgPrice: solAmount / Math.max(tokensOut, 1) }
    }

    let userTokens = 0
    if (wallet) {
      const u = await redis.get<number>(`bonding:user:${wallet}`)
      userTokens = Number(u ?? 0)
    }

    return NextResponse.json({
      tokensSold,
      solRaised,
      buyerCount,
      currentPrice,
      rdxPerSol,
      tokensRemaining,
      progress,
      maxSupply: MAX_SUPPLY,
      vault: VAULT,
      quote,
      userTokens,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — record confirmed buy and attempt RDX distribution
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

    // ── Idempotency ────────────────────────────────────────────────────────
    const txKey = `bonding:tx:${txSignature}`
    if (await redis.get(txKey)) return NextResponse.json({ ok: true, duplicate: true })

    const sold = Number(await redis.get<number>(KEY_SOLD) ?? 0)
    const tokensOut = Math.min(
      tokensForSol(amount, sold),
      MAX_SUPPLY - sold
    )
    if (tokensOut <= 0) return NextResponse.json({ error: 'Curve full' }, { status: 400 })

    const existing = await redis.get(`bonding:user:${wallet}`)

    const pipe = redis.pipeline()
    pipe.set(txKey, 1, { ex: 60 * 60 * 24 * 365 })
    pipe.incrbyfloat(KEY_SOLD, tokensOut)
    pipe.incrbyfloat(KEY_SOL, amount)
    pipe.incrbyfloat(`bonding:user:${wallet}`, tokensOut)
    if (!existing) pipe.incr(KEY_COUNT)
    await pipe.exec()

    // ── RDX Distribution ───────────────────────────────────────────────────
    const tokensOutFloor = Math.floor(tokensOut)
    let rdxSent            = false
    let rdxTxSignature: string | undefined

    if (getRdxMint() && getDistributorKeypair()) {
      try {
        // tokensOut * 10^9 = raw units with decimals
        const rawAmount = BigInt(tokensOutFloor) * BigInt(10 ** RDX_DECIMALS)
        rdxTxSignature = await sendRdxToWallet(wallet, rawAmount)
        rdxSent = true
      } catch (distErr) {
        // Non-fatal: allocation recorded in Redis for later claim
        console.error('[bonding-curve/POST] RDX distribution failed:', distErr)
      }
    }

    return NextResponse.json({
      ok: true,
      tokensOut: tokensOutFloor,
      rdxSent,
      ...(rdxTxSignature ? { rdxTxSignature } : {}),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
