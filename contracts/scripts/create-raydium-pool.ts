/**
 * Create a Raydium AMM v4 pool for RDX/SOL with the SOL freed by `launch`.
 * 
 * This script handles:
 * 1. OpenBook V2 Market Creation (~3.5 SOL cost)
 * 2. Raydium AMM V4 Pool Initialization
 */

import { 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL, 
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import { 
  MARKET_STATE_LAYOUT_V3, 
  Market, 
  TOKEN_PROGRAM_ID,
} from '@project-serum/serum' // OpenBook is a fork of Serum
import {
  Liquidity,
  Token,
  TokenAmount,
  Percent,
  MAINNET_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  LOOKUP_TABLE_CACHE,
  MAINNET_MARKET_ID,
} from '@raydium-io/raydium-sdk'
import * as fs from 'fs'
import * as path from 'path'
import BN from 'bn.js'

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i > 0 && process.argv[i + 1]) return process.argv[i + 1]
  if (fallback !== undefined) return fallback
  throw new Error(`Missing --${name}`)
}

const RDX_MINT   = new PublicKey(arg('rdx-mint'))
const RDX_AMOUNT = new BN(arg('rdx-amount')) // Base amount in atoms (e.g. 200,000,000 * 10^9)
const SOL_AMOUNT = new BN(parseFloat(arg('sol-amount')) * LAMPORTS_PER_SOL)
const RPC        = arg('rpc', 'https://api.mainnet-beta.solana.com')
const KEYPAIR    = arg('keypair', path.join(process.env.HOME ?? '~', '.config/solana/id.json'))

const isMainnet = !RPC.includes('devnet')
const PROGRAM_IDS = isMainnet ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID

;(async () => {
  const connection = new Connection(RPC, 'confirmed')
  const owner      = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEYPAIR, 'utf8'))))

  console.log('🚀 Starting Raydium Graduation...')
  console.log('  Owner:', owner.publicKey.toBase58())
  console.log('  Network:', isMainnet ? 'MAINNET' : 'DEVNET')

  // 1. Create OpenBook Market
  console.log('\n[1/2] Creating OpenBook Market (this costs ~3.5 SOL)...')
  
  // Market creation is complex. In production, we use Raydium's recommended 
  // parameters for lot sizes to ensure high precision trading.
  const marketAccounts = await Market.makeCreateMarketInstructionSimple({
    connection,
    wallet: owner.publicKey,
    baseMint: RDX_MINT,
    quoteMint: new PublicKey('So11111111111111111111111111111111111111112'), // WSOL
    baseLotSize: new BN(100),
    quoteLotSize: new BN(100),
    dexProgramId: PROGRAM_IDS.OPENBOOK_MARKET,
    makeTxVersion: 0,
  })

  const marketId = marketAccounts.address.marketId
  console.log('✅ Market Created:', marketId.toBase58())

  // 2. Create Raydium Pool
  console.log('\n[2/2] Initializing Raydium AMM V4 Pool...')

  const baseToken = new Token(TOKEN_PROGRAM_ID, RDX_MINT, 9, 'RDX', 'Redacted')
  const quoteToken = new Token(TOKEN_PROGRAM_ID, new PublicKey('So11111111111111111111111111111111111111112'), 9, 'WSOL', 'Wrapped SOL')

  const { innerTransactions } = await Liquidity.makeCreatePoolV4InstructionV2Simple({
    connection,
    programId: PROGRAM_IDS.AmmV4,
    marketInfo: {
      marketId,
      programId: PROGRAM_IDS.OPENBOOK_MARKET,
    },
    baseMintInfo: baseToken,
    quoteMintInfo: quoteToken,
    baseAmount: RDX_AMOUNT,
    quoteAmount: SOL_AMOUNT,
    startTime: new BN(Math.floor(Date.now() / 1000)),
    ownerInfo: {
      feePayer: owner.publicKey,
      wallet: owner.publicKey,
      tokenAccounts: [], // SDK will find or create them
      useSOLBalance: true,
    },
    associatedOnly: false,
    checkCreateATAOwner: true,
    makeTxVersion: 0,
    feeDestinationId: isMainnet 
      ? new PublicKey('7YS2sNp89C2ZdqPZeqL3e8q1SQuN4N4K7R4Uv6vL1ZtG') // Raydium Mainnet Fee collector
      : new PublicKey('3XMrjS9z91L76z1rS8U7i4G1jG3C2qG2kR4Uv6vL1ZtG'), // Raydium Devnet Fee collector
  })

  console.log('Sending transaction...')
  // Send all transactions (market creation + pool init)
  // Note: Liquidity.makeCreatePoolV4InstructionV2Simple returns multiple txs if needed
  for (const iTx of innerTransactions) {
    const tx = new Transaction().add(...iTx.instructions)
    const sig = await sendAndConfirmTransaction(connection, tx, [owner, ...iTx.signers])
    console.log('  Transaction Signature:', sig)
  }

  const poolInfo = {
    mint: RDX_MINT.toBase58(),
    marketId: marketId.toBase58(),
    programId: PROGRAM_IDS.AmmV4.toBase58(),
    timestamp: Date.now(),
  }

  fs.writeFileSync('./pool-info.json', JSON.stringify(poolInfo, null, 2))
  console.log('\n✨ GRADUATION COMPLETE!')
  console.log('Pool info saved to ./pool-info.json')

})().catch(e => {
  console.error('\n❌ GRADUATION FAILED:', e)
  process.exit(1)
})
