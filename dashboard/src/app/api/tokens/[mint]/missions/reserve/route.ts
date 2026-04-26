// GET /api/tokens/:mint/missions/reserve
// Reports how many tokens are still in the gamified-missions reserve for this
// token. Reserve is seeded when the token graduates (curve fills 100%) and
// decremented as users claim mission rewards.
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

export async function GET(_req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const reserve = Number(await redis.get<number>(`rdx:missions:reserve:${mint}`) ?? 0)
    const graduated = Boolean(await redis.get(`rdx:bc:${mint}:graduated`))
    return NextResponse.json({ mint, reserve, graduated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
