/**
 * Initialize the rd-presale program on-chain with the 100-SOL config.
 *
 * Usage:
 *   ts-node scripts/init-presale.ts \
 *     --rdx-mint <RDX_MINT_PUBKEY> \
 *     --rpc      https://api.mainnet-beta.solana.com \
 *     --keypair  ~/.config/solana/deployer.json
 *
 * The keypair MUST be the program's deploy authority (the one that signed
 * `anchor deploy`). The presale state PDA is initialized owned by this key.
 */

import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

// ── Args parsing ────────────────────────────────────────────────────────────
function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i > 0 && process.argv[i + 1]) return process.argv[i + 1]
  if (fallback !== undefined) return fallback
  throw new Error(`Missing --${name}`)
}

const RDX_MINT     = new PublicKey(arg('rdx-mint'))
const RPC          = arg('rpc', 'https://api.mainnet-beta.solana.com')
const KEYPAIR_PATH = arg('keypair', path.join(process.env.HOME ?? '~', '.config/solana/id.json'))

// ── Config (from PRESALE-100SOL.md) ─────────────────────────────────────────
const RDX_PER_SOL_EARLY = new BN('2000000000000000')         // 2_000_000 RDX × 10^9 atomic units
const SOFT_CAP_LAMPORTS = new BN(100 * LAMPORTS_PER_SOL)     // 100 SOL

// ── Setup ───────────────────────────────────────────────────────────────────
const idlPath = path.join(__dirname, '..', 'target', 'idl', 'rd_presale.json')
if (!fs.existsSync(idlPath)) {
  console.error(`IDL not found at ${idlPath}. Run \`anchor build\` first.`)
  process.exit(1)
}
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'))

const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8')))
const authority = Keypair.fromSecretKey(secretKey)

const connection = new Connection(RPC, 'confirmed')
const provider   = new AnchorProvider(connection, new Wallet(authority), { commitment: 'confirmed' })
anchor.setProvider(provider)

const program    = new Program(idl, provider) as Program<any>
const PROGRAM_ID = new PublicKey(idl.metadata?.address ?? idl.address)

const [presalePda] = PublicKey.findProgramAddressSync([Buffer.from('presale')], PROGRAM_ID)

// ── Run ─────────────────────────────────────────────────────────────────────
;(async () => {
  console.log('Initializing presale')
  console.log('  program       :', PROGRAM_ID.toBase58())
  console.log('  presale PDA   :', presalePda.toBase58())
  console.log('  authority     :', authority.publicKey.toBase58())
  console.log('  rdx mint      :', RDX_MINT.toBase58())
  console.log('  rdx_per_sol   :', RDX_PER_SOL_EARLY.toString(), '(early-bird; public = half)')
  console.log('  soft_cap      :', SOFT_CAP_LAMPORTS.div(new BN(LAMPORTS_PER_SOL)).toString(), 'SOL')

  // Sanity: account must NOT already exist (init = single-shot).
  const existing = await connection.getAccountInfo(presalePda)
  if (existing) {
    console.error(`Presale PDA ${presalePda.toBase58()} already initialized — aborting.`)
    process.exit(1)
  }

  const balance = await connection.getBalance(authority.publicKey)
  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    console.error(`Authority balance ${balance / LAMPORTS_PER_SOL} SOL too low (need ≥0.05).`)
    process.exit(1)
  }

  const sig = await program.methods
    .initialize(RDX_PER_SOL_EARLY, SOFT_CAP_LAMPORTS)
    .accounts({
      authority:     authority.publicKey,
      presale:       presalePda,
      rdxTokenMint:  RDX_MINT,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc()

  console.log('\n✓ Presale initialized')
  console.log('  tx:', sig)
  console.log('  explorer:', `https://solscan.io/tx/${sig}`)

  const state = await program.account.presaleState.fetch(presalePda)
  console.log('\nState:')
  console.log('  start_time   :', new Date(state.startTime.toNumber() * 1000).toISOString())
  console.log('  end_time     :', new Date(state.endTime.toNumber() * 1000).toISOString())
  console.log('  is_active    :', state.isActive)
  console.log('  is_launched  :', state.isLaunched)
  console.log('  soft_cap     :', state.softCap.toString())
})().catch(e => {
  console.error('FAILED:', e)
  process.exit(1)
})
