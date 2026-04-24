import { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getOrCreateAssociatedTokenAccount,
  createMintToInstruction,
  setAuthority,
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createSetAuthorityInstruction
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════
// REDACTED PROTOCOL — Official Token Launch Script
// ═══════════════════════════════════════════════════

// --- WALLET CONFIGURATION ---
const WALLETS = {
  MAIN:     'HjqNchH7bsvgi1gSo9m3wbUasmQT1TaaRbJduDQ5uyPw', // Authority & LP
  TREASURY: 'H4C2GpF5QLFCaY1ZSLsnnA34E1TXG6nYViQLAkNKXMeu', // Team + Treasury + Fee collector
  AIRDROP:  'CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8', // Airdrop distribution
};

// --- TOKENOMICS (1,000,000,000 RDX) ---
const TOTAL_SUPPLY =     1_000_000_000n;
const DECIMALS = 9;
const MULT = BigInt(10 ** DECIMALS);

const DISTRIBUTION = {
  AIRDROP:   400_000_000n, // 40% → Airdrop wallet
  TEAM:      200_000_000n, // 20% → Treasury/Team wallet
  LIQUIDITY: 200_000_000n, // 20% → Main wallet (LP prep)
  STAKING:   100_000_000n, // 10% → Main wallet (staking pool)
  DAO:       100_000_000n, // 10% → Treasury wallet (DAO governed)
};

// --- RPC ---
const RPC_URL = 'https://api.mainnet-beta.solana.com'; // ← MAINNET

async function main() {
  console.log('🔴 REDACTED PROTOCOL — Token Launch');
  console.log('=====================================');

  const walletPath = path.join(process.env.USERPROFILE || '', '.config', 'solana', 'id.json');
  const secretKey = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log(`📡 Network:  MAINNET`);
  console.log(`🔑 Payer:    ${payer.publicKey.toBase58()}`);

  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Balance:  ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    throw new Error('Saldo insuficiente. Necesitas al menos 0.05 SOL para el despliegue.');
  }

  // 1. Create Mint Keypair
  const mintKeypair = Keypair.generate();
  console.log(`\n🔨 Nuevo Mint: ${mintKeypair.publicKey.toBase58()}`);

  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx1 = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mintKeypair.publicKey, DECIMALS, payer.publicKey, payer.publicKey)
  );

  const sig1 = await connection.sendTransaction(tx1, [payer, mintKeypair]);
  await connection.confirmTransaction(sig1, 'confirmed');
  console.log('✅ Mint creado:', sig1);

  // Helper: create ATA + mint
  async function mintToWallet(dest: string, amount: bigint, label: string) {
    const destPubkey = new PublicKey(dest);
    const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, destPubkey);
    
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(payer.publicKey, ata, destPubkey, mintKeypair.publicKey),
      createMintToInstruction(mintKeypair.publicKey, ata, payer.publicKey, amount * MULT)
    );
    const sig = await connection.sendTransaction(tx, [payer]);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log(`✅ [${label}] ${amount.toLocaleString()} RDX → ${dest.slice(0, 8)}...`);
  }

  console.log('\n📦 Distribuyendo tokens...');
  await mintToWallet(WALLETS.AIRDROP,   DISTRIBUTION.AIRDROP,   'AIRDROP  40%');
  await mintToWallet(WALLETS.TREASURY,  DISTRIBUTION.TEAM,      'TEAM     20%');
  await mintToWallet(WALLETS.MAIN,      DISTRIBUTION.LIQUIDITY, 'LIQUIDITY 20%');
  await mintToWallet(WALLETS.MAIN,      DISTRIBUTION.STAKING,   'STAKING  10%');
  await mintToWallet(WALLETS.TREASURY,  DISTRIBUTION.DAO,       'DAO      10%');

  // Revoke Mint Authority
  console.log('\n🔒 Renunciando autoridad de acuñación...');
  const tx2 = new Transaction().add(
    createSetAuthorityInstruction(mintKeypair.publicKey, payer.publicKey, AuthorityType.MintTokens, null)
  );
  const sig2 = await connection.sendTransaction(tx2, [payer]);
  await connection.confirmTransaction(sig2, 'confirmed');
  console.log('✅ Mint Authority: NULL (suministro fijo para siempre)');

  console.log('\n🚀 LANZAMIENTO COMPLETADO');
  console.log('═══════════════════════════════════════════');
  console.log(`TOKEN MINT:    ${mintKeypair.publicKey.toBase58()}`);
  console.log(`SUPPLY:        1,000,000,000 RDX`);
  console.log(`DECIMALS:      9`);
  console.log('═══════════════════════════════════════════');
  console.log('GUARDA ESTA DIRECCIÓN DEL MINT EN VERCEL ENV:');
  console.log(`NEXT_PUBLIC_RDX_MINT=${mintKeypair.publicKey.toBase58()}`);
}

main().catch(console.error);
