// GET /api/tokens/:mint/trades?limit=100&before=<unix>
//
// Returns recent trades for a mint, newest first. Used by the dashboard
// trade feed. `before` pages back through history.

import { Router, Request, Response } from 'express'
import Trade from '../models/Trade'

const router = Router()

router.get('/:mint/trades', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params
    const limit = Math.min(Number(req.query.limit) || 100, 500)
    const q: any = { mint }
    if (req.query.before) q.ts = { $lt: new Date(Number(req.query.before) * 1000) }
    if (req.query.user) q.user = req.query.user
    if (req.query.side === 'buy' || req.query.side === 'sell') q.side = req.query.side

    const trades = await Trade.find(q).sort({ ts: -1 }).limit(limit).lean()
    return res.json({ mint, trades })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
})

export default router
