// GET /api/missions/:mint            → list missions for a token
// POST /api/missions/:mint            → (alias for admin create — gated by ADMIN_WALLET)
//
// Mission shape:
//   { id, title, description, reward_tokens, type, verifier, status, createdAt }
// Storage:
//   rdx:missions:list:{mint}            → JSON-encoded array (simple, low traffic)
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

const KEY_LIST = (m: string) => `rdx:missions:list:${m}`

export type Mission = {
  id: string
  title: string
  description: string
  reward_tokens: number
  type: 'twitter_follow' | 'twitter_post' | 'discord_join' | 'referral' | 'manual'
  verifier: string
  status: 'open' | 'completed'
  createdAt: number
}

async function readMissions(mint: string): Promise<Mission[]> {
  const raw = await redis.get<string | Mission[]>(KEY_LIST(mint))
  if (!raw) return []
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return raw as Mission[]
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const missions = await readMissions(mint)
    return NextResponse.json({ mint, missions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
