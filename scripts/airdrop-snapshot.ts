import { Redis } from '@upstash/redis'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
})

async function generateSnapshot() {
  console.log('📡 Fetching agents from Redacted Index...')
  
  const keys = await redis.smembers('users:index')
  console.log(`🔍 Found ${keys.length} registered agents.`)
  
  const snapshot: any[] = []
  const RDX_PER_XP = 0.5 // Conversion rate
  
  for (const key of keys) {
    const user: any = await redis.get(key)
    if (!user || user.flagged) continue
    
    // Calculate total reward: Base Airdrop (700) + XP Bonus
    // airdropAmount is stored in raw units (9 decimals)
    const rawReward = user.airdropAmount || 700_000_000_000
    
    snapshot.push({
      wallet: user.walletAddress,
      xp: user.xp,
      amountRaw: rawReward,
      amountFormatted: (rawReward / 1_000_000_000).toLocaleString(),
      level: user.level
    })
  }
  
  // Sort by reward
  snapshot.sort((a, b) => b.amountRaw - a.amountRaw)
  
  const outputPath = path.join(process.cwd(), 'airdrop-snapshot.json')
  fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2))
  
  console.log(`✅ Snapshot complete! Total agents: ${snapshot.length}`)
  console.log(`📄 Saved to: ${outputPath}`)
}

generateSnapshot().catch(console.error)
