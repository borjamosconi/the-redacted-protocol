/**
 * Professional bootstrap for Redacted Rewards Protocol.
 * 
 * Usage:
 *   ts-node scripts/init-rewards-pro.ts \
 *     --mint      <RDX_MINT_ADDRESS> \
 *     --vault     <REWARD_VAULT_ATA> \
 *     --authority <SQUADS_ADDRESS>    \
 *     --rpc       https://api.mainnet-beta.solana.com \
 *     --keypair   ~/.config/solana/deployer.json
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

const RPC        = arg('rpc', 'https://api.devnet.solana.com')
const KEYPAIR    = arg('keypair', path.join(process.env.HOME ?? '~', '.config/solana/id.json'))
const MINT       = new PublicKey(arg('mint'))
const VAULT      = new PublicKey(arg('vault'))
const AUTHORITY  = new PublicKey(arg('authority'))

const idlPath = path.join(__dirname, '..', 'target', 'idl', 'rd_rewards.json')
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
const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('reward_config')], program.programId)

;(async () => {
  console.log('🔴 REDACTED REWARDS PRO INITIALIZATION')
  console.log('  program       :', program.programId.toBase58())
  console.log('  config PDA    :', configPda.toBase58())
  console.log('  mint ($RDX)   :', MINT.toBase58())
  console.log('  vault (Multisig):', VAULT.toBase58())
  console.log('  authority     :', AUTHORITY.toBase58())

  const existing = await connection.getAccountInfo(configPda)
  if (existing) {
    console.error(`Rewards config already initialized.`)
    process.exit(1)
  }

  const sig = await program.methods
    .initialize(VAULT)
    .accounts({
      rewardConfig:  configPda,
      authority:     AUTHORITY,
      rewardMint:    MINT,
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([admin])
    .rpc()

  console.log('\n✓ Rewards Protocol Initialized successfully!')
  console.log('  tx:', sig)
  console.log(`  explorer: https://solscan.io/tx/${sig}${RPC.includes('devnet') ? '?cluster=devnet' : ''}`)
})().catch(e => {
  console.error('FAILED:', e?.message ?? e)
  process.exit(1)
})
