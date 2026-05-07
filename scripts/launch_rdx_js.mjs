import { 
  Connection, 
  Keypair, 
  PublicKey, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  setAuthority, 
  AuthorityType 
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Configuration ---
const WALLETS = {
  MAIN:     'HjqNchH7bsvgi1gSo9m3wbUasmQT1TaaRbJduDQ5uyPw', 
  TREASURY: 'CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8', 
  AIRDROP:  'H4C2GpF5QLFCaY1ZSLsnnA34E1TXG6nYViQLAkNKXMeu', 
};

const WALLET_PATH = path.join(process.cwd(), 'wallet.json');
const RPC_URL = "https://api.mainnet-beta.solana.com"; 
const DECIMALS = 9;
const MULT = BigInt(10 ** DECIMALS);

const DISTRIBUTION = {
  AIRDROP:   400_000_000n, // 40% → Airdrop wallet
  TEAM:      200_000_000n, // 20% → Treasury/Team wallet
  LIQUIDITY: 200_000_000n, // 20% → Main wallet (LP prep)
  STAKING:   100_000_000n, // 10% → Main wallet (staking pool)
  DAO:       100_000_000n, // 10% → Treasury wallet (DAO governed)
};

async function launchToken() {
  console.log("🔴 INICIANDO LANZAMIENTO DE $RDX (MAINNET)...");
  
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log(`📡 Conectado a: ${RPC_URL}`);
  console.log(`🔑 Usando Wallet: ${payer.publicKey.toBase58()}`);

  const mint = await createMint(connection, payer, payer.publicKey, payer.publicKey, DECIMALS);
  console.log(`✅ Token Mint Creado: ${mint.toBase58()}`);

  async function mintToWallet(dest, amount, label) {
    const destPubkey = new PublicKey(dest);
    const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, destPubkey);
    await mintTo(connection, payer, mint, ata.address, payer, amount * MULT);
    console.log(`✅ [${label}] ${amount.toLocaleString()} RDX → ${dest.slice(0, 8)}...`);
  }

  console.log('\n📦 Distribuyendo tokens...');
  await mintToWallet(WALLETS.AIRDROP,   DISTRIBUTION.AIRDROP,   'AIRDROP  40%');
  await mintToWallet(WALLETS.TREASURY,  DISTRIBUTION.TEAM,      'TEAM     20%');
  await mintToWallet(WALLETS.MAIN,      DISTRIBUTION.LIQUIDITY, 'LIQUIDITY 20%');
  await mintToWallet(WALLETS.MAIN,      DISTRIBUTION.STAKING,   'STAKING  10%');
  await mintToWallet(WALLETS.TREASURY,  DISTRIBUTION.DAO,       'DAO      10%');

  await setAuthority(connection, payer, mint, payer.publicKey, AuthorityType.MintTokens, null);
  console.log("✅ Autoridad de acuñación eliminada.");
  console.log(`FINAL_MINT_ADDRESS=${mint.toBase58()}`);
}

launchToken().catch(console.error);
