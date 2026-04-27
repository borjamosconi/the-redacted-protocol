/**
 * POST /api/launch-spl
 *
 * Spawns a brand-new SPL mint on Solana mainnet using the platform's
 * mint authority. Returns the real mint pubkey to the client, which can
 * then proceed to charge the user the launch fee and register the token
 * in our DB. The mint is real — it appears in Phantom, Solscan, etc.
 *
 * The mint authority pays the rent (~0.0014 SOL) + tx fee. The launch
 * fee that the user pays separately is the platform's revenue.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSplToken } from '@/lib/spl-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const decimals = Number(body?.decimals ?? 9)
    if (decimals < 0 || decimals > 9) {
      return NextResponse.json({ error: 'decimals must be 0..9' }, { status: 400 })
    }

    const { mint, signature } = await createSplToken({ decimals })
    return NextResponse.json({
      ok: true,
      mint,
      signature,
      decimals,
      explorer: `https://solscan.io/token/${mint}`,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? String(e), hint: 'Ensure MINT_AUTHORITY_KEYPAIR_BASE58 is set and the mint authority wallet has SOL for rent.' },
      { status: 500 },
    )
  }
}
