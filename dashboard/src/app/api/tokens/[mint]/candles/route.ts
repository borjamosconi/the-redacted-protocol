import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

const VALID_INTERVALS = ['1m', '5m', '15m', '1h', '4h'] as const
type CandleInterval = typeof VALID_INTERVALS[number]

const KEY_CANDLES = (m: string, i: string) => `rdx:candles:${m}:${i}`

export async function GET(req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const interval = (req.nextUrl.searchParams.get('interval') ?? '5m') as CandleInterval
    const limit    = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '500'), 1000)

    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json({ error: `interval must be one of ${VALID_INTERVALS.join(', ')}` }, { status: 400 })
    }

    const raw = await redis.lrange(KEY_CANDLES(mint, interval), -limit, -1)
    const candles = raw
      .map(c => typeof c === 'string' ? JSON.parse(c) : c)
      .filter(Boolean)
      .sort((a: any, b: any) => a.time - b.time)

    return NextResponse.json({ candles, interval, count: candles.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
