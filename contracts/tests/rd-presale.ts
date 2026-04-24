// Minimal smoke test for rd-presale. Covers init + state readback.
import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js'
import { createMint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { assert } from 'chai'

describe('rd-presale', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const program = anchor.workspace.RdPresale as Program<any>

  it('initializes the presale', async () => {
    const wallet = (provider.wallet as anchor.Wallet).payer
    const rdxMint = await createMint(provider.connection, wallet, wallet.publicKey, null, 9)
    const [presalePda] = PublicKey.findProgramAddressSync([Buffer.from('presale')], program.programId)

    await program.methods
      .initialize(new anchor.BN(1_000_000_000_000))
      .accounts({
        authority: wallet.publicKey,
        presale: presalePda,
        rdxTokenMint: rdxMint,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    const s: any = await program.account.presaleState.fetch(presalePda)
    assert.equal(s.authority.toBase58(), wallet.publicKey.toBase58())
    assert.equal(s.isActive, true)
  })
})
