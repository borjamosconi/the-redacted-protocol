// GET /api/missions/:mint/claimable/:wallet
// Returns how many tokens this wallet has accrued (and not yet been paid) for
// completed-and-claimed missions on this token.
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

export async function GET(_req: NextRequest, { params }: { params: Promise<{ mint: string; wallet: string }> }) {
  try {
    const { mint, wallet } = await params
    const claimable = Number(await redis.get<number>(`rdx:missions:claimable:${mint}:${wallet}`) ?? 0)
    return NextResponse.json({ mint, wallet, claimable })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
