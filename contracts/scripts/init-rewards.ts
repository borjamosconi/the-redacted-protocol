import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdRewards } from "../target/types/rd_rewards";
import { PublicKey } from "@solana/web3.js";
import { 
    TOKEN_PROGRAM_ID, 
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.RdRewards as Program<RdRewards>;
    const wallet = provider.wallet as anchor.Wallet;

    console.log("🎁 Initializing Redacted Rewards Protocol on Devnet...");
    
    const rdxMint = new PublicKey("7av7nFSMDaQWF4WPCAptZw8n7gDsGmHchcUuKDFzQ4Gf");
    
    // Reward Vault (PDA-owned or treasury ATA)
    // For the contract to work, the config stores the reward_vault Pubkey.
    const rewardVault = getAssociatedTokenAddressSync(rdxMint, wallet.publicKey); // For demo, using wallet ATA as vault

    const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("reward_config")],
        program.programId
    );

    try {
        await program.methods
            .initialize(rewardVault)
            .accounts({
                rewardConfig: configPda,
                authority: wallet.publicKey,
                rewardMint: rdxMint,
                systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .rpc();
        
        console.log("✅ Rewards Config Initialized!");
    } catch (e) {
        console.log("ℹ️ Config already exists or initialization failed.");
    }

    // Demonstrate a reward (Document Submission)
    const fragmentHash = Array(32).fill(0).map(() => Math.floor(Math.random() * 256));
    const [recordPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("reward"), 
            Buffer.from(fragmentHash), 
            wallet.publicKey.toBuffer(), 
            Buffer.from([0]) // REWARD_TYPE_DOCUMENT
        ],
        program.programId
    );

    console.log("Dispatching test reward for document submission...");
    try {
        await program.methods
            .rewardDocument(fragmentHash)
            .accounts({
                rewardConfig: configPda,
                signer: wallet.publicKey,
                rewardVault: rewardVault,
                userRewardAccount: rewardVault, // For demo, sending to same account
                rewardRecord: recordPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .rpc();
        console.log("✅ Reward Dispatched successfully!");
    } catch (e) {
        console.error("❌ Reward dispatch failed:", e);
    }
}

main().catch(console.error);
