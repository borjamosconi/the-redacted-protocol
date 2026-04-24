'use client'

import { PublicKey } from '@solana/web3.js'

const getEnv = (name: string) => {
  if (typeof process === 'undefined') return ''
  return (process.env[name] ?? '').trim()
}

export const RDX_PUBLIC_ENV = {
  treasuryWallet: getEnv('NEXT_PUBLIC_RDX_TREASURY_WALLET'),
  airdropWallet: getEnv('NEXT_PUBLIC_RDX_AIRDROP_WALLET'),
  mainAuthority: getEnv('NEXT_PUBLIC_RDX_MAIN_AUTHORITY'),
  factoryProgram: getEnv('NEXT_PUBLIC_RDX_FACTORY_PROGRAM'),
  tokenMint: getEnv('NEXT_PUBLIC_RDX_TOKEN_MINT'),
} as const

export function toPublicKey(value: string): PublicKey | null {
  if (!value) return null

  try {
    return new PublicKey(value)
  } catch {
    return null
  }
}

export const RDX_PUBLIC_KEYS = {
  treasuryWallet: toPublicKey(RDX_PUBLIC_ENV.treasuryWallet),
  airdropWallet: toPublicKey(RDX_PUBLIC_ENV.airdropWallet),
  mainAuthority: toPublicKey(RDX_PUBLIC_ENV.mainAuthority),
  factoryProgram: toPublicKey(RDX_PUBLIC_ENV.factoryProgram),
  tokenMint: toPublicKey(RDX_PUBLIC_ENV.tokenMint),
} as const

export const RDX_PUBLIC_ADDRESSES = {
  treasuryWallet: RDX_PUBLIC_ENV.treasuryWallet,
  airdropWallet: RDX_PUBLIC_ENV.airdropWallet,
  mainAuthority: RDX_PUBLIC_ENV.mainAuthority,
  factoryProgram: RDX_PUBLIC_ENV.factoryProgram,
  tokenMint: RDX_PUBLIC_ENV.tokenMint,
} as const

export function isValidPublicKey(value: string): boolean {
  return toPublicKey(value) !== null
}
