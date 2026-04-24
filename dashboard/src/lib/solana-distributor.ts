// Server-only module — never import from client components
// Handles RDX token distribution from a hot wallet keypair

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
} from '@solana/web3.js'
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
  getMint,
} from '@solana/spl-token'

// ── Constants ────────────────────────────────────────────────────────────────

const VAULT = 'BWhHF85ZNoR3x7GhoxhXEK6C4bBZvCyMFDZfMWNRXiME'
const RDX_DECIMALS = 9

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Decode a base58 string to a Uint8Array without importing bs58 at module level */
function decodeBase58(str: string): Uint8Array {
  // bs58 is available as a transitive dependency of @solana/web3.js
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bs58 = require('bs58') as { decode: (s: string) => Uint8Array }
  return bs58.decode(str)
}

// ── Exported singletons ──────────────────────────────────────────────────────

/**
 * Returns a Keypair from DISTRIBUTOR_KEYPAIR env var (base58-encoded 64-byte secret key).
 * Returns null if the env var is missing or invalid — callers must handle gracefully.
 */
export function getDistributorKeypair(): Keypair | null {
  const raw = process.env.DISTRIBUTOR_KEYPAIR?.trim()
  if (!raw) return null
  try {
    const secret = decodeBase58(raw)
    return Keypair.fromSecretKey(secret)
  } catch {
    console.error('[solana-distributor] Invalid DISTRIBUTOR_KEYPAIR — could not decode base58')
    return null
  }
}

/**
 * Returns the RDX token mint PublicKey from RDX_TOKEN_MINT env var.
 * Returns null when the token has not been deployed yet.
 */
export function getRdxMint(): PublicKey | null {
  const raw = process.env.RDX_TOKEN_MINT?.trim()
  if (!raw) return null
  try {
    return new PublicKey(raw)
  } catch {
    console.error('[solana-distributor] Invalid RDX_TOKEN_MINT — not a valid public key')
    return null
  }
}

/**
 * Returns a Solana Connection using server-side env vars with fallback to the
 * public Next.js env var.
 */
export function getConnection(): Connection {
  const rpc =
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    'https://api.mainnet-beta.solana.com'
  return new Connection(rpc, 'confirmed')
}

// ── On-chain verification ────────────────────────────────────────────────────

/**
 * Verifies that a transaction on-chain:
 *  - Exists and is confirmed
 *  - Contains a SystemProgram.transfer instruction
 *  - Sender matches `expectedPayer`
 *  - Recipient is the vault
 *  - Lamports transferred >= expectedLamports * 0.99 (1% slippage tolerance)
 */
