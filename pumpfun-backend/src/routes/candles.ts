// GET /api/tokens/:mint/candles?interval=1m&from=<unix>&to=<unix>&limit=500
//
// Serves OHLC candles for a given token mint. `interval` is one of
// 1m / 5m / 15m / 1h / 4h / 1d. `from` and `to` are unix seconds (inclusive).
// When unset, returns the most recent `limit` candles (default 500, max 2000).

import { Router, Request, Response } from 'express'
import Candle from '../models/Candle'
import { INTERVALS, Interval } from '../utils/candle'

const router = Router()

router.get('/:mint/candles', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params
    const interval = (req.query.interval as Interval) || '1m'
    if (!INTERVALS.includes(interval)) {
      return res.status(400).json({ error: `interval must be one of ${INTERVALS.join(',')}` })
    }
    const limit = Math.min(Number(req.query.limit) || 500, 2000)
    const q: any = { mint, interval }
    const from = req.query.from ? Number(req.query.from) : undefined
    const to   = req.query.to   ? Number(req.query.to)   : undefined
    if (from !== undefined || to !== undefined) {
      q.time = {}
      if (from !== undefined) q.time.$gte = from
      if (to   !== undefined) q.time.$lte = to
    }

    const candles = await Candle.find(q).sort({ time: -1 }).limit(limit).lean()
    // Return oldest→newest so charts can push directly.
    candles.reverse()
    return res.json({ mint, interval, candles })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
})

export default router
