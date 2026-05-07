import { NextRequest, NextResponse } from 'next/server'
import * as db from '@/lib/db'
import { sendRdxToWallet, getRdxMint, getDistributorKeypair } from '@/lib/solana-distributor'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json()

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // 1. Fetch user profile
    const user = await db.getUser(walletAddress)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.flagged) {
      return NextResponse.json({ error: 'Account flagged' }, { status: 403 })
    }

    // 2. Calculate unclaimed amount
    const totalAllocation = user.airdropAmount || 0
    const alreadyClaimed = user.claimedAirdropAmount || 0
    const unclaimedRaw = totalAllocation - alreadyClaimed

    if (unclaimedRaw <= 0) {
      return NextResponse.json({ 
        error: 'No rewards to claim', 
        message: 'You have already claimed all your $RDX allocations.' 
      }, { status: 400 })
    }

    // 3. Verify distributor configuration
    if (!getRdxMint() || !getDistributorKeypair()) {
      return NextResponse.json({ 
        error: 'Distributor not ready', 
        message: 'The on-chain distribution system is currently offline. Your allocation is safe and can be claimed later.' 
      }, { status: 503 })
    }

    // 4. Trigger token transfer
    // unclaimedRaw is already in units with 9 decimals (e.g. 700,000,000,000 for 700 RDX)
    let txSignature: string
    try {
      txSignature = await sendRdxToWallet(walletAddress, BigInt(unclaimedRaw))
    } catch (err: any) {
      console.error('[AirdropClaim] Transfer failed:', err)
      return NextResponse.json({ 
        error: 'Transfer failed', 
        message: err.message || 'Blockchain transaction failed. Please try again later.' 
      }, { status: 500 })
    }

    // 5. Update user profile
    user.claimedAirdropAmount = totalAllocation
    await db.saveUser(user)

    return NextResponse.json({
      ok: true,
      amountClaimed: unclaimedRaw / 1_000_000_000,
      txSignature,
      message: `Successfully claimed ${(unclaimedRaw / 1_000_000_000).toLocaleString()} $RDX`
    })

  } catch (e: any) {
    console.error('[AirdropClaim] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
