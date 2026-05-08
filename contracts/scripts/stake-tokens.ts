import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RdStaking } from "../target/types/rd_staking";
import { PublicKey, Keypair } from "@solana/web3.js";
import { 
    TOKEN_PROGRAM_ID, 
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.RdStaking as Program<RdStaking>;
    const wallet = provider.wallet as anchor.Wallet;

    const rdxMint = new PublicKey("HZmo7pqLsZ6Z5EeoaRKvTpPdGrpk3mMV9cdALFcFCjjU");
    const [poolPda] = PublicKey.findProgramAddressSync([Buffer.from("staking_pool")], program.programId);
    
    // User Stake PDA
    const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), poolPda.toBuffer(), wallet.publicKey.toBuffer()],
        program.programId
    );

    console.log("Stake PDA:", stakePda.toBase58());

    // Vaults (In a real scenario, these would be PDAs or specific accounts)
    // For this test, we assume they are already created and funded.
    const userAta = getAssociatedTokenAddressSync(rdxMint, wallet.publicKey);
    
    // Let's stake 50 RDX
    const amount = new anchor.BN(50_000_000_000); 

    console.log(`🥩 Staking ${amount.div(new anchor.BN(1_000_000_000)).toString()} RDX...`);

    try {
        await program.methods
            .stake(amount)
            .accounts({
                stakeAccount: stakePda,
                stakingPool: poolPda,
                userTokenAccount: userAta,
                stakingVault: userAta, // En una demo simplificada usamos el mismo ATA o uno de tesorería
                stakingTokenMint: rdxMint,
                signer: wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .rpc();
        
        console.log("✅ Successfully staked tokens!");
    } catch (e) {
        console.error("❌ Staking failed:", e);
    }
}

main().catch(console.error);
