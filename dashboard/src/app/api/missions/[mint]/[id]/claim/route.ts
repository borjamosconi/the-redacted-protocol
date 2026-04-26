// POST /api/missions/:mint/:id/claim
// Body: { wallet }
// User claim — verifies mission status === 'completed' (manual verification
// for now: admin marks complete via the admin endpoint), then increments the
// claimable balance for that wallet. Balance is paid out after the missions
// reserve is funded on token graduation.
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

const KEY_LIST       = (m: string) => `rdx:missions:list:${m}`
const KEY_CLAIMABLE  = (m: string, w: string) => `rdx:missions:claimable:${m}:${w}`
const KEY_CLAIMED    = (m: string, w: string, id: string) => `rdx:missions:claimed:${m}:${w}:${id}`
const KEY_RESERVE    = (m: string) => `rdx:missions:reserve:${m}`

export async function POST(req: NextRequest, { params }: { params: Promise<{ mint: string; id: string }> }) {
  try {
    const { mint, id } = await params
    const { wallet } = await req.json().catch(() => ({}))
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

    // Idempotency — one claim per (mint, wallet, mission)
    if (await redis.get(KEY_CLAIMED(mint, wallet, id))) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    const raw = await redis.get<string | any[]>(KEY_LIST(mint))
    const missions = (typeof raw === 'string' ? JSON.parse(raw) : raw) ?? []
    const mission = missions.find((m: any) => m.id === id)
    if (!mission)                          return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
    if (mission.status !== 'completed')    return NextResponse.json({ error: 'Mission not completed yet' }, { status: 400 })

    const reserve = Number(await redis.get<number>(KEY_RESERVE(mint)) ?? 0)
    if (reserve < mission.reward_tokens) {
      return NextResponse.json({ error: 'Reserve depleted' }, { status: 400 })
    }

    const pipe = redis.pipeline()
    pipe.set(KEY_CLAIMED(mint, wallet, id), 1)
    pipe.incrbyfloat(KEY_CLAIMABLE(mint, wallet), mission.reward_tokens)
    pipe.incrbyfloat(KEY_RESERVE(mint), -mission.reward_tokens)
    await pipe.exec()

    return NextResponse.json({ ok: true, reward: mission.reward_tokens })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
