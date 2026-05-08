/**
 * Redacted Protocol Airdrop Snapshot Tool
 * 
 * This script:
 * 1. Connects to Upstash Redis.
 * 2. Pulls the entire leaderboard (XP rankings).
 * 3. Calculates $RDX rewards for each user (1 XP = 0.5 RDX bonus).
 * 4. Saves a JSON snapshot for distribution.
 * 
 * Usage:
 *   ts-node scripts/airdrop-snapshot.ts
 */

import { Redis } from '@upstash/redis'
import * as fs from 'fs'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../../dashboard/.env.local') })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

const KEY_LEADERBOARD = 'rdx:leaderboard'
const KEY_USER        = (w: string) => `rdx:user:${w}`

;(async () => {
  console.log('🔍 Generating Airdrop Snapshot from Redis...')
  
  // 1. Get all users from leaderboard
  const usersRaw = await redis.zrange(KEY_LEADERBOARD, 0, -1, { rev: true, withScores: true })
  
  if (!usersRaw || usersRaw.length === 0) {
    console.error('❌ Leaderboard is empty. No users found.')
    process.exit(1)
  }

  console.log(`Found ${usersRaw.length / 2} eligible users.`)

  const snapshot: any[] = []
  let totalRdxToDistribute = BigInt(0)

  // 2. Fetch profiles and calculate rewards
  for (let i = 0; i < usersRaw.length; i += 2) {
    const wallet = usersRaw[i] as string
    const xp = usersRaw[i+1] as number
    
    const profile: any = await redis.hgetall(KEY_USER(wallet))
    
    // Base airdrop (e.g. 700 RDX) + Bonus (0.5 RDX per XP)
    const baseAmount = BigInt(700) * BigInt(10 ** 9)
    const bonusAmount = BigInt(Math.floor(xp * 0.5)) * BigInt(10 ** 9)
    const totalAmount = baseAmount + bonusAmount

    snapshot.push({
      wallet,
      xp,
      level: profile?.level || 'CLASSIFIED',
      referrals: profile?.referrals?.length || 0,
      rewardRdx: totalAmount.toString(), // as string for JSON
      rewardRdxHuman: (Number(totalAmount) / 10**9).toFixed(2)
    })

    totalRdxToDistribute += totalAmount
  }

  // 3. Save to file
  const output = {
    timestamp: new Date().toISOString(),
    totalUsers: snapshot.length,
    totalRdxRaw: totalRdxToDistribute.toString(),
    totalRdxHuman: (Number(totalRdxToDistribute) / 10**9).toFixed(2),
    users: snapshot
  }

  const filePath = path.join(__dirname, '../airdrop-snapshot.json')
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2))

  console.log('\n✅ Snapshot complete!')
  console.log(`Total RDX needed: ${output.totalRdxHuman} $RDX`)
  console.log(`Saved to: ${filePath}`)
  console.log('\nNext step: Use scripts/airdrop-distribute.ts to send the tokens.')

})().catch(console.error)
