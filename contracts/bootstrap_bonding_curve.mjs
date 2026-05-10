import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import fs from "fs";

async function bootstrap() {
  const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
  
  const walletKey = JSON.parse(fs.readFileSync("../wallet.json", "utf-8"));
  const wallet = web3.Keypair.fromSecretKey(new Uint8Array(walletKey));
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {});
  anchor.setProvider(provider);

  const programId = new web3.PublicKey("2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg");
  
  const minimalIdl = {
    "address": "2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg",
    "metadata": {
      "name": "rd_bondingcurve",
      "version": "0.1.0",
      "spec": "0.1.0"
    },
    "instructions": [
      {
        "name": "initialize_global",
        "discriminator": [47, 225, 15, 112, 86, 51, 190, 231],
        "accounts": [
          { "name": "global", "writable": true, "signer": false },
          { "name": "authority", "writable": true, "signer": true },
          { "name": "system_program", "writable": false, "signer": false }
        ],
        "args": [
          { "name": "treasury", "type": "pubkey" },
          { "name": "migration_authority", "type": "pubkey" }
        ]
      }
    ],
    "accounts": [],
    "types": []
  };

  const program = new Program(minimalIdl, provider);

  console.log("Program ID:", programId.toBase58());

  try {
    const [globalPda] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global")],
      programId
    );
    console.log("Global PDA:", globalPda.toBase58());

    console.log("Sending initialization transaction...");
    const tx = await program.methods
      .initializeGlobal(
        provider.wallet.publicKey, // treasury
        provider.wallet.publicKey  // migration_authority
      )
      .accounts({
        global: globalPda,
        authority: provider.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Success! TX:", tx);
  } catch (err) {
    console.error("Initialization failed:", err);
    if (err.logs) console.log("Logs:", err.logs);
  }
}

bootstrap();
