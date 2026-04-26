/**
 * Create a Raydium AMM v4 pool for RDX/SOL with the SOL freed by `launch`.
 *
 * Flow:
 *   1. Build (or look up) an OpenBook v2 market for RDX/SOL.
 *   2. Call Raydium AMM v4 `initialize2` to create the pool with:
 *      - 85 SOL  (from liquidity_recipient wallet, fed by `launch()`)
 *      - 200 M RDX (from team's RDX ATA — must be transferred in beforehand)
 *   3. Receive LP tokens in liquidity_recipient's ATA.
 *
 * AFTER this script: run lock-lp.ts to permanently lock the LP tokens via
 * rd-bondingcurve::graduate_step2_lock_lp.
 *
 * NOTE: This script depends on `@raydium-io/raydium-sdk` (v1) or
 * `@raydium-io/raydium-sdk-v2`. The SDK is large and version-sensitive.
 * The full implementation is non-trivial (~300 lines including market
 * creation). The skeleton below shows the call structure; fill in the
 * SDK-specific glue using the official Raydium docs:
 *
 *   https://github.com/raydium-io/raydium-sdk-V2-demo
 *   https://docs.raydium.io/raydium/protocol/developers/integrating-pools
 *
 * Reference implementation in pump.fun-style projects:
 *   https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/amm/createAmmPool.ts
 *
 * Usage:
 *   ts-node scripts/create-raydium-pool.ts \
 *     --rdx-mint    <RDX_MINT_PUBKEY> \
 *     --rdx-amount  200000000 \
 *     --sol-amount  85 \
 *     --rpc         https://api.mainnet-beta.solana.com \
 *     --keypair     ~/.config/solana/deployer.json
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i > 0 && process.argv[i + 1]) return process.argv[i + 1]
  if (fallback !== undefined) return fallback
  throw new Error(`Missing --${name}`)
}

const RDX_MINT   = new PublicKey(arg('rdx-mint'))
const RDX_AMOUNT = BigInt(arg('rdx-amount'))    // whole RDX, decimals applied below
const SOL_AMOUNT = parseFloat(arg('sol-amount'))
const RPC        = arg('rpc',     'https://api.mainnet-beta.solana.com')
const KEYPAIR    = arg('keypair', path.join(process.env.HOME ?? '~', '.config/solana/id.json'))

const RAYDIUM_AMM_V4_PROGRAM = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8')
const OPENBOOK_PROGRAM       = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX')
const WSOL_MINT              = new PublicKey('So11111111111111111111111111111111111111112')
const RDX_DECIMALS           = 9

;(async () => {
  const connection = new Connection(RPC, 'confirmed')
  const owner      = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))

  console.log('Raydium pool creation')
  console.log('  owner       :', owner.publicKey.toBase58())
  console.log('  RDX mint    :', RDX_MINT.toBase58())
  console.log('  RDX deposit :', RDX_AMOUNT.toString(), `(× 10^${RDX_DECIMALS} atoms)`)
  console.log('  SOL deposit :', SOL_AMOUNT, 'SOL')
  console.log('  initial price:', (SOL_AMOUNT / Number(RDX_AMOUNT)).toExponential(3), 'SOL/RDX')

  const balance = await connection.getBalance(owner.publicKey)
  if (balance < (SOL_AMOUNT + 5) * LAMPORTS_PER_SOL) {
    console.error(`Insufficient SOL — need ${SOL_AMOUNT + 5} SOL (deposit + market/pool fees + rent), have ${balance / LAMPORTS_PER_SOL}`)
    process.exit(1)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Create OpenBook v2 market for RDX/SOL
  // ─────────────────────────────────────────────────────────────────────────
  // The market account contains tick size, lot size, and the bids/asks
  // ledgers Raydium will quote against.
  //
  // Cost: ~3.5 SOL of rent for the account family. Reuse a market if one
  // already exists for this pair (check via Raydium's API or solscan).
  //
  // Implementation pointer: see
  // https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/openBook/createMarket.ts
  // - construct MarketV2 with Market.makeCreateMarketInstructionSimple
  // - serialize, sign, send.
  // ─────────────────────────────────────────────────────────────────────────

  console.error('TODO: Implement OpenBook market creation using @raydium-io/raydium-sdk-v2.')
  console.error('Consult https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/openBook/createMarket.ts')
  console.error('Once the market is created, paste its address into the createPool block below.')

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Initialize Raydium AMM v4 pool
  // ─────────────────────────────────────────────────────────────────────────
  // Once the market exists, call AmmV4.makeCreatePoolV4InstructionV2Simple
  // with:
  //   - marketId: <from step 1>
  //   - baseMint: RDX_MINT (token a)
  //   - quoteMint: WSOL_MINT (token b)
  //   - baseAmount: RDX_AMOUNT * 10^RDX_DECIMALS
  //   - quoteAmount: SOL_AMOUNT * LAMPORTS_PER_SOL
  //   - startTime: 0 (or future timestamp for delayed pool open)
  //   - feeDestinationId: standard Raydium fee receiver
  //
  // The instruction returns the LP mint and the pool authority — write
  // both to disk so lock-lp.ts can read them:
  //
  //   fs.writeFileSync('./pool-info.json', JSON.stringify({
  //     poolId, ammId, lpMint, marketId, ...
  //   }, null, 2))
  // ─────────────────────────────────────────────────────────────────────────

  console.error('TODO: Implement createPoolV4 call.')
  console.error('Reference: https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/amm/createAmmPool.ts')
  console.error('Required deps: npm install @raydium-io/raydium-sdk-v2 @solana/spl-token bn.js')

  process.exit(2)
})().catch(e => {
  console.error('FAILED:', e)
  process.exit(1)
})
