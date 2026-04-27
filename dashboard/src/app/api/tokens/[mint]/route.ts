import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

const KEY_TOKEN     = (m: string) => `rdx:token:${m}`
const KEY_SOLD      = (m: string) => `rdx:bc:${m}:sold`
const KEY_SOL       = (m: string) => `rdx:bc:${m}:sol`
const KEY_BUYERS    = (m: string) => `rdx:bc:${m}:buyers`
const KEY_USER      = (m: string, w: string) => `rdx:bc:${m}:user:${w}`
const KEY_TRADES    = (m: string) => `rdx:trades:${m}`
const KEY_GRADUATED = (m: string) => `rdx:bc:${m}:graduated`
const KEY_MISSION_RESERVE = (m: string) => `rdx:missions:reserve:${m}`

const CURVE_SCALE        = 100_000_000
const MAX_SUPPLY_BC      = 800_000_000
const BASE_PRICE         = 0.000000030
// % of curve supply set aside for gamified missions when token graduates.
const MISSION_RESERVE_PCT = 0.05

function priceAt(sold: number) { return BASE_PRICE * (1 + sold / CURVE_SCALE) }

// Idempotently mark a token as graduated and seed its mission reserve. Called
// from the GET handler whenever curve fill ≥ 100%, so any read after the final
// trade triggers the side-effect once.
async function ensureGraduated(mint: string, tokensSold: number) {
  if (tokensSold < MAX_SUPPLY_BC) return false
  const already = await redis.get(KEY_GRADUATED(mint))
  if (already) return true
  const reserve = MAX_SUPPLY_BC * MISSION_RESERVE_PCT
  const pipe = redis.pipeline()
  pipe.set(KEY_GRADUATED(mint), 1)
  pipe.set(KEY_MISSION_RESERVE(mint), reserve)
  await pipe.exec()
  return true
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const wallet = req.nextUrl.searchParams.get('wallet') ?? ''

    let [meta, sold, solR, buyers] = await Promise.all([
      redis.hgetall(KEY_TOKEN(mint)),
      redis.get<number>(KEY_SOLD(mint)),
      redis.get<number>(KEY_SOL(mint)),
      redis.get<number>(KEY_BUYERS(mint)),
    ])

    // Backfill: if Redis doesn't have the token (e.g. mirror POST failed at
    // launch time), pull it from the Mongo backend and lazily seed Redis.
    if (!meta || !(meta as any).mint) {
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://api.redacted.bond'
      try {
        const r = await fetch(`${backend}/api/tokens/${mint}`, { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json()
          const t = j?.token
          if (t?.mint) {
            const seed = {
              mint:              t.mint,
              name:              t.name ?? '',
              symbol:            t.symbol ?? '',
              description:       t.description ?? '',
              logo:              t.logo ?? '',
              creator:           t.creator ?? '',
              twitterUrl:        t.twitterUrl ?? '',
              websiteUrl:        t.websiteUrl ?? '',
              launchTxSignature: t.launchTxSignature ?? '',
              createdAt:         new Date(t.createdAt ?? Date.now()).getTime(),
            }
            await redis.hset(KEY_TOKEN(mint), seed)
            meta = seed as any
          }
        }
      } catch { /* fallthrough to 404 */ }

      if (!meta || !(meta as any).mint) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 })
      }
    }

    const tokensSold    = Number(sold ?? 0)
    const solRaised     = Number(solR ?? 0)
    const buyerCount    = Number(buyers ?? 0)
    const currentPrice  = priceAt(tokensSold)
    const progress      = (tokensSold / MAX_SUPPLY_BC) * 100
    const tokensRemaining = MAX_SUPPLY_BC - tokensSold

    // Quote for the requested SOL amount
    const solAmount = parseFloat(req.nextUrl.searchParams.get('sol') ?? '0')
    let quote = { tokensOut: 0, avgPrice: currentPrice }
    if (solAmount > 0) {
      // Numerical integration
      const STEPS = 100
      let tokens = 0; let s = tokensSold
      for (let i = 0; i < STEPS; i++) {
        const p = priceAt(s); const b = (solAmount / STEPS) / p
        tokens += b; s += b
      }
      const tokensOut = Math.floor(Math.min(tokens, tokensRemaining))
      quote = { tokensOut, avgPrice: solAmount / Math.max(tokensOut, 1) }
    }

    // User holdings
    let userTokens = 0
    if (wallet) {
      const u = await redis.get<number>(KEY_USER(mint, wallet))
      userTokens = Number(u ?? 0)
    }

    // Recent trades
    const rawTrades = await redis.lrange(KEY_TRADES(mint), 0, 49)
    const trades = rawTrades.map(t => typeof t === 'string' ? JSON.parse(t) : t).reverse()

    // Graduation side-effect (idempotent) — once curve fills, set graduated
    // flag and seed missions reserve.
    const graduated = await ensureGraduated(mint, tokensSold)

    return NextResponse.json({
      ...(meta as any),
      tokensSold,
      solRaised,
      buyerCount,
      currentPrice,
      rdxPerSol: Math.floor(1 / currentPrice),
      progress,
      tokensRemaining,
      maxSupplyCurve: MAX_SUPPLY_BC,
      quote,
      userTokens,
      trades,
      graduated,
      missionReservePct: MISSION_RESERVE_PCT,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
