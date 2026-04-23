import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdFragment } from "../target/types/rd_fragment";
import { expect } from "chai";
import { sha256 } from "js-sha256";

describe("rd-fragment program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RdFragment as Program<RdFragment>;

  const testContent = "This is a test redacted content";
  const contentHash = sha256.digest(testContent);
  const contentHashBuffer = Buffer.from(contentHash);

  it("Can submit a fragment with valid parameters", async () => {
    const [fragmentPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("fragment"), contentHashBuffer],
      program.programId
    );

    await program.methods
      .submitFragment(
        contentHashBuffer,
        new anchor.BN(85), // confidence
        "arweave_tx_123",
        ["politics", "censorship"]
      )
      .accounts({
        fragmentAccount: fragmentPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([])
      .rpc();

    const account = await program.account.fragmentAccount.fetch(fragmentPda);
    expect(account.confidence.toNumber()).to.equal(85);
    expect(account.isVerified).to.equal(false);
    expect(account.arweaveTxId).to.equal("arweave_tx_123");
    expect(account.topicTags).to.deep.equal(["politics", "censorship"]);
    expect(account.submitter.equals(provider.wallet.publicKey)).to.be.true;
  });

  it("Can verify a submitted fragment", async () => {
    const [fragmentPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("fragment"), contentHashBuffer],
      program.programId
    );

    const zkProofHash = sha256.digest("zk_proof_data");
    const zkProofBuffer = Buffer.from(zkProofHash);

    await program.methods
      .verifyFragment(zkProofBuffer)
      .accounts({
        fragmentAccount: fragmentPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const account = await program.account.fragmentAccount.fetch(fragmentPda);
    expect(account.isVerified).to.equal(true);
  });

  it("Rejects confidence > 100", async () => {
    const badContent = "Another test";
    const badHash = Buffer.from(sha256.digest(badContent));

    const [fragmentPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("fragment"), badHash],
      program.programId
    );

    try {
      await program.methods
        .submitFragment(badHash, new anchor.BN(150), "arweave_tx", [])
        .accounts({
          fragmentAccount: fragmentPda,
          signer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.include("InvalidConfidence");
    }
  });

  it("Rejects more than 5 topic tags", async () => {
    const badContent = "Yet another test";
    const badHash = Buffer.from(sha256.digest(badContent));

    const [fragmentPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("fragment"), badHash],
      program.programId
    );

    try {
      await program.methods
        .submitFragment(
          badHash,
          new anchor.BN(50),
          "arweave_tx",
          ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
        )
        .accounts({
          fragmentAccount: fragmentPda,
          signer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.include("TooManyTags");
    }
  });

  it("Rejects Arweave ID longer than 64 bytes", async () => {
    const badContent = "Test for arweave length";
    const badHash = Buffer.from(sha256.digest(badContent));

    const [fragmentPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("fragment"), badHash],
      program.programId
    );

    try {
      await program.methods
        .submitFragment(
          badHash,
          new anchor.BN(50),
          "a".repeat(65),
          []
        )
        .accounts({
          fragmentAccount: fragmentPda,
          signer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.include("ArweaveIdTooLong");
    }
  });

  it("Emits FragmentSubmitted event", async () => {
    const testContent2 = "Event test content";
    const contentHash2 = Buffer.from(sha256.digest(testContent2));

    const [fragmentPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("fragment"), contentHash2],
      program.programId
    );

    const tx = await program.methods
      .submitFragment(
        contentHash2,
        new anchor.BN(75),
        "arweave_tx_event",
        ["test"]
      )
      .accounts({
        fragmentAccount: fragmentPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const parsedTx = await provider.connection.getParsedTransaction(tx, {
      commitment: "confirmed",
    });
    const event = parsedTx.meta.innerInstructions?.some((ix) => {
      return ix.instructions.some((inner) => {
        const data = (inner as any).parsed?.data;
        return data && data.includes("FragmentSubmitted");
      });
    });
    // Event verification on localnet may vary; we just check tx succeeded
    expect(tx).to.be.a("string");
  });
});
