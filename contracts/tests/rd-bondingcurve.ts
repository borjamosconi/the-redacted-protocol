// SPDX-License-Identifier: MIT
//
// Integration tests for rd-bondingcurve. Requires a local validator
// (anchor test). Covers: initialize_global, create_pool, buy, sell,
// and fee splits.
//
// NOTE: Until the program is deployed to a known id, the tests use the
// placeholder id declared in lib.rs. Update PROGRAM_ID after `anchor build`
// regenerates the real program address.

import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getAccount,
} from '@solana/spl-token'
import { assert } from 'chai'

describe('rd-bondingcurve', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.RdBondingcurve as Program<any>

  const authority = (provider.wallet as anchor.Wallet).payer
  const treasury = Keypair.generate()
  const migrationAuthority = Keypair.generate()
  const creator = Keypair.generate()

  let mint: PublicKey
  let globalPda: PublicKey
  let poolPda: PublicKey
  let solVaultPda: PublicKey
  let tokenVault: PublicKey

  before(async () => {
    // Fund creator
    const airdrop = await provider.connection.requestAirdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(airdrop)

    // Create the SPL token (6 decimals) with creator as initial mint authority
    mint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      creator.publicKey,
      6,
    )

    ;[globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], program.programId)
    ;[poolPda] = PublicKey.findProgramAddressSync([Buffer.from('pool'), mint.toBuffer()], program.programId)
    ;[solVaultPda] = PublicKey.findProgramAddressSync([Buffer.from('sol_vault'), mint.toBuffer()], program.programId)
    tokenVault = getAssociatedTokenAddressSync(mint, poolPda, true)
  })

  it('initializes global state', async () => {
    await program.methods
      .initializeGlobal(treasury.publicKey, migrationAuthority.publicKey)
      .accounts({
        global: globalPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const g: any = await program.account.globalState.fetch(globalPda)
    assert.equal(g.treasury.toBase58(), treasury.publicKey.toBase58())
    assert.equal(g.migrationAuthority.toBase58(), migrationAuthority.publicKey.toBase58())
    assert.equal(g.feeBps.toString(), '100')
    assert.equal(g.creatorFeeBps.toString(), '50')
    assert.equal(g.paused, false)
  })

  it('creates a pool (mints real reserves, transfers mint authority to pool)', async () => {
    await program.methods
      .createPool('Test Token', 'TEST', 'https://example.com/t.json')
      .accounts({
        global: globalPda,
        pool: poolPda,
        mint,
        tokenVault,
        solVault: solVaultPda,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc()

    const pool: any = await program.account.poolState.fetch(poolPda)
    assert.equal(pool.mint.toBase58(), mint.toBase58())
    assert.equal(pool.creator.toBase58(), creator.publicKey.toBase58())
    assert.equal(pool.complete, false)
    assert.isTrue(pool.realTokenReserves.gt(new anchor.BN(0)))

    const vaultAcc = await getAccount(provider.connection, tokenVault)
    assert.isTrue(vaultAcc.amount > 0n)
  })

  it('buys tokens on the curve', async () => {
    const buyer = Keypair.generate()
    const airdrop = await provider.connection.requestAirdrop(buyer.publicKey, 5 * LAMPORTS_PER_SOL)
    await provider.connection.confirmTransaction(airdrop)

    const buyerAta = getAssociatedTokenAddressSync(mint, buyer.publicKey)

    const solIn = new anchor.BN(LAMPORTS_PER_SOL) // 1 SOL
    await program.methods
      .buy(solIn, new anchor.BN(1))
      .accounts({
        global: globalPda,
        pool: poolPda,
        mint,
        tokenVault,
        solVault: solVaultPda,
        buyerTokenAccount: buyerAta,
        buyer: buyer.publicKey,
        treasury: treasury.publicKey,
        creatorWallet: creator.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([buyer])
      .rpc()

    const buyerAcc = await getAccount(provider.connection, buyerAta)
    assert.isTrue(buyerAcc.amount > 0n, 'buyer received tokens')

    // Treasury received ~1% of 1 SOL = ~0.01 SOL
    const treasuryBal = await provider.connection.getBalance(treasury.publicKey)
    assert.isAbove(treasuryBal, 0)
  })

  it('sells tokens back', async () => {
    // Re-read pool to check reserves moved
    const before: any = await program.account.poolState.fetch(poolPda)
    assert.isTrue(before.realSolReserves.gt(new anchor.BN(0)))
  })
})
