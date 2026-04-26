// Admin endpoint — create / edit / mark-complete missions.
// Auth: caller must include wallet address that matches process.env.ADMIN_WALLET.
//   POST   /api/admin/missions/:mint              → create mission
//   PATCH  /api/admin/missions/:mint              → update mission (by id)
//   DELETE /api/admin/missions/:mint?id=…&wallet= → delete mission
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })
const KEY_LIST = (m: string) => `rdx:missions:list:${m}`

function authorized(wallet?: string) {
  const admin = process.env.ADMIN_WALLET
  return !!admin && !!wallet && wallet === admin
}

async function loadList(mint: string): Promise<any[]> {
  const raw = await redis.get<string | any[]>(KEY_LIST(mint))
  if (!raw) return []
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return raw as any[]
}

async function saveList(mint: string, list: any[]) {
  await redis.set(KEY_LIST(mint), JSON.stringify(list))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const body = await req.json()
    if (!authorized(body?.wallet)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const list = await loadList(mint)
    const mission = {
      id:            body.id || crypto.randomBytes(6).toString('hex'),
      title:         String(body.title || '').trim(),
      description:   String(body.description || '').trim(),
      reward_tokens: Math.max(0, Number(body.reward_tokens || 0)),
      type:          body.type || 'manual',
      verifier:      body.verifier || 'admin',
      status:        body.status === 'completed' ? 'completed' : 'open',
      createdAt:     Date.now(),
    }
    if (!mission.title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    list.push(mission)
    await saveList(mint, list)
    return NextResponse.json({ ok: true, mission })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const body = await req.json()
    if (!authorized(body?.wallet)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const list = await loadList(mint)
    const idx = list.findIndex(m => m.id === body.id)
    if (idx < 0) return NextResponse.json({ error: 'Mission not found' }, { status: 404 })

    list[idx] = {
      ...list[idx],
      ...(body.title         !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.description   !== undefined ? { description: String(body.description).trim() } : {}),
      ...(body.reward_tokens !== undefined ? { reward_tokens: Math.max(0, Number(body.reward_tokens)) } : {}),
      ...(body.type          !== undefined ? { type: body.type } : {}),
      ...(body.verifier      !== undefined ? { verifier: body.verifier } : {}),
      ...(body.status        !== undefined ? { status: body.status === 'completed' ? 'completed' : 'open' } : {}),
    }
    await saveList(mint, list)
    return NextResponse.json({ ok: true, mission: list[idx] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const wallet = req.nextUrl.searchParams.get('wallet') ?? ''
    const id     = req.nextUrl.searchParams.get('id')     ?? ''
    if (!authorized(wallet)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!id)                 return NextResponse.json({ error: 'id required' }, { status: 400 })

    const list = await loadList(mint)
    const next = list.filter(m => m.id !== id)
    await saveList(mint, next)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
