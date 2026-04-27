/**
 * Server-only SPL token service.
 *
 * NEVER import this from a client component. The mint authority's secret key
 * lives in process.env.MINT_AUTHORITY_KEYPAIR_BASE58 and must stay on the
 * server. Next.js will refuse to bundle this into the client because we
 * import 'fs'-free Node modules and read env at call time.
 *
 * Two operations:
 *   - createSplToken: spawns a brand-new SPL mint with the platform as mint
 *     authority. The mint is real on-chain and shows up in any wallet.
 *   - mintSplTo: idempotent helper that ensures the recipient has an
 *     associated token account, then mints `amount` atomic units.
 *
 * Token metadata (Metaplex name + logo) is intentionally NOT created here in
 * v1 — Phantom will show "Unknown Token" with the raw mint pubkey. We'll
 * follow up with mpl-token-metadata once the rest of the flow is verified
 * end-to-end against mainnet.
 */

import {
  Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction,
} from '@solana/web3.js'
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token'
import { SystemProgram } from '@solana/web3.js'
import bs58 from 'bs58'

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || process.env.NEXT_PUBLIC_SOLANA_RPC
  || 'https://solana-rpc.publicnode.com'

let _connection: Connection | null = null
function conn(): Connection {
  if (!_connection) _connection = new Connection(RPC, 'confirmed')
  return _connection
}

let _authority: Keypair | null = null
function authority(): Keypair {
  if (_authority) return _authority
  const b58 = process.env.MINT_AUTHORITY_KEYPAIR_BASE58
  if (!b58) throw new Error('MINT_AUTHORITY_KEYPAIR_BASE58 env not set — server cannot mint')
  _authority = Keypair.fromSecretKey(bs58.decode(b58))
  return _authority
}

export function getMintAuthorityPubkey(): string {
  return authority().publicKey.toBase58()
}

// ── Create a brand-new SPL mint ────────────────────────────────────────────
export async function createSplToken(opts: {
  decimals?: number       // default 9 (Solana convention)
  initialSupply?: bigint  // raw atomic units, minted to the authority
}): Promise<{ mint: string, signature: string }> {
  const decimals = opts.decimals ?? 9
  const auth     = authority()
  const c        = conn()
  const mintKp   = Keypair.generate()
  const lamportsForMint = await getMinimumBalanceForRentExemptMint(c)

  const tx = new Transaction()
  // 1. Allocate the mint account
  tx.add(SystemProgram.createAccount({
    fromPubkey: auth.publicKey,
    newAccountPubkey: mintKp.publicKey,
    space: MINT_SIZE,
    lamports: lamportsForMint,
    programId: TOKEN_PROGRAM_ID,
  }))
  // 2. Initialize as SPL mint with our authority
  tx.add(createInitializeMintInstruction(
    mintKp.publicKey,
    decimals,
    auth.publicKey,    // mint authority
    auth.publicKey,    // freeze authority — same wallet for now
  ))

  // 3. Optionally mint initial supply to the authority's ATA
  let ata: PublicKey | null = null
  if (opts.initialSupply && opts.initialSupply > 0n) {
    ata = getAssociatedTokenAddressSync(mintKp.publicKey, auth.publicKey)
    tx.add(createAssociatedTokenAccountInstruction(
      auth.publicKey, ata, auth.publicKey, mintKp.publicKey,
    ))
    tx.add(createMintToInstruction(mintKp.publicKey, ata, auth.publicKey, opts.initialSupply))
  }

  const signature = await sendAndConfirmTransaction(c, tx, [auth, mintKp], {
    commitment: 'confirmed',
  })
  return { mint: mintKp.publicKey.toBase58(), signature }
}

// ── Mint to an arbitrary recipient ─────────────────────────────────────────
export async function mintSplTo(opts: {
  mint:      string | PublicKey
  recipient: string | PublicKey
  amount:    bigint   // raw atomic units (caller multiplies by 10^decimals)
}): Promise<{ signature: string, ata: string }> {
  const auth = authority()
  const c    = conn()
  const mintPk      = typeof opts.mint      === 'string' ? new PublicKey(opts.mint)      : opts.mint
  const recipientPk = typeof opts.recipient === 'string' ? new PublicKey(opts.recipient) : opts.recipient

  // Verify mint exists and we control it. If not, throw — never silently
  // mint into a mint we don't own (cryptographically impossible anyway).
  let mintInfo
  try { mintInfo = await getMint(c, mintPk) } catch (e: any) {
    throw new Error(`Mint ${mintPk.toBase58()} not found on chain: ${e.message}`)
  }
  if (!mintInfo.mintAuthority || !mintInfo.mintAuthority.equals(auth.publicKey)) {
    throw new Error(`Mint ${mintPk.toBase58()} is not owned by our authority`)
  }

  const ata = getAssociatedTokenAddressSync(mintPk, recipientPk, false)
  const ataInfo = await c.getAccountInfo(ata)

  const tx = new Transaction()
  if (!ataInfo) {
    tx.add(createAssociatedTokenAccountInstruction(
      auth.publicKey,   // payer (we cover the rent so user has zero friction)
      ata,
      recipientPk,
      mintPk,
    ))
  }
  tx.add(createMintToInstruction(mintPk, ata, auth.publicKey, opts.amount))

  const signature = await sendAndConfirmTransaction(c, tx, [auth], {
    commitment: 'confirmed',
  })
  return { signature, ata: ata.toBase58() }
}

// ── Read user's on-chain balance ───────────────────────────────────────────
export async function getSplBalance(mint: string, owner: string): Promise<bigint> {
  const c = conn()
  const ata = getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner))
  const info = await c.getTokenAccountBalance(ata).catch(() => null)
  if (!info?.value) return 0n
  return BigInt(info.value.amount)
}
