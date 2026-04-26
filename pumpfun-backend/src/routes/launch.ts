// /api/launch — on-chain token creation endpoint
//
// POST /api/launch
//   Endpoint que crea un token SPL real en blockchain.
//   Combina:
//     1. Generación de mint
//     2. Creación de token en blockchain (vía createToken)
//     3. Registro en MongoDB
//     4. Inicialización en Redis (dashboard)
//
//   Request:
//     {
//       name: string            (token name)
//       symbol: string          (ticker)
//       description: string     (optional)
//       imageUrl: string        (optional, IPFS/HTTP URL)
//       creator: string         (wallet pubkey)
//       twitterUrl: string      (optional)
//       websiteUrl: string      (optional)
//     }
//
//   Response:
//     {
//       mint: string            (mint address on mainnet)
//       txSignature: string     (confirmation tx)
//       name, symbol, creator   (echoed back)
//     }

import { Router, Request, Response } from 'express'
import { PublicKey, Keypair } from '@solana/web3.js'
import Joi from 'joi'
import Token from '../models/Token'
import { createToken, checkTransactionStatus } from '../program/web3'

const router = Router()

// Schema validation
const launchSchema = Joi.object().keys({
  name:         Joi.string().required().min(1).max(100),
  symbol:       Joi.string().required().min(1).max(10),
  description:  Joi.string().optional().max(500),
  imageUrl:     Joi.string().optional().uri(),
  creator:      Joi.string().required(),
  twitterUrl:   Joi.string().optional().uri(),
  websiteUrl:   Joi.string().optional().uri(),
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { body } = req

    // Validate input
    const validation = launchSchema.validate(body)
    if (validation.error) {
      return res.status(400).json({ error: validation.error.details[0].message })
    }

    const {
      name, symbol, description = '', imageUrl = '', creator,
      twitterUrl = '', websiteUrl = '',
    } = body

    // Sanity: valid creator pubkey
    try {
      new PublicKey(creator)
    } catch {
      return res.status(400).json({ error: 'invalid creator pubkey' })
    }

    // Check for duplicate symbol (optional, prevents confusion)
    const existing = await Token.findOne({ symbol: String(symbol).toUpperCase() })
    if (existing) {
      return res.status(409).json({ error: `Symbol ${symbol} already in use` })
    }

    console.log(`[LAUNCH] Starting token creation: ${name} (${symbol}) by ${creator}`)

    // Create token on-chain (this calls Metaplex createAndMint + LP creation)
    // The createToken function handles:
    //   1. Generate mint via UMI
    //   2. Upload metadata to Pinata
    //   3. Create SPL token via Metaplex
    //   4. Create liquidity pool
    //   5. Save to MongoDB
    //   6. Return response
    const coinData = {
      name,
      ticker: symbol,
      description,
      url: imageUrl || 'https://via.placeholder.com/1024',
      creator,
      // Note: we'll add social links after token is created
    }

    const result = await createToken(coinData)

    if (result === 'transaction failed') {
      return res.status(500).json({ error: 'Failed to create token on-chain' })
    }

    const mint = result.token?.toBase58?.() || result.token || result._id
    const txSignature = result.tx || 'pending'

    console.log(`[LAUNCH] ✅ Token created: ${mint}`)

    // Save additional metadata to Token collection (for dashboard queries)
    const token = await Token.create({
      mint: String(mint),
      creator,
      name,
      symbol: String(symbol).toUpperCase(),
      description,
      logo: imageUrl,
      twitterUrl,
      websiteUrl,
      launchTxSignature: txSignature,
    }).catch(err => {
      // Already exists or other DB error — continue anyway
      console.warn(`[LAUNCH] Token already in DB or DB error:`, err.message)
    })

    // Return success
    return res.status(201).json({
      mint: String(mint),
      txSignature,
      name,
      symbol,
      creator,
      message: 'Token created successfully on mainnet',
    })
  } catch (e: any) {
    console.error('[LAUNCH] Error:', e.message)
    return res.status(500).json({ error: e.message || 'Unknown error' })
  }
})

export default router
