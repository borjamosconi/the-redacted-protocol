// POST /api/tokens/[mint]/sell
//
// Off-chain bonding-curve SELL. The user's RDX is held virtually in Redis
// (we credit them on every BUY). A sell:
//   1. Subtracts `tokensIn` from their balance.
//   2. Computes the SOL refund using the inverse of the buy curve.
//   3. Decrements the curve's `tokensSold` so the price drops.
//   4. Records a pending payout in `rdx:payouts:<mint>` keyed by wallet.
//
// The actual SOL transfer from the treasury → seller is a manual batch
// the platform owner signs from their wallet (never a server keypair).
// Until that batch runs the seller has a "Claimable SOL" balance shown
// in the terminal UI. After graduation (Raydium pool live), sells route
// to the AMM and are instant on-chain.

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

const CURVE_SCALE   = 100_000_000
const MAX_SUPPLY_BC = 800_000_000
const BASE_PRICE    = 0.000000030
function priceAt(sold: number) { return BASE_PRICE * (1 + sold / CURVE_SCALE) }

// Inverse of tokensForSol — given tokens you want to dump, integrate
// price down the curve to compute SOL refund.
function solForTokens(tokensIn: number, currentSold: number): number {
  const STEPS = 100
  let sol  = 0
  let sold = currentSold
  for (let i = 0; i < STEPS; i++) {
    const burn  = tokensIn / STEPS
    const next  = sold - burn
    if (next < 0) break
    const price = priceAt(next)
    sol  += burn * price
    sold = next
  }
  return sol
}

const KEY_TOKEN   = (m: string) => `rdx:token:${m}`
const KEY_SOLD    = (m: string) => `rdx:bc:${m}:sold`
const KEY_SOL     = (m: string) => `rdx:bc:${m}:sol`
const KEY_USER    = (m: string, w: string) => `rdx:bc:${m}:user:${w}`
const KEY_TRADES  = (m: string) => `rdx:trades:${m}`
const KEY_PAYOUT  = (m: string, w: string) => `rdx:payouts:${m}:${w}`

export async function POST(req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const { wallet, tokensIn } = await req.json()
    if (!wallet || !tokensIn) {
      return NextResponse.json({ error: 'wallet and tokensIn required' }, { status: 400 })
    }
    const burn = Math.floor(Number(tokensIn))
    if (!isFinite(burn) || burn <= 0) {
      return NextResponse.json({ error: 'invalid tokensIn' }, { status: 400 })
    }

    const meta = await redis.hgetall(KEY_TOKEN(mint)) as any
    if (!meta?.mint) return NextResponse.json({ error: 'Token not found' }, { status: 404 })

    const userBalance = Number(await redis.get<number>(KEY_USER(mint, wallet)) ?? 0)
    if (userBalance < burn) {
      return NextResponse.json({ error: `insufficient balance: have ${Math.floor(userBalance)}, need ${burn}` }, { status: 400 })
    }

    const sold     = Number(await redis.get<number>(KEY_SOLD(mint)) ?? 0)
    const solBack  = solForTokens(burn, sold)
    if (solBack <= 0) {
      return NextResponse.json({ error: 'curve has no SOL to refund' }, { status: 400 })
    }

    const ts = Math.floor(Date.now() / 1000)
    const pipe = redis.pipeline()
    pipe.incrbyfloat(KEY_USER(mint, wallet), -burn)
    pipe.incrbyfloat(KEY_SOLD(mint), -burn)
    pipe.incrbyfloat(KEY_SOL(mint),  -solBack)
    // Record pending SOL payout for this wallet (batched out by treasury later).
    pipe.incrbyfloat(KEY_PAYOUT(mint, wallet), solBack)
    pipe.lpush(KEY_TRADES(mint), JSON.stringify({
      wallet:    wallet.slice(0, 6) + '...' + wallet.slice(-4),
      walletFull: wallet,
      side:      'sell',
      solAmount: solBack,
      tokensOut: burn,
      price:     solBack / burn,
      ts,
      txSignature: 'offchain-sell',
    }))
    pipe.ltrim(KEY_TRADES(mint), 0, 199)
    await pipe.exec()

    return NextResponse.json({
      ok:           true,
      tokensSold:   burn,
      solRefund:    solBack,
      pendingPayout: solBack,
      note:         'SOL payout is batched. Watch your wallet for the transfer from the treasury.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
