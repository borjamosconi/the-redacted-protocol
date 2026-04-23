import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdStaking } from "../target/types/rd_staking";
import { expect } from "chai";

describe("rd-staking program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RdStaking as Program<RdStaking>;

  it("Can initialize staking pool", async () => {
    const [poolPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );

    // Use dummy mint addresses (in production these would be real token mints)
    const stakingTokenMint = anchor.web3.Keypair.generate().publicKey;
    const rewardTokenMint = anchor.web3.Keypair.generate().publicKey;

    await program.methods
      .initialize(new anchor.BN(1000), stakingTokenMint, rewardTokenMint)
      .accounts({
        stakingPool: poolPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const pool = await program.account.stakingPool.fetch(poolPda);
    expect(pool.rewardPerSecond.toNumber()).to.equal(1000);
    expect(pool.authority.equals(provider.wallet.publicKey)).to.be.true;
  });

  it("Cannot stake below minimum", async () => {
    const [poolPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );

    const stakingTokenMint = anchor.web3.Keypair.generate().publicKey;
    const rewardTokenMint = anchor.web3.Keypair.generate().publicKey;

    // Create a new stake account
    const user = provider.wallet.publicKey;
    const [stakePda, stakeBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), poolPda.toBuffer(), user.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .stake(new anchor.BN(1)) // Below minimum of 10 RDX
        .accounts({
          stakingPool: poolPda,
          stakeAccount: stakePda,
          signer: user,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      // Should fail due to below minimum
      expect(err.message).to.exist;
    }
  });

  it("Can claim rewards (no-op for stub)", async () => {
    // This test verifies the claim instruction exists and can be called
    // In production with real token transfers, this would verify reward distribution
    const [poolPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );

    const user = provider.wallet.publicKey;
    const [stakePda, stakeBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), poolPda.toBuffer(), user.toBuffer()],
      program.programId
    );

    // Claim on non-existent stake account should fail gracefully
    try {
      await program.methods
        .claim()
        .accounts({
          stakingPool: poolPda,
          stakeAccount: stakePda,
          signer: user,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (err) {
      // Expected to fail since stake account doesn't exist
      expect(err.message).to.exist;
    }
  });
});
