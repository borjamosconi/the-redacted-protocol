// POST /api/tokens/[mint]/trade
//
// Off-chain bonding-curve simulator. The user signed a SOL transfer to the
// treasury wallet on-chain; this endpoint takes the resulting txSignature,
// computes how many "tokens" they bought via the constant-product curve,
// and persists balances + trade history in Redis. There is no SPL mint —
// the curve lives entirely in our DB until the token graduates and we
// migrate to a real Raydium pool with an actual SPL mint.
//
// Idempotent on `txSignature` so a retry from the client never double-credits.

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { mintSplTo } from '@/lib/spl-service'

export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

// ── Bonding curve config (same as /api/tokens/[mint]/route.ts) ─────────────
const CURVE_SCALE   = 100_000_000
const MAX_SUPPLY_BC = 800_000_000        // 800M tokens on the curve
const BASE_PRICE    = 0.000000030        // 0.00000003 SOL per token at sold=0

function priceAt(sold: number) { return BASE_PRICE * (1 + sold / CURVE_SCALE) }

function tokensForSol(solAmount: number, currentSold: number): number {
  // Numerical integration over a fine grid — matches the math in the GET
  // route and the LaunchpadPanel quote.
  const STEPS = 100
  let tokens = 0
  let sold   = currentSold
  for (let i = 0; i < STEPS; i++) {
    const price  = priceAt(sold)
    const bought = (solAmount / STEPS) / price
    tokens += bought
    sold   += bought
  }
  return Math.floor(tokens)
}

// ── Redis keys ─────────────────────────────────────────────────────────────
const KEY_TOKEN     = (m: string) => `rdx:token:${m}`
const KEY_SOLD      = (m: string) => `rdx:bc:${m}:sold`
const KEY_SOL       = (m: string) => `rdx:bc:${m}:sol`
const KEY_BUYERS    = (m: string) => `rdx:bc:${m}:buyers`
const KEY_USER      = (m: string, w: string) => `rdx:bc:${m}:user:${w}`
const KEY_TRADES    = (m: string) => `rdx:trades:${m}`
const KEY_CANDLES   = (m: string, iv: string) => `rdx:candles:${m}:${iv}`
const KEY_TX        = (sig: string) => `rdx:tx:${sig}`

// ── Candle helpers ─────────────────────────────────────────────────────────
const INTERVAL_SECS: Record<string, number> = {
  '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400,
}

function candleBucket(ts: number, interval: string): number {
  const s = INTERVAL_SECS[interval] ?? 60
  return Math.floor(ts / s) * s
}

