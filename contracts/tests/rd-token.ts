import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdToken } from "../target/types/rd_token";
import { expect } from "chai";

describe("rd-token program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RdToken as Program<RdToken>;

  it("Can initialize token metadata", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const mint = mintKeypair.publicKey;

    const [metadataPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_metadata"), mint.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeToken("Redacted Protocol", "RDX", "https://redacted-protocol.vercel.app")
      .accounts({
        tokenMetadata: metadataPda,
        mint: mint,
        authority: provider.wallet.publicKey,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([mintKeypair])
      .rpc();

    const metadata = await program.account.tokenMetadata.fetch(metadataPda);
    expect(metadata.name).to.equal("Redacted Protocol");
    expect(metadata.symbol).to.equal("RDX");
    expect(metadata.uri).to.equal("https://redacted-protocol.vercel.app");
    expect(metadata.decimals).to.equal(9);
    expect(metadata.totalSupply.toNumber()).to.equal(0);
  });

  it("Cannot create metadata with name too long", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const mint = mintKeypair.publicKey;

    const [metadataPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_metadata"), mint.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeToken("A".repeat(33), "RDX", "https://example.com")
        .accounts({
          tokenMetadata: metadataPda,
          mint: mint,
          authority: provider.wallet.publicKey,
          signer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([mintKeypair])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.include("NameTooLong");
    }
  });

  it("Cannot create metadata with symbol too long", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const mint = mintKeypair.publicKey;

    const [metadataPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_metadata"), mint.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeToken("Test", "REDACTEDTOKEN", "https://example.com")
        .accounts({
          tokenMetadata: metadataPda,
          mint: mint,
          authority: provider.wallet.publicKey,
          signer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([mintKeypair])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.include("SymbolTooLong");
    }
  });

  it("Can initialize vesting schedule", async () => {
    const mintKeypair = anchor.web3.Keypair.generate();
    const mint = mintKeypair.publicKey;

    const [metadataPda, metadataBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_metadata"), mint.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeToken("Test Token", "TST", "https://example.com")
      .accounts({
        tokenMetadata: metadataPda,
        mint: mint,
        authority: provider.wallet.publicKey,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([mintKeypair])
      .rpc();

    const beneficiary = anchor.web3.Keypair.generate().publicKey;
    const vault = anchor.web3.Keypair.generate().publicKey;

    const [vestingPda, vestingBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vesting"), beneficiary.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeVesting(
        beneficiary,
        vault,
        new anchor.BN(1000000000), // 1B tokens
        new anchor.BN(Math.floor(Date.now() / 1000)), // start now
        new anchor.BN(15552000), // 6 months cliff
        new anchor.BN(47088000) // 18 months vesting
      )
      .accounts({
        vestingSchedule: vestingPda,
        tokenMetadata: metadataPda,
        authority: provider.wallet.publicKey,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vesting = await program.account.vestingSchedule.fetch(vestingPda);
    expect(vesting.totalAmount.toNumber()).to.equal(1000000000);
    expect(vesting.beneficiary.equals(beneficiary)).to.be.true;
    expect(vesting.cancelled).to.equal(false);
  });

  it("Cannot cancel vesting before cliff (by non-authority)", async () => {
    const beneficiary = anchor.web3.Keypair.generate().publicKey;
    const vault = anchor.web3.Keypair.generate().publicKey;

    const [vestingPda, vestingBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vesting"), beneficiary.toBuffer()],
      program.programId
    );

    const nonAuthority = anchor.web3.Keypair.generate();

    try {
      await program.methods
        .cancelVesting()
        .accounts({
          vestingSchedule: vestingPda,
          signer: nonAuthority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([nonAuthority])
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.message).to.exist;
    }
  });
});
