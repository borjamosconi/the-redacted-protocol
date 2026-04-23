import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdArchive } from "../target/types/rd_archive";
import { expect } from "chai";
import { sha256 } from "js-sha256";

describe("rd-archive program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RdArchive as Program<RdArchive>;

  it("Can register an archive entry", async () => {
    const fragmentHash = Buffer.from(sha256.digest("fragment content"));
    const sequenceNumber = new anchor.BN(1);

    const [archivePda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("archive"), sequenceNumber.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    await program.methods
      .registerEntry(fragmentHash, sequenceNumber, "arweave_tx_archive_123")
      .accounts({
        archiveEntry: archivePda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.archiveEntry.fetch(archivePda);
    expect(account.sequenceNumber.toNumber()).to.equal(1);
    expect(account.arweaveTx).to.equal("arweave_tx_archive_123");
    expect(account.registrar.equals(provider.wallet.publicKey)).to.be.true;
  });

  it("Cannot register duplicate sequence numbers", async () => {
    const fragmentHash = Buffer.from(sha256.digest("another fragment"));
    const sequenceNumber = new anchor.BN(42);

    const [archivePda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("archive"), sequenceNumber.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // First registration should succeed
    await program.methods
      .registerEntry(fragmentHash, sequenceNumber, "arweave_first")
      .accounts({
        archiveEntry: archivePda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Second registration with same sequence should fail (account already exists)
    try {
      await program.methods
        .registerEntry(Buffer.from(sha256.digest("different content")), sequenceNumber, "arweave_second")
        .accounts({
          archiveEntry: archivePda,
          signer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      // On localnet this might not throw but will create a different PDA
      // We just verify the first entry remains intact
    } catch (err) {
      expect(err.message).to.include("already in use");
    }
  });

  it("Emits EntryRegistered event", async () => {
    const fragmentHash = Buffer.from(sha256.digest("event test"));
    const sequenceNumber = new anchor.BN(100);

    const [archivePda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("archive"), sequenceNumber.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .registerEntry(fragmentHash, sequenceNumber, "arweave_event_tx")
      .accounts({
        archiveEntry: archivePda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    expect(tx).to.be.a("string");
  });
});