async function upsertCandle(
  mint:       string,
  interval:   string,
  tradePrice: number,
  volumeSol:  number,
  ts:         number,
) {
  const bucket    = candleBucket(ts, interval)
  const candleKey = KEY_CANDLES(mint, interval)
  // Read the last candle. If its `time` matches the current bucket, update
  // it in-place; otherwise push a new candle.
  const raw  = await redis.lindex(candleKey, -1)
  const last = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as any : null
  if (last && last.time === bucket) {
    last.high   = Math.max(last.high, tradePrice)
    last.low    = Math.min(last.low, tradePrice)
    last.close  = tradePrice
    last.volume = (last.volume ?? 0) + volumeSol
    await redis.lset(candleKey, -1, JSON.stringify(last))
  } else {
    const candle = {
      time:   bucket,
      open:   tradePrice,
      high:   tradePrice,
      low:    tradePrice,
      close:  tradePrice,
      volume: volumeSol,
    }
    await redis.rpush(candleKey, JSON.stringify(candle))
    await redis.ltrim(candleKey, -2000, -1)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const { wallet, solAmount, txSignature, side = 'buy' } = await req.json()

    if (!wallet || !solAmount || !txSignature) {
      return NextResponse.json(
        { error: 'wallet, solAmount and txSignature are required' },
        { status: 400 },
      )
    }

    // Idempotency: same signature → same result, never double-credit.
    const txKey = KEY_TX(txSignature)
    if (await redis.get(txKey)) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    // Make sure the token actually exists in our index. The terminal /api/tokens
    // GET will lazily backfill from Mongo if missing, but a direct trade
    // shouldn't run against a phantom mint.
    const meta = await redis.hgetall(KEY_TOKEN(mint)) as any
    if (!meta?.mint) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    const amount = parseFloat(solAmount)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'invalid solAmount' }, { status: 400 })
    }

    // Compute how many tokens the bonding curve gives at the current sold level.
    const soldRaw   = await redis.get<number>(KEY_SOLD(mint))
    const sold      = Number(soldRaw ?? 0)
    const remaining = MAX_SUPPLY_BC - sold
    if (remaining <= 0) {
      return NextResponse.json({ error: 'curve is full — graduation pending' }, { status: 400 })
    }
    const tokensOut  = Math.min(tokensForSol(amount, sold), remaining)
    const tradePrice = amount / tokensOut
    const ts         = Math.floor(Date.now() / 1000)

    // ── Atomic Redis update ────────────────────────────────────────────────
    const pipe = redis.pipeline()
    // Mark txSignature consumed for 1 year so retries are rejected.
    pipe.set(txKey, 1, { ex: 60 * 60 * 24 * 365 })
    // Update curve totals.
    pipe.incrbyfloat(KEY_SOLD(mint), tokensOut)
    pipe.incrbyfloat(KEY_SOL(mint), amount)
    // Credit the user's wallet.
    pipe.incrbyfloat(KEY_USER(mint, wallet), tokensOut)

    // Increment unique-buyer count on first purchase by this wallet.
    const existing = await redis.get(KEY_USER(mint, wallet))
    if (!existing) pipe.incr(KEY_BUYERS(mint))

    // Append trade to the per-token feed (cap at 200 entries).
    const trade = {
      wallet:      wallet.slice(0, 6) + '...' + wallet.slice(-4),
      walletFull:  wallet,
      side,
      solAmount:   amount,
      tokensOut:   Math.floor(tokensOut),
      price:       tradePrice,
      ts,
      txSignature: txSignature.slice(0, 12) + '...',
    }
    pipe.lpush(KEY_TRADES(mint), JSON.stringify(trade))
    pipe.ltrim(KEY_TRADES(mint), 0, 199)

    await pipe.exec()

    // ── Update OHLC candles in every interval (outside pipeline because it
    //    needs the previous candle's value) ──────────────────────────────
    await Promise.all([
      upsertCandle(mint, '1m',  tradePrice, amount, ts),
      upsertCandle(mint, '5m',  tradePrice, amount, ts),
      upsertCandle(mint, '15m', tradePrice, amount, ts),
      upsertCandle(mint, '1h',  tradePrice, amount, ts),
      upsertCandle(mint, '4h',  tradePrice, amount, ts),
    ])

    // ── Mint REAL SPL tokens to the buyer's wallet ─────────────────────────
    // If the mint exists on-chain and we control its mint authority, send
    // tokensOut * 10^9 atomic units to the buyer. Failure is non-fatal:
    // legacy off-chain mints (random pubkeys generated client-side before
    // /api/launch-spl existed) won't have us as authority and will fail —
    // those balances stay tracked off-chain in Redis until migration.
    let mintSig: string | undefined
    let mintError: string | undefined
    try {
      const out = await mintSplTo({
        mint,
        recipient: wallet,
        amount:    BigInt(Math.floor(tokensOut)) * 1_000_000_000n,  // 9 decimals
      })
      mintSig = out.signature
    } catch (e: any) {
      mintError = e.message
    }

    return NextResponse.json({
      ok:        true,
      tokensOut: Math.floor(tokensOut),
      price:     tradePrice,
      solAmount: amount,
      mintSig,           // signature of the real SPL mintTo, if it ran
      mintError,         // populated for legacy off-chain mints we don't control
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
