import 'dotenv/config'
import { Keypair, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'

function req(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing required env: ${key}`)
  return v
}

function opt(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

export const config = {
  port:                     Number(process.env.PORT) || 5000,
  corsOrigin:               opt('CORS_ORIGIN', 'http://localhost:3000').split(','),
  jwtSecret:                opt('JWT_SECRET', 'change-me'),

  mongoUri:                 opt('MONGODB_URI', 'mongodb://localhost:27017/redacted'),

  rpcUrl:                   opt('SOLANA_RPC', 'https://api.mainnet-beta.solana.com'),
  cluster:                  opt('SOLANA_CLUSTER', 'mainnet-beta'),

  programIds: {
    bondingCurve:  opt('RD_BONDINGCURVE_PROGRAM_ID', 'BCurve1111111111111111111111111111111111111'),
    token:         opt('RD_TOKEN_PROGRAM_ID',        'CPLCsPQJrfWQgacJEq1QcbwoMcJocbEhjGVmJLPhs38Z'),
    treasury:      opt('RD_TREASURY_PROGRAM_ID',     'HpvmQtmxyPeeYKGvKHqEdcnsYUzAQrdynoCX452s2xLz'),
    presale:       opt('RD_PRESALE_PROGRAM_ID',      'HACK1L8hdDN1wuhV5mEbNYGeMXjhFzvz3HNvDTCdFP2a'),
  },

  treasuryPubkey:           opt('TREASURY_PUBKEY', 'CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8'),
  migrationAuthorityPubkey: opt('MIGRATION_AUTHORITY_PUBKEY'),

  pinataJwt:                opt('PINATA_JWT'),
  pinataGateway:            opt('PINATA_GATEWAY_URL', 'https://gateway.pinata.cloud/ipfs'),
}

/** Load admin signer from ADMIN_PRIVATE_KEY (base58). Lazy + cached. */
let _adminKp: Keypair | null = null
export function getAdminKeypair(): Keypair {
  if (_adminKp) return _adminKp
  const sk = req('ADMIN_PRIVATE_KEY')
  _adminKp = Keypair.fromSecretKey(bs58.decode(sk))
  return _adminKp
}

export const BONDING_CURVE_PROGRAM_ID = new PublicKey(config.programIds.bondingCurve)
export const RD_TOKEN_PROGRAM_ID      = new PublicKey(config.programIds.token)
export const RD_TREASURY_PROGRAM_ID   = new PublicKey(config.programIds.treasury)
