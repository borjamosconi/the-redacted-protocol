import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

export interface TokenMeta {
  mint:        string
  name:        string
  symbol:      string
  description: string
  logo:        string   // URL or base64
  creator:     string   // wallet
  createdAt:   number
  twitterUrl?: string
  websiteUrl?: string
  totalSupply: number   // raw (with decimals)
  decimals:    number
  maxSupplyCurve: number // how many tokens on the bonding curve
  launchFee:   number   // SOL paid to launch (for display)
}

const KEY_INDEX   = 'rdx:tokens'                                     // zset score=createdAt
const KEY_TOKEN   = (m: string) => `rdx:token:${m}`
const KEY_SOLD    = (m: string) => `rdx:bc:${m}:sold`
const KEY_SOL     = (m: string) => `rdx:bc:${m}:sol`
const KEY_BUYERS  = (m: string) => `rdx:bc:${m}:buyers`

// Bonding curve config (same formula as RDX, per-token)
const CURVE_SCALE   = 100_000_000
const MAX_SUPPLY_BC = 800_000_000   // 800M tokens on curve
const BASE_PRICE    = 0.000000030   // ~30 SOL fills the curve

function priceAt(sold: number) { return BASE_PRICE * (1 + sold / CURVE_SCALE) }
function marketCap(sold: number, rdxPriceSol: number) { return sold * priceAt(sold) * rdxPriceSol }

// GET /api/tokens — list all tokens, sorted by newest or marketcap
export async function GET(req: NextRequest) {
  try {
    const sort   = req.nextUrl.searchParams.get('sort') ?? 'new'
    const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50'), 100)
    const search = (req.nextUrl.searchParams.get('q') ?? '').toLowerCase()

    // Get all mint addresses
    let mints: string[] = await redis.zrange(KEY_INDEX, 0, -1, { rev: true })

    // Backfill: if Redis index is empty (e.g. fresh deploy or mirror failed),
    // pull whatever the Mongo backend has and lazily seed Redis. This means
    // tokens launched while Redis was misconfigured still show up.
    if (!mints.length) {
      try {
        const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://api.redacted.bond'
        const r = await fetch(`${backend}/api/tokens?limit=100`, { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json()
          const items: any[] = j?.items ?? []
          if (items.length) {
            const pipe = redis.pipeline()
            for (const t of items) {
              if (!t?.mint) continue
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
                totalSupply:       1_000_000_000,
                decimals:          9,
                maxSupplyCurve:    MAX_SUPPLY_BC,
                launchFee:         0.02,
              }
              pipe.hset(KEY_TOKEN(t.mint), seed as any)
              pipe.zadd(KEY_INDEX, { score: seed.createdAt, member: t.mint })
            }
            await pipe.exec()
            mints = await redis.zrange(KEY_INDEX, 0, -1, { rev: true }) as string[]
          }
        }
      } catch { /* ignore — return [] */ }
    }

    if (!mints.length) return NextResponse.json({ tokens: [] })

    // Fetch metadata + curve state in parallel
    const entries = await Promise.all(
      mints.map(async mint => {
        const [meta, sold, solRaised, buyers] = await Promise.all([
          redis.hgetall(KEY_TOKEN(mint)) as Promise<TokenMeta | null>,
          redis.get<number>(KEY_SOLD(mint)),
          redis.get<number>(KEY_SOL(mint)),
          redis.get<number>(KEY_BUYERS(mint)),
        ])
        if (!meta) return null
        const tokensSold = Number(sold ?? 0)
        const totalSol   = Number(solRaised ?? 0)
        const buyerCount = Number(buyers ?? 0)
        const currentPrice = priceAt(tokensSold)
        const progress = (tokensSold / MAX_SUPPLY_BC) * 100
        return {
          ...meta,
          tokensSold,
          solRaised: totalSol,
          buyerCount,
          currentPrice,
          rdxPerSol: Math.floor(1 / currentPrice),
          progress,
          tokensRemaining: MAX_SUPPLY_BC - tokensSold,
        }
      })
    )

    let tokens = entries.filter(Boolean) as any[]

    // Search filter
    if (search) {
      tokens = tokens.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.symbol.toLowerCase().includes(search) ||
        t.creator.toLowerCase().includes(search)
      )
    }

    // Sort
    if (sort === 'marketcap') tokens.sort((a, b) => b.solRaised - a.solRaised)
    else if (sort === 'hot')  tokens.sort((a, b) => b.buyerCount - a.buyerCount)
    else                      tokens.sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({ tokens: tokens.slice(0, limit) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/tokens — register a new token after on-chain deployment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<TokenMeta> & { launchTxSignature?: string }
    const { mint, name, symbol, description, logo, creator, twitterUrl, websiteUrl, launchTxSignature } = body

    if (!mint || !name || !symbol || !creator) {
      return NextResponse.json({ error: 'mint, name, symbol, creator required' }, { status: 400 })
    }

    // Prevent duplicate registration
    const existing = await redis.hgetall(KEY_TOKEN(mint))
    if (existing && (existing as any).mint) {
      return NextResponse.json({ ok: true, duplicate: true, mint })
    }

    const meta: TokenMeta & { mode?: string } = {
      mint,
      name:           name.trim(),
      symbol:         symbol.trim().toUpperCase(),
      description:    (description ?? '').trim(),
      logo:           logo ?? '',
      creator,
      createdAt:      Date.now(),
      twitterUrl:     twitterUrl ?? '',
      websiteUrl:     websiteUrl ?? '',
      totalSupply:    1_000_000_000,
      decimals:       9,
      maxSupplyCurve: MAX_SUPPLY_BC,
      launchFee:      0.02,
      mode:           body.mode || 'offchain',
    }

    const pipe = redis.pipeline()
    // Store metadata as hash
    pipe.hset(KEY_TOKEN(mint), meta as any)
    // Add to index (sorted by creation time)
    pipe.zadd(KEY_INDEX, { score: meta.createdAt, member: mint })
    // Init curve state
    pipe.set(KEY_SOLD(mint), 0)
    pipe.set(KEY_SOL(mint), 0)
    pipe.set(KEY_BUYERS(mint), 0)
    await pipe.exec()

    // ── Notify Telegram ──
    const tgToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId  = process.env.TELEGRAM_CHAT_ID
    if (tgToken && chatId) {
      const msg = `\u{1F6A8} *NEW DECLASSIFICATION DETECTED* \u{1F6A8}\n\n` +
                  `DOCUMENT: \`${meta.name.toUpperCase()}\`\n` +
                  `TICKER: \`$${meta.symbol.toUpperCase()}\`\n\n` +
                  `\u{1F513} *UNCOVER THE TRUTH AT:*\n` +
                  `https://redacted.bond/terminal/${mint}\n\n` +
                  `_The file is breathing\\._`

      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: 'Markdown',
        }),
      }).catch(err => console.error('[API/Tokens] Telegram notification failed:', err))
    }

    return NextResponse.json({ ok: true, mint, token: meta })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
