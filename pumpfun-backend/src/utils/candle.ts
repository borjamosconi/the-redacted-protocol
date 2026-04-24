import Candle from '../models/Candle'

export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
export type Interval = typeof INTERVALS[number]

const SECS: Record<Interval, number> = {
  '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400,
}

export function bucket(ts: number, interval: Interval): number {
  return Math.floor(ts / SECS[interval]) * SECS[interval]
}

/** Given a trade doc { mint, price, solAmount, ts }, upsert candles for every interval. */
export async function upsertCandleForTrade(trade: any): Promise<void> {
  const ts = Math.floor((trade.ts instanceof Date ? trade.ts.getTime() : trade.ts) / 1000)
  const price = trade.price
  const volume = trade.solAmount

  await Promise.all(INTERVALS.map(async (interval) => {
    const time = bucket(ts, interval)
    const existing = await Candle.findOne({ mint: trade.mint, interval, time })
    if (existing) {
      existing.high = Math.max(existing.high, price)
      existing.low  = Math.min(existing.low, price)
      existing.close = price
      existing.volume += volume
      await existing.save()
    } else {
      await Candle.create({
        mint: trade.mint, interval, time,
        open: price, high: price, low: price, close: price,
        volume,
      })
    }
  }))
}
