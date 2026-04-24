// POST /api/tokens/[mint]/trade
//
// The dashboard submits the txSignature of a successful on-chain buy/sell on
// rd-bondingcurve; this route forwards to the backend which pulls the confirmed
// transaction, parses the Trade event, persists the trade to Mongo, and
// upserts the OHLC candles. The backend is the single source of truth — this
// Next.js route is just a thin proxy so the browser doesn't talk to Mongo.
//
// The legacy Redis bonding-curve off-chain simulator has been removed — trades
// are now fully on-chain against the rd-bondingcurve program.

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000'

export async function POST(req: NextRequest, { params }: { params: Promise<{ mint: string }> }) {
  try {
    const { mint } = await params
    const body = await req.json()
    const { txSignature } = body || {}

    if (!txSignature) {
      return NextResponse.json({ error: 'txSignature is required' }, { status: 400 })
    }

    const res = await fetch(`${BACKEND_URL}/api/tokens/${mint}/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txSignature }),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
