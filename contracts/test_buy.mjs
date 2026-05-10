import * as web3 from '@solana/web3.js';
import anchor from '@coral-xyz/anchor';
const { Program, BN } = anchor;
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

async function main() {
  const secretKey = JSON.parse(fs.readFileSync('../wallet.json', 'utf8'));
  const wallet = web3.Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    preflightCommitment: "confirmed",
  });

  const programId = new web3.PublicKey("2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg");
  const TREASURY_PUBKEY = new web3.PublicKey("CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8");

  // Use a mint that was recently created
  const mint = new web3.PublicKey("F39LEHqKUZAQieU1mS4pGVis1You7SYY2vQDcVxxq5mR"); // Replace with actual mint if needed

  const minimalIdl = {
    "address": "2zj6YEu1jYf2En29CHJdCppyhbBmzuAT9zN4Qr9Vkhyg",
    "metadata": { "name": "rd_bondingcurve", "version": "0.1.0" },
    "instructions": [
      {
        "name": "buy",
        "discriminator": [102, 6, 61, 18, 1, 218, 235, 234],
        "accounts": [
          { "name": "global", "writable": false, "signer": false },
          { "name": "pool", "writable": true, "signer": false },
          { "name": "mint", "writable": false, "signer": false },
          { "name": "token_vault", "writable": true, "signer": false },
          { "name": "sol_vault", "writable": true, "signer": false },
          { "name": "buyer_token_account", "writable": true, "signer": false },
          { "name": "user_stats", "writable": true, "signer": false },
          { "name": "buyer", "writable": true, "signer": true },
          { "name": "treasury", "writable": true, "signer": false },
          { "name": "creator_wallet", "writable": true, "signer": false },
          { "name": "referrer", "writable": true, "signer": false },
          { "name": "system_program", "writable": false, "signer": false },
          { "name": "token_program", "writable": false, "signer": false },
          { "name": "associated_token_program", "writable": false, "signer": false },
          { "name": "rent", "writable": false, "signer": false }
        ],
        "args": [
          { "name": "sol_in", "type": "u64" },
          { "name": "min_tokens_out", "type": "u64" },
          { "name": "referral", "type": { "option": "pubkey" } }
        ]
      }
    ],
    "accounts": [],
    "types": []
  };

  const program = new Program(minimalIdl, provider);

  const [globalPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("global")], programId);
  const [poolPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("pool"), mint.toBuffer()], programId);
  const [solVaultPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("sol_vault"), mint.toBuffer()], programId);
  const [userStatsPda] = web3.PublicKey.findProgramAddressSync([Buffer.from("user_stats"), wallet.publicKey.toBuffer(), mint.toBuffer()], programId);
  
  const tokenVault = await getAssociatedTokenAddress(mint, poolPda, true);
  const buyerTokenAccount = await getAssociatedTokenAddress(mint, wallet.publicKey);

  console.log("Global PDA:", globalPda.toBase58());
  console.log("Pool PDA:", poolPda.toBase58());
  console.log("Buyer Token Account:", buyerTokenAccount.toBase58());

  console.log("Buying tokens...");
  try {
    const tx = await program.methods
      .buy(new BN(0.01 * web3.LAMPORTS_PER_SOL), new BN(0), null)
      .accounts({
        global: globalPda,
        pool: poolPda,
        mint: mint,
        tokenVault: tokenVault,
        solVault: solVaultPda,
        buyerTokenAccount: buyerTokenAccount,
        userStats: userStatsPda,
        buyer: wallet.publicKey,
        treasury: TREASURY_PUBKEY,
        creatorWallet: wallet.publicKey, // In this test, buyer = creator
        referrer: TREASURY_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log("Tokens bought! TX:", tx);
  } catch (err) {
    console.error("Error buying tokens:", err);
  }
}

main();
