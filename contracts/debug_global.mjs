import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { IDL } from "./the_redacted_protocol/dashboard/src/lib/rd-bondingcurve/idl.js";

async function main() {
    const connection = new Connection("https://api.devnet.solana.com");
    const programId = new PublicKey("2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg");
    
    const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from("global")], programId);
    console.log("Global PDA:", globalPda.toBase58());

    const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
    };
    const provider = new anchor.AnchorProvider(connection, dummyWallet, { commitment: "confirmed" });
    const program = new anchor.Program(IDL, provider);

    try {
        const globalState = await program.account.globalState.fetch(globalPda);
        console.log("Global State:", JSON.stringify(globalState, null, 2));
    } catch (e) {
        console.error("Failed to fetch global state:", e.message);
    }
}

main();
