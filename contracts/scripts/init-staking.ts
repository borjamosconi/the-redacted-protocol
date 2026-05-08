import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdStaking } from "../target/types/rd_staking";
import { PublicKey, Keypair } from "@solana/web3.js";
import { 
    TOKEN_PROGRAM_ID, 
    getOrCreateAssociatedTokenAccount, 
    mintTo 
} from "@solana/spl-token";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.RdStaking as Program<RdStaking>;
    const wallet = provider.wallet as anchor.Wallet;

    console.log("🚀 Initializing Redacted Staking Protocol on Devnet...");
    console.log("Wallet:", wallet.publicKey.toBase58());

    // 1. RDX Token Mint
    const rdxMint = new PublicKey("HZmo7pqLsZ6Z5EeoaRKvTpPdGrpk3mMV9cdALFcFCjjU"); 
    
    // 2. PDAs
    const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("staking_pool")],
        program.programId
    );

    console.log("Staking Pool PDA:", poolPda.toBase58());

    // 3. Initialize Pool
    try {
        const rewardPerSecond = new anchor.BN(1_000_000); // Recompensa base
        
        await program.methods
            .initialize(rewardPerSecond)
            .accounts({
                stakingPool: poolPda,
                authority: wallet.publicKey,
                stakingTokenMint: rdxMint,
                rewardTokenMint: rdxMint,
                systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .rpc();
        
        console.log("✅ Staking Pool Initialized!");
    } catch (e) {
        console.log("ℹ️ Pool already exists or initialization failed:", e);
    }

    console.log("✨ Staking infrastructure ready for Devnet testing.");
}

main().catch(console.error);
