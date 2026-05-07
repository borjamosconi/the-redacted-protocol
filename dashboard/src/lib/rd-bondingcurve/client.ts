// Client-side Anchor helpers for rd-bondingcurve.
//
// The dashboard uses these to build create_pool / buy / sell transactions
// that the user signs with Phantom (or any wallet-adapter wallet). PDAs mirror
// the on-chain seeds in contracts/programs/rd-bondingcurve/src/lib.rs.

import * as anchor from '@coral-xyz/anchor'
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor'
import {
  Connection, PublicKey, Transaction, SystemProgram, Keypair, Signer,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { IDL as BONDING_CURVE_IDL, BondingCurveIDL } from './idl'

// Public program & treasury identifiers — swapped post-deploy via env.
export const BONDING_CURVE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_RD_BONDINGCURVE_PROGRAM_ID || 'AfkwwBhRsuEzZo74mdbwK8EBwo7VYwc8S1T7hb1RHMAa'
)
export const TREASURY_PUBKEY = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_PUBKEY || 'CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8'
)

export const TOKEN_DECIMALS = 6
export const TOKEN_MULT = 1_000_000

// ── PDA helpers ────────────────────────────────────────────────────────────
export const globalPda = () =>
  PublicKey.findProgramAddressSync([Buffer.from('global')], BONDING_CURVE_PROGRAM_ID)
export const poolPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from('pool'), mint.toBuffer()], BONDING_CURVE_PROGRAM_ID)
export const solVaultPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from('sol_vault'), mint.toBuffer()], BONDING_CURVE_PROGRAM_ID)

// ── Browser-wallet Provider ─────────────────────────────────────────────────
/** A minimal Anchor wallet shim around wallet-adapter's publicKey + sign fns. */
export interface AnchorWalletLike {
  publicKey: PublicKey
  signTransaction: <T extends Transaction>(tx: T) => Promise<T>
  signAllTransactions: <T extends Transaction>(txs: T[]) => Promise<T[]>
}

export function getProgram(connection: Connection, wallet: AnchorWalletLike): Program<BondingCurveIDL> {
  const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
  // Anchor >=0.30: programId comes from IDL.address; constructor is (idl, provider).
  return new Program<BondingCurveIDL>(BONDING_CURVE_IDL as any, provider as any) as any
}

// ── Pool state ─────────────────────────────────────────────────────────────
export async function fetchPoolState(
  connection: Connection, wallet: AnchorWalletLike, mint: PublicKey,
): Promise<any | null> {
  const program = getProgram(connection, wallet)
  const [pool] = poolPda(mint)
  try {
    return await (program.account as any).poolState.fetch(pool)
  } catch {
    return null
  }
}

/** Constant-product quote: how many tokens `solIn` lamports buys right now. */
export function quoteBuy(pool: {
  virtualSolReserves: BN, virtualTokenReserves: BN, realTokenReserves: BN,
}, solIn: BN): BN {
  const k = pool.virtualSolReserves.mul(pool.virtualTokenReserves)
  const newSol = pool.virtualSolReserves.add(solIn)
  const newTokens = k.div(newSol)
  let out = pool.virtualTokenReserves.sub(newTokens)
  if (out.gt(pool.realTokenReserves)) out = pool.realTokenReserves
  return out
}

/** Inverse quote: how much SOL you get back for selling `tokensIn`. */
export function quoteSell(pool: {
  virtualSolReserves: BN, virtualTokenReserves: BN,
}, tokensIn: BN): BN {
  const k = pool.virtualSolReserves.mul(pool.virtualTokenReserves)
  const newTokens = pool.virtualTokenReserves.add(tokensIn)
  const newSol = k.div(newTokens)
  return pool.virtualSolReserves.sub(newSol)
}

// ── Instruction builders ───────────────────────────────────────────────────

/** Builds the create_pool transaction. Caller signs with wallet AND mintKeypair. */
export async function buildCreatePoolTx(
  connection: Connection,
  wallet: AnchorWalletLike,
  params: { mintKeypair: Keypair, name: string, symbol: string, uri: string },
): Promise<{ tx: Transaction, mintKeypair: Keypair, mint: PublicKey }> {
  const program = getProgram(connection, wallet)
  const mint = params.mintKeypair.publicKey
  const [global] = globalPda()
  const [pool] = poolPda(mint)
  const [solVault] = solVaultPda(mint)
  const poolTokenVault = getAssociatedTokenAddressSync(mint, pool, true)

  const ix = await program.methods
    .createPool(params.name, params.symbol, params.uri)
    .accounts({
      global, pool, mint,
      poolTokenVault, solVault,
      creator: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .instruction()

  const { blockhash } = await connection.getLatestBlockhash()
  const tx = new Transaction({ feePayer: wallet.publicKey, recentBlockhash: blockhash }).add(ix)
  // mint keypair must co-sign because we create_account for it
  tx.partialSign(params.mintKeypair)
  return { tx, mintKeypair: params.mintKeypair, mint }
}

/** Builds buy tx. `solIn` is lamports, `minTokensOut` is in base units (6 decimals). */
export async function buildBuyTx(
  connection: Connection,
  wallet: AnchorWalletLike,
  params: { mint: PublicKey, creatorWallet: PublicKey, solIn: BN, minTokensOut: BN },
): Promise<Transaction> {
  const program = getProgram(connection, wallet)
  const { mint, creatorWallet, solIn, minTokensOut } = params
  const [global] = globalPda()
  const [pool] = poolPda(mint)
  const [solVault] = solVaultPda(mint)
  const poolTokenVault = getAssociatedTokenAddressSync(mint, pool, true)
  const buyerTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey)

  const ix = await program.methods
    .buy(solIn, minTokensOut)
    .accounts({
      global, pool, mint,
      poolTokenVault, solVault,
      buyerTokenAccount,
      buyer: wallet.publicKey,
      treasury: TREASURY_PUBKEY,
      creatorWallet,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction()

  const { blockhash } = await connection.getLatestBlockhash()
  return new Transaction({ feePayer: wallet.publicKey, recentBlockhash: blockhash }).add(ix)
}

/** Builds sell tx. `tokensIn` in base units, `minSolOut` in lamports. */
export async function buildSellTx(
  connection: Connection,
  wallet: AnchorWalletLike,
  params: { mint: PublicKey, creatorWallet: PublicKey, tokensIn: BN, minSolOut: BN },
): Promise<Transaction> {
  const program = getProgram(connection, wallet)
  const { mint, creatorWallet, tokensIn, minSolOut } = params
  const [global] = globalPda()
  const [pool] = poolPda(mint)
  const [solVault] = solVaultPda(mint)
  const poolTokenVault = getAssociatedTokenAddressSync(mint, pool, true)
  const sellerTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey)

  const ix = await program.methods
    .sell(tokensIn, minSolOut)
    .accounts({
      global, pool, mint,
      poolTokenVault, solVault,
      sellerTokenAccount,
      seller: wallet.publicKey,
      treasury: TREASURY_PUBKEY,
      creatorWallet,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction()

  const { blockhash } = await connection.getLatestBlockhash()
  return new Transaction({ feePayer: wallet.publicKey, recentBlockhash: blockhash }).add(ix)
}

export { BN, Keypair }
