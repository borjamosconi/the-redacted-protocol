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
const WALLET_PATH = path.join(process.env.USERPROFILE || '', '.config', 'solana', 'id.json');
const RPC_URL = "https://api.devnet.solana.com"; 
const TOTAL_SUPPLY = 1000000000;
const DECIMALS = 9;

async function launchToken() {
  console.log("🔴 INICIANDO LANZAMIENTO DE $RDX (JS MODE)...");
  
  const secretKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log(`📡 Conectado a: ${RPC_URL}`);
  console.log(`🔑 Usando Wallet: ${payer.publicKey.toBase58()}`);

  const mint = await createMint(connection, payer, payer.publicKey, payer.publicKey, DECIMALS);
  console.log(`✅ Token Mint Creado: ${mint.toBase58()}`);

  const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  const amount = BigInt(TOTAL_SUPPLY) * BigInt(10 ** DECIMALS);
  await mintTo(connection, payer, mint, ata.address, payer, amount);
  console.log("✅ Suministro acuñado.");

  await setAuthority(connection, payer, mint, payer.publicKey, AuthorityType.MintTokens, null);
  console.log("✅ Autoridad eliminada.");
  console.log(`FINAL_MINT_ADDRESS: ${mint.toBase58()}`);
}

launchToken().catch(console.error);
