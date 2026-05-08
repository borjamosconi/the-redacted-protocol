import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction 
} from '@solana/web3.js'
import { 
  getOrCreateAssociatedTokenAccount, 
  createTransferInstruction 
} from '@solana/spl-token'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import bs58 from 'bs58'

dotenv.config()

// Config
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
const TOKEN_MINT = new PublicKey(process.env.NEXT_PUBLIC_RDX_TOKEN_MINT || '')
const BATCH_SIZE = 5 // Low batch size to ensure success on public RPCs

async function distribute() {
  const connection = new Connection(RPC_URL, 'confirmed')
  
  // Load Payer (Airdrop Authority)
  if (!process.env.AIRDROP_PRIVATE_KEY) {
    throw new Error('AIRDROP_PRIVATE_KEY missing in .env')
  }
  const payer = Keypair.fromSecretKey(bs58.decode(process.env.AIRDROP_PRIVATE_KEY))
  
  console.log(`🚀 Starting distribution from: ${payer.publicKey.toBase58()}`)
  console.log(`🪙 Token: ${TOKEN_MINT.toBase58()}`)
  
  const snapshotPath = path.join(process.cwd(), 'airdrop-snapshot.json')
  if (!fs.existsSync(snapshotPath)) {
    throw new Error('airdrop-snapshot.json not found. Run snapshot script first.')
  }
  
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  console.log(`📦 Loaded ${snapshot.length} recipients.`)

  // Get payer's token account
  const payerAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    TOKEN_MINT,
    payer.publicKey
  )

  for (let i = 0; i < snapshot.length; i++) {
    const item = snapshot[i]
    console.log(`[${i+1}/${snapshot.length}] Processing ${item.wallet} (${item.amountFormatted} RDX)...`)
    
    try {
      const recipient = new PublicKey(item.wallet)
      
      // Get or create recipient ATA
      const recipientAta = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        TOKEN_MINT,
        recipient
      )
      
      const tx = new Transaction().add(
        createTransferInstruction(
          payerAta.address,
          recipientAta.address,
          payer.publicKey,
          BigInt(item.amountRaw)
        )
      )
      
      const sig = await sendAndConfirmTransaction(connection, tx, [payer])
      console.log(`   ✅ Success! Tx: ${sig}`)
      
      // Log progress to avoid double spending if script crashes
      fs.appendFileSync('airdrop-history.log', `${new Date().toISOString()} | ${item.wallet} | ${item.amountRaw} | ${sig}\n`)
      
    } catch (err: any) {
      console.error(`   ❌ Failed for ${item.wallet}: ${err.message}`)
      fs.appendFileSync('airdrop-errors.log', `${new Date().toISOString()} | ${item.wallet} | ${item.amountRaw} | ${err.message}\n`)
    }
  }
  
  console.log('🏁 Distribution finished.')
}

distribute().catch(console.error)
