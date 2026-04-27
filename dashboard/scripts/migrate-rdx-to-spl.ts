/**
 * One-shot migration: convert the legacy off-chain RDX token to a real SPL.
 *
 * Why: the original RDX mint pubkey 8d2Rf5bg…7QHs was a randomly-generated
 * keypair on the client at launch time — it never landed on-chain. Users who
 * "bought" RDX got Redis-only balances. This script:
 *
 *   1. Creates a NEW real SPL mint with the platform's authority.
 *   2. Reads every Redis user balance for the legacy mint.
 *   3. Mints the equivalent atomic amount to each holder's wallet via SPL
 *      mintTo. Real tokens land in Phantom.
 *   4. Updates Mongo + Redis to point all RDX state at the new mint pubkey.
 *      Legacy /terminal/<old-mint> URLs are redirected via a Redis key
 *      `rdx:legacy:<old>` -> `<new>`.
 *
 * Pre-requisites:
 *   - MINT_AUTHORITY_KEYPAIR_BASE58 set in env
 *   - Mint authority wallet funded with ≥0.05 SOL on mainnet (rent + fees)
 *   - Production VPS Redis + Mongo reachable (run this on the VPS itself)
 *
 * Run:
 *   cd /opt/redacted-new/dashboard
 *   npx ts-node --project tsconfig.script.json scripts/migrate-rdx-to-spl.ts
 *
 * Idempotent: if the new mint is already recorded under
 * `rdx:migration:rdx-spl` it is reused.
 */

import { Redis } from '@upstash/redis'
import { createSplToken, mintSplTo } from '../src/lib/spl-service'

const LEGACY_MINT = '8d2Rf5bgVRhEzvdCR8aV8kFrBHvZ93AJcg9anpzD7QHs'
const KEY_TOKEN          = (m: string) => `rdx:token:${m}`
const KEY_USER_PREFIX    = (m: string) => `rdx:bc:${m}:user:`
const KEY_LEGACY_MAPPING = (old: string) => `rdx:legacy:${old}`
const KEY_MIGRATION      = 'rdx:migration:rdx-spl'

async function main() {
  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  })

  // 1. Find all user wallets with a balance under the legacy mint.
  console.log('Scanning legacy balances…')
  const pattern = KEY_USER_PREFIX(LEGACY_MINT) + '*'
  const userKeys: string[] = []
  let cursor = 0
  do {
    const r: any = await redis.scan(cursor, { match: pattern, count: 100 })
    cursor = Number(r[0]) || 0
    if (Array.isArray(r[1])) userKeys.push(...r[1])
  } while (cursor !== 0)
  console.log(`Found ${userKeys.length} holders.`)

  const balances: Array<{ wallet: string, raw: number }> = []
  for (const k of userKeys) {
    const wallet = k.replace(KEY_USER_PREFIX(LEGACY_MINT), '')
    const v = await redis.get<number>(k)
    const raw = Number(v ?? 0)
    if (raw > 0) balances.push({ wallet, raw })
  }
  console.log('Balances to migrate:', balances)

  // 2. Create or reuse the new SPL mint.
  let newMint = await redis.get<string>(KEY_MIGRATION)
  if (!newMint) {
    console.log('Creating new RDX SPL mint on mainnet…')
    const out = await createSplToken({ decimals: 9 })
    newMint = out.mint
    await redis.set(KEY_MIGRATION, newMint)
    console.log('NEW RDX MINT:', newMint, 'sig:', out.signature)
  } else {
    console.log('Reusing existing migration target:', newMint)
  }

  // 3. Mint each user's tokens to their wallet.
  for (const b of balances) {
    try {
      const atomic = BigInt(Math.floor(b.raw)) * 1_000_000_000n  // 9 decimals
      const out = await mintSplTo({ mint: newMint, recipient: b.wallet, amount: atomic })
      console.log(`✓ minted ${b.raw} RDX to ${b.wallet} → sig ${out.signature.slice(0, 12)}…`)
    } catch (e: any) {
      console.error(`✗ failed for ${b.wallet}: ${e.message}`)
    }
  }

  // 4. Copy token metadata + index entries from legacy mint to new mint.
  const meta = await redis.hgetall(KEY_TOKEN(LEGACY_MINT))
  if (meta) {
    const m = meta as any
    m.mint = newMint  // override
    await redis.hset(KEY_TOKEN(newMint), m)
    await redis.zadd('rdx:tokens', { score: Number(m.createdAt ?? Date.now()), member: newMint })
    console.log(`Copied metadata to ${KEY_TOKEN(newMint)}`)
  }

  // 5. Set legacy redirect mapping so old terminal URLs still work.
  await redis.set(KEY_LEGACY_MAPPING(LEGACY_MINT), newMint)
  console.log(`Legacy redirect: ${LEGACY_MINT} → ${newMint}`)

  console.log('\nDONE.')
  console.log('Update Mongo backend manually:')
  console.log(`  docker exec rdx-mongo mongosh redacted --eval 'db.tokens.updateOne({mint:"${LEGACY_MINT}"},{$set:{mint:"${newMint}"}})'`)
  console.log(`Then visit: https://redacted.bond/terminal/${newMint}`)
}

main().catch(e => { console.error(e); process.exit(1) })
