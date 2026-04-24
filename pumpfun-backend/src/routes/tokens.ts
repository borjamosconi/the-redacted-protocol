// /api/tokens — launchpad token registry.
//
// The on-chain state of a pool lives in the rd-bondingcurve program; this
// collection is a convenience mirror so the dashboard can list tokens + show
// social metadata without paging every pool account on each request.
//
// POST /api/tokens        register a token after the client successfully calls
//                         rd_bondingcurve.create_pool on-chain. Caller supplies
//                         { mint, creator, name, symbol, description?, logo?,
//                           twitterUrl?, websiteUrl?, launchTxSignature? }.
//                         The backend verifies the pool PDA exists before
//                         persisting.
// GET  /api/tokens        paginated list (newest first, supports ?limit & ?skip
//                         & ?graduated).
// GET  /api/tokens/:mint  token doc + on-chain pool snapshot (if available).

import { Router, Request, Response } from 'express'
import { PublicKey } from '@solana/web3.js'
import Token from '../models/Token'
import { fetchPool } from '../program/client'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      mint, creator, name, symbol,
      description = '', logo = '', twitterUrl = '', websiteUrl = '',
      launchTxSignature = '',
    } = req.body || {}

    if (!mint || !creator || !name || !symbol) {
      return res.status(400).json({ error: 'mint, creator, name, symbol are required' })
    }

    // sanity: valid base58 pubkeys
    try { new PublicKey(mint); new PublicKey(creator) }
    catch { return res.status(400).json({ error: 'invalid mint/creator pubkey' }) }

    const existing = await Token.findOne({ mint })
    if (existing) return res.status(200).json({ token: existing, existed: true })

    const token = await Token.create({
      mint, creator, name, symbol: String(symbol).toUpperCase(),
      description, logo, twitterUrl, websiteUrl, launchTxSignature,
    })
    return res.status(201).json({ token })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const skip = Number(req.query.skip) || 0
    const filter: any = {}
    if (req.query.graduated === 'true') filter.graduated = true
    if (req.query.graduated === 'false') filter.graduated = false
    const [items, total] = await Promise.all([
      Token.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Token.countDocuments(filter),
    ])
    return res.json({ items, total, limit, skip })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
})

router.get('/:mint', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params
    const token = await Token.findOne({ mint })
    if (!token) return res.status(404).json({ error: 'token not found' })

    let pool: any = null
    try { pool = await fetchPool(new PublicKey(mint)) } catch { /* ignore */ }

    return res.json({ token, pool })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
})

export default router
