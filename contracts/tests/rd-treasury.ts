import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdTreasury } from "../target/types/rd_treasury";
import { expect } from "chai";

describe("rd-treasury program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RdTreasury as Program<RdTreasury>;

  it("Can initialize treasury", async () => {
    const [treasuryPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );

    const feeVault = anchor.web3.Keypair.generate().publicKey;

    await program.methods
      .initialize(feeVault)
      .accounts({
        treasury: treasuryPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const treasury = await program.account.treasury.fetch(treasuryPda);
    expect(treasury.feePerDocument.toNumber()).to.equal(100000000); // 0.1 RDX with 9 decimals
    expect(treasury.stakersPct.toNumber()).to.equal(7000); // 70%
    expect(treasury.treasuryPct.toNumber()).to.equal(2000); // 20%
    expect(treasury.burnPct.toNumber()).to.equal(1000); // 10%
    expect(treasury.authority.equals(provider.wallet.publicKey)).to.be.true;
  });

  it("Can collect fee", async () => {
    const [treasuryPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );

    const payer = provider.wallet.publicKey;

    await program.methods
      .collectFee()
      .accounts({
        treasury: treasuryPda,
        payer: payer,
        signer: payer,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const treasury = await program.account.treasury.fetch(treasuryPda);
    expect(treasury.totalFeesCollected.toNumber()).to.be.greaterThan(0);
  });

  it("Cannot withdraw if not authority", async () => {
    const [treasuryPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );

    const nonAuthority = anchor.web3.Keypair.generate().publicKey;

    try {
      await program.methods
        .withdrawTreasury()
        .accounts({
          treasury: treasuryPda,
          signer: nonAuthority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.exist;
    }
  });

  it("Can update fee distribution (authority only)", async () => {
    const [treasuryPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );

    await program.methods
      .updateFeeDistribution(
        new anchor.BN(200000000), // 0.2 RDX
        new anchor.BN(6000), // 60% stakers
        new anchor.BN(3000), // 30% treasury
        new anchor.BN(1000) // 10% burn
      )
      .accounts({
        treasury: treasuryPda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const treasury = await program.account.treasury.fetch(treasuryPda);
    expect(treasury.feePerDocument.toNumber()).to.equal(200000000);
    expect(treasury.stakersPct.toNumber()).to.equal(6000);
  });
});
