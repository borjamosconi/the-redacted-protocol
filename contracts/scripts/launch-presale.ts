/**
 * Trigger the on-chain `launch` instruction after the presale ends.
 *
 *   • 85% of total raised → liquidity_recipient (the wallet that will seed Raydium)
 *   • 10%                 → burn_wallet (1nc1nerator11…)
 *   •  5%                 → treasury_recipient
 *   • presale.is_launched = true (enables `claim`, blocks `claim_refund`)
 *
 * Pre-conditions enforced by the program:
 *   • `now >= presale.end_time`
 *   • `presale.is_active` (not paused)
 *   • `!presale.is_launched`
 *   • `presale.total_sol_raised > 0`
 *
 * If you want to enforce the 100-SOL soft-cap *before* launching (so a
 * shortfall presale auto-fails into refund mode), check
 * `total_sol_raised >= soft_cap` here in JS — the contract does not enforce
 * this on launch (it would deadlock the refund path otherwise).
 *
 * Usage:
 *   ts-node scripts/launch-presale.ts \
 *     --liquidity-recipient <WALLET_LIQUIDEZ> \
 *     --burn-wallet         1nc1nerator11111111111111111111111111111111 \
 *     --treasury-recipient  <WALLET_TESORERIA> \
 *     --rpc                 https://api.mainnet-beta.solana.com \
 *     --keypair             ~/.config/solana/deployer.json
 */

import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import * as fs from 'fs'
import * as path from 'path'

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i > 0 && process.argv[i + 1]) return process.argv[i + 1]
  if (fallback !== undefined) return fallback
  throw new Error(`Missing --${name}`)
}

const LIQUIDITY = new PublicKey(arg('liquidity-recipient'))
const BURN      = new PublicKey(arg('burn-wallet', '1nc1nerator11111111111111111111111111111111'))
const TREASURY  = new PublicKey(arg('treasury-recipient'))
const RPC       = arg('rpc',     'https://api.mainnet-beta.solana.com')
const KEYPAIR   = arg('keypair', path.join(process.env.HOME ?? '~', '.config/solana/id.json'))

const idl       = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'target', 'idl', 'rd_presale.json'), 'utf8'))
const authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))

const connection = new Connection(RPC, 'confirmed')
const provider   = new AnchorProvider(connection, new Wallet(authority), { commitment: 'confirmed' })
anchor.setProvider(provider)

const program    = new Program(idl, provider) as Program<any>
const PROGRAM_ID = new PublicKey(idl.metadata?.address ?? idl.address)

const [presalePda]      = PublicKey.findProgramAddressSync([Buffer.from('presale')],       PROGRAM_ID)
const [presaleVaultPda] = PublicKey.findProgramAddressSync([Buffer.from('presale_vault')], PROGRAM_ID)

;(async () => {
  const state = await program.account.presaleState.fetch(presalePda)
  console.log('Presale state:')
  console.log('  total_sol_raised :', new BN(state.totalSolRaised).div(new BN(LAMPORTS_PER_SOL)).toString(), 'SOL')
  console.log('  soft_cap         :', new BN(state.softCap).div(new BN(LAMPORTS_PER_SOL)).toString(), 'SOL')
  console.log('  end_time         :', new Date(state.endTime.toNumber() * 1000).toISOString())
  console.log('  is_active        :', state.isActive)
  console.log('  is_launched      :', state.isLaunched)
  console.log('  total_participants:', state.totalParticipants.toString())

  const now = Math.floor(Date.now() / 1000)
  if (now < state.endTime.toNumber()) {
    const left = state.endTime.toNumber() - now
    console.error(`Presale still active — ${Math.floor(left / 3600)}h ${Math.floor((left % 3600) / 60)}m left.`)
    process.exit(1)
  }
  if (state.isLaunched) {
    console.error('Already launched. Aborting.')
    process.exit(1)
  }
  if (new BN(state.totalSolRaised).lt(new BN(state.softCap))) {
    console.error(`Soft cap not reached. Buyers should call claim_refund instead. Aborting.`)
    process.exit(1)
  }

  console.log('\nDistribution preview:')
  const total     = new BN(state.totalSolRaised)
  const liquidity = total.mul(new BN(8500)).div(new BN(10000))
  const burn      = total.mul(new BN(1000)).div(new BN(10000))
  const treasury  = total.mul(new BN(500)).div(new BN(10000))
  console.log('  liquidity:', liquidity.div(new BN(LAMPORTS_PER_SOL)).toString(), 'SOL →', LIQUIDITY.toBase58())
  console.log('  burn     :', burn.div(new BN(LAMPORTS_PER_SOL)).toString(), 'SOL →', BURN.toBase58())
  console.log('  treasury :', treasury.div(new BN(LAMPORTS_PER_SOL)).toString(), 'SOL →', TREASURY.toBase58())

  const sig = await program.methods
    .launch()
    .accounts({
      authority:           authority.publicKey,
      presale:             presalePda,
      presaleVault:        presaleVaultPda,
      liquidityRecipient:  LIQUIDITY,
      burnWallet:          BURN,
      treasuryRecipient:   TREASURY,
      systemProgram:       SystemProgram.programId,
    })
    .signers([authority])
    .rpc()

  console.log('\n✓ launch() succeeded')
  console.log('  tx:', sig)
  console.log('  next: ts-node scripts/create-raydium-pool.ts (seed liquidity with the SOL just received)')
})().catch(e => {
  console.error('FAILED:', e)
  process.exit(1)
})
