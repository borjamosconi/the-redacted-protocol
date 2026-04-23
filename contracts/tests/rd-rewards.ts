import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdRewards } from "../target/types/rd_rewards";
import { expect } from "chai";

describe("rd-rewards program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RdRewards as Program<RdRewards>;

  it("Can initialize reward configuration", async () => {
    const [configPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_config")],
      program.programId
    );

    const rewardMint = anchor.web3.Keypair.generate().publicKey;
    const rewardVault = anchor.web3.Keypair.generate().publicKey;

    await program.methods
      .initialize(rewardMint, rewardVault)
      .accounts({
        rewardConfig: configPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.rewardConfig.fetch(configPda);
    expect(config.documentReward.toNumber()).to.equal(100);
    expect(config.verifyReward.toNumber()).to.equal(50);
    expect(config.publishReward.toNumber()).to.equal(25);
    expect(config.referralReward.toNumber()).to.equal(50);
    expect(config.authority.equals(provider.wallet.publicKey)).to.be.true;
  });

  it("Can reward document submission", async () => {
    const [configPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_config")],
      program.programId
    );

    const user = provider.wallet.publicKey;

    await program.methods
      .rewardDocument()
      .accounts({
        rewardConfig: configPda,
        signer: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.rewardConfig.fetch(configPda);
    expect(config.totalDistributed.toNumber()).to.be.greaterThan(0);
  });

  it("Can reward verification", async () => {
    const [configPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_config")],
      program.programId
    );

    await program.methods
      .rewardVerify()
      .accounts({
        rewardConfig: configPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.rewardConfig.fetch(configPda);
    // Total distributed should have increased
    expect(config.totalDistributed.toNumber()).to.be.greaterThan(0);
  });

  it("Can reward publishing", async () => {
    const [configPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward_config")],
      program.programId
    );

    await program.methods
      .rewardPublish()
      .accounts({
        rewardConfig: configPda,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.rewardConfig.fetch(configPda);
    expect(config.totalDistributed.toNumber()).to.be.greaterThan(0);
  });
});
