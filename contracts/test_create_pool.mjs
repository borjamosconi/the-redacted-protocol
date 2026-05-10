import * as web3 from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

async function main() {
  const secretKey = JSON.parse(fs.readFileSync('../wallet.json', 'utf8'));
  const wallet = web3.Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    preflightCommitment: "confirmed",
  });

  const programId = new web3.PublicKey("2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg");

  const minimalIdl = {
    "address": "2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg",
    "metadata": { "name": "rd_bondingcurve", "version": "0.1.0", "spec": "0.1.0" },
    "instructions": [
      {
        "name": "create_pool",
        "discriminator": [233, 146, 209, 142, 207, 104, 64, 188],
        "accounts": [
          { "name": "global", "writable": true, "signer": false },
          { "name": "pool", "writable": true, "signer": false },
          { "name": "mint", "writable": true, "signer": false },
          { "name": "token_vault", "writable": true, "signer": false },
          { "name": "sol_vault", "writable": true, "signer": false },
          { "name": "creator", "writable": true, "signer": true },
          { "name": "system_program", "writable": false, "signer": false },
          { "name": "token_program", "writable": false, "signer": false },
          { "name": "associated_token_program", "writable": false, "signer": false },
          { "name": "rent", "writable": false, "signer": false }
        ],
        "args": [
          { "name": "name", "type": "string" },
          { "name": "symbol", "type": "string" },
          { "name": "uri", "type": "string" }
        ]
      }
    ],
    "accounts": [],
    "types": []
  };

  const program = new Program(minimalIdl, provider);

  console.log("Creating new token mint...");
  const mint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    wallet.publicKey,
    6
  );
  console.log("Mint created:", mint.toBase58());

  const [globalPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("global")], programId);
  const [poolPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("pool"), mint.toBuffer()], programId);
  const [solVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("sol_vault"), mint.toBuffer()], programId);
  
  const tokenVault = await getAssociatedTokenAddress(mint, poolPda, true);

  console.log("Global PDA:", globalPda.toBase58());
  console.log("Pool PDA:", poolPda.toBase58());
  console.log("Token Vault:", tokenVault.toBase58());
  console.log("SOL Vault:", solVaultPda.toBase58());

  console.log("Creating pool...");
  try {
    const tx = await program.methods
      .createPool("Redacted Token", "RDX", "https://redacted.com/metadata.json")
      .accounts({
        global: globalPda,
        pool: poolPda,
        mint: mint,
        tokenVault: tokenVault,
        solVault: solVaultPda,
        creator: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log("Pool created! TX:", tx);
  } catch (err) {
    console.error("Error creating pool:", err);
  }
}

main();
