/**
 * Permanently lock the Raydium LP tokens via rd-bondingcurve::graduate_step2_lock_lp.
 *
 * Lock target: PDA `[b"lp_lock_authority", lp_mint]` owned by the
 * rd-bondingcurve program. This PDA has no withdraw instruction → tokens
 * are unrecoverable, identical in effect to "burn LP" but cleaner because
 * the supply remains visible on-chain.
 *
 * Run AFTER create-raydium-pool.ts has succeeded and you know:
 *   - lp_mint pubkey  (from pool-info.json)
 *   - lp_amount       (use the full balance from the liquidity_recipient ATA)
 *
 * Usage:
 *   ts-node scripts/lock-lp.ts \
 *     --lp-mint   <LP_MINT_PUBKEY> \
 *     --lp-amount <ALL>            (or a specific amount in atomic units) \
 *     --rpc       https://api.mainnet-beta.solana.com \
 *     --keypair   ~/.config/solana/deployer.json
 */

import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, BN, Program, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i > 0 && process.argv[i + 1]) return process.argv[i + 1]
  if (fallback !== undefined) return fallback
  throw new Error(`Missing --${name}`)
}

const LP_MINT       = new PublicKey(arg('lp-mint'))
const LP_AMOUNT_ARG = arg('lp-amount', 'ALL')
const RPC           = arg('rpc',       'https://api.mainnet-beta.solana.com')
const KEYPAIR       = arg('keypair',   path.join(process.env.HOME ?? '~', '.config/solana/id.json'))

;(async () => {
  const idl = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'target', 'idl', 'rd_bondingcurve.json'),
    'utf8',
  ))
  const owner = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))

  const connection = new Connection(RPC, 'confirmed')
  const provider   = new AnchorProvider(connection, new Wallet(owner), { commitment: 'confirmed' })
  anchor.setProvider(provider)

  const program    = new Program(idl, provider) as Program<any>
  const PROGRAM_ID = new PublicKey(idl.metadata?.address ?? idl.address)

  const [lpLockAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('lp_lock_authority'), LP_MINT.toBuffer()],
    PROGRAM_ID,
  )
  const ownerLpAta = await getAssociatedTokenAddress(LP_MINT, owner.publicKey)
  const lockAta    = await getAssociatedTokenAddress(LP_MINT, lpLockAuthority, true /* allowOwnerOffCurve */)

  // Resolve LP amount.
  let lpAmount: BN
  if (LP_AMOUNT_ARG === 'ALL') {
    const ataInfo = await connection.getTokenAccountBalance(ownerLpAta).catch(() => null)
    if (!ataInfo) {
      console.error(`No LP balance in ${ownerLpAta.toBase58()} — did create-raydium-pool.ts succeed?`)
      process.exit(1)
    }
    lpAmount = new BN(ataInfo.value.amount)
  } else {
    lpAmount = new BN(LP_AMOUNT_ARG)
  }

  console.log('LP lock')
  console.log('  lp_mint           :', LP_MINT.toBase58())
  console.log('  lp_amount         :', lpAmount.toString())
  console.log('  owner_lp_ata      :', ownerLpAta.toBase58())
  console.log('  lp_lock_authority :', lpLockAuthority.toBase58(), '(PDA, no withdraw)')
  console.log('  lock_ata          :', lockAta.toBase58())

  const sig = await program.methods
    .graduateStep2LockLp(lpAmount)
    .accounts({
      authority:                owner.publicKey,
      lpMint:                   LP_MINT,
      ownerLpAta:               ownerLpAta,
      lpLockAuthority:          lpLockAuthority,
      lockAta:                  lockAta,
      tokenProgram:             TOKEN_PROGRAM_ID,
      associatedTokenProgram:   ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram:            SystemProgram.programId,
    })
    .signers([owner])
    .rpc()

  console.log('\n✓ LP locked permanently')
  console.log('  tx:', sig)
  console.log('  These LP tokens can NEVER be withdrawn — liquidity is locked for the lifetime of the program.')
})().catch(e => {
  console.error('FAILED:', e)
  process.exit(1)
})
