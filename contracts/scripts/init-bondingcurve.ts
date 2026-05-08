/**
 * Bootstrap rd-bondingcurve: call `initialize_global` once after deploy.
 *
 * After this runs, anyone can call `create_pool` from the dashboard's
 * LaunchpadPanel to mint a token + spin up its bonding-curve pool.
 *
 * Usage:
 *   ts-node scripts/init-bondingcurve.ts \
 *     --treasury           <TREASURY_PUBKEY>           \
 *     --migration-authority <MIGRATION_AUTH_PUBKEY>    \
 *     --emergency-admin    <EMERGENCY_ADMIN_PUBKEY>    \
 *     --rpc                https://api.devnet.solana.com  \
 *     --keypair            ~/.config/solana/deployer.json
 *
 * Pass --rpc https://api.mainnet-beta.solana.com for mainnet. The keypair is
 * the program's deploy authority (the one that signed `anchor deploy`).
 */

import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i > 0 && process.argv[i + 1]) return process.argv[i + 1]
  if (fallback !== undefined) return fallback
  throw new Error(`Missing --${name}`)
}

const RPC                = arg('rpc', 'https://api.devnet.solana.com')
const KEYPAIR            = arg('keypair', path.join(process.env.HOME ?? '~', '.config/solana/id.json'))
const TREASURY           = new PublicKey(arg('treasury'))
const MIGRATION_AUTH     = new PublicKey(arg('migration-authority'))
const EMERGENCY_ADMIN    = new PublicKey(arg('emergency-admin'))

const idlPath = path.join(__dirname, '..', 'target', 'idl', 'rd_bondingcurve.json')
if (!fs.existsSync(idlPath)) {
  console.error(`IDL not found at ${idlPath}. Run \`anchor build\` first.`)
  process.exit(1)
}
const idl   = JSON.parse(fs.readFileSync(idlPath, 'utf8'))
const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))

const connection = new Connection(RPC, 'confirmed')
const provider   = new AnchorProvider(connection, new Wallet(admin), { commitment: 'confirmed' })
anchor.setProvider(provider)

const program    = new Program(idl, provider) as Program<any>
const PROGRAM_ID = new PublicKey(idl.metadata?.address ?? idl.address)

const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)

;(async () => {
  console.log('rd-bondingcurve init')
  console.log('  program           :', PROGRAM_ID.toBase58())
  console.log('  global PDA        :', globalPda.toBase58())
  console.log('  admin             :', admin.publicKey.toBase58())
  console.log('  treasury          :', TREASURY.toBase58())
  console.log('  migration_auth    :', MIGRATION_AUTH.toBase58())
  console.log('  emergency_admin   :', EMERGENCY_ADMIN.toBase58())

  const existing = await connection.getAccountInfo(globalPda)
  if (existing) {
    console.error(`Global PDA ${globalPda.toBase58()} already initialized.`)
    process.exit(1)
  }

  const sig = await program.methods
    .initializeGlobal(TREASURY, MIGRATION_AUTH)
    .accounts({
      global:               globalPda,
      authority:            admin.publicKey,
      systemProgram:        SystemProgram.programId,
    })
    .signers([admin])
    .rpc()

  console.log('\n✓ initialize_global ok')
  console.log('  tx:', sig)
  console.log(`  explorer: https://solscan.io/tx/${sig}${RPC.includes('devnet') ? '?cluster=devnet' : ''}`)
})().catch(e => {
  // initializeGlobal in lib.rs takes (ctx, emergency_admin: Pubkey). If your
  // version takes no arg, drop EMERGENCY_ADMIN above and call .initializeGlobal().
  console.error('FAILED:', e?.message ?? e)
  console.error('If the error mentions "wrong number of arguments", check the IDL — initialize_global may take 0 args in your build. Edit the call accordingly.')
  process.exit(1)
})