export async function verifyVaultPayment(
  txSignature: string,
  expectedPayer: string,
  expectedLamports: number,
): Promise<boolean> {
  try {
    const connection = getConnection()
    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })

    if (!tx) {
      console.warn('[verifyVaultPayment] Transaction not found:', txSignature)
      return false
    }

    if (tx.meta?.err) {
      console.warn('[verifyVaultPayment] Transaction has error:', tx.meta.err)
      return false
    }

    // Decode account keys — handle both legacy and versioned transactions
    let accountKeys: PublicKey[]
    if ('transaction' in tx && tx.transaction) {
      const txData = tx.transaction as {
        message: {
          accountKeys?: PublicKey[]
          staticAccountKeys?: PublicKey[]
          getAccountKeys?: () => { staticAccountKeys: PublicKey[] }
        }
      }
      const msg = txData.message
      if (msg.accountKeys) {
        accountKeys = msg.accountKeys
      } else if (msg.staticAccountKeys) {
        accountKeys = msg.staticAccountKeys
      } else if (typeof msg.getAccountKeys === 'function') {
        accountKeys = msg.getAccountKeys().staticAccountKeys
      } else {
        console.warn('[verifyVaultPayment] Cannot decode account keys')
        return false
      }
    } else {
      console.warn('[verifyVaultPayment] Unexpected transaction shape')
      return false
    }

    // Locate a SystemProgram.transfer instruction matching our criteria
    const txData = tx.transaction as {
      message: { instructions: Array<{ programIdIndex: number; accounts: number[]; data: string }> }
    }
    const instructions = txData.message.instructions

    const SYSTEM_PROGRAM_ID = SystemProgram.programId.toString()
    const vaultStr = VAULT
    const payerStr = expectedPayer
    const minLamports = Math.floor(expectedLamports * 0.99)

    for (const ix of instructions) {
      const programId = accountKeys[ix.programIdIndex]?.toString()
      if (programId !== SYSTEM_PROGRAM_ID) continue

      // SystemProgram.transfer instruction layout:
      //   instruction index (4 bytes, LE) = 2
      //   lamports (8 bytes, LE)
      const dataBytes = Buffer.from(decodeBase58(ix.data))
      if (dataBytes.length < 12) continue
      const ixIndex = dataBytes.readUInt32LE(0)
      if (ixIndex !== 2) continue // 2 = Transfer

      const lamports = Number(dataBytes.readBigUInt64LE(4))

      const fromPubkey = accountKeys[ix.accounts[0]]?.toString()
      const toPubkey   = accountKeys[ix.accounts[1]]?.toString()

      if (
        fromPubkey === payerStr &&
        toPubkey   === vaultStr &&
        lamports   >= minLamports
      ) {
        return true
      }
    }

    // Fallback: check pre/post balances for vault credit
    // (handles multi-instruction txs or wrapped transfers)
    const vaultIndex = accountKeys.findIndex((k) => k.toString() === vaultStr)
    const payerIndex = accountKeys.findIndex((k) => k.toString() === payerStr)

    if (vaultIndex !== -1 && payerIndex !== -1 && tx.meta) {
      const preVault  = tx.meta.preBalances[vaultIndex]  ?? 0
      const postVault = tx.meta.postBalances[vaultIndex] ?? 0
      const delta = postVault - preVault
      if (delta >= minLamports) {
        return true
      }
    }

    console.warn('[verifyVaultPayment] No matching transfer found in tx:', txSignature)
    return false
  } catch (err) {
    console.error('[verifyVaultPayment] Error verifying tx:', err)
    return false
  }
}

// ── Token distribution ───────────────────────────────────────────────────────

/**
 * Sends `tokenAmount` raw RDX (already includes 9 decimals) from the distributor
 * wallet's ATA to `recipientWallet`'s ATA, creating the ATA if needed.
 *
 * Returns the transaction signature on success.
 * Throws a descriptive error when the distributor is not configured or the mint
 * is not deployed.
 */
export async function sendRdxToWallet(
  recipientWallet: string,
  tokenAmount: bigint,
): Promise<string> {
  const distributor = getDistributorKeypair()
  if (!distributor) {
    throw new Error(
      'Distributor keypair not configured. Set DISTRIBUTOR_KEYPAIR env var.',
    )
  }

  const mint = getRdxMint()
  if (!mint) {
    throw new Error(
      'RDX token mint not configured. Set RDX_TOKEN_MINT env var after token deployment.',
    )
  }

  if (tokenAmount <= BigInt(0)) {
    throw new Error('tokenAmount must be > 0')
  }

  const connection = getConnection()
  const recipient  = new PublicKey(recipientWallet)

  // Get or create distributor's ATA
  const distributorAta = await getOrCreateAssociatedTokenAccount(
    connection,
    distributor,
    mint,
    distributor.publicKey,
  )

  // Get or create recipient's ATA (distributor pays for creation)
  const recipientAta = await getOrCreateAssociatedTokenAccount(
    connection,
    distributor,
    mint,
    recipient,
  )

  // Transfer tokens
  const txSig = await transfer(
    connection,
    distributor,
    distributorAta.address,
    recipientAta.address,
    distributor,
    tokenAmount,
  )

  return txSig
}
