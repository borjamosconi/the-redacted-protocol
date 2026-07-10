// POST /api/tokens/:mint/trade
//
// Client-assisted trade indexing. The dashboard sends the txSignature after a
// successful on-chain buy/sell; the backend fetches the confirmed tx, parses
// the rd-bondingcurve Trade event out of its logs, and upserts the Trade +
// candles. Fully idempotent on txSignature (dedup via unique index on Trade).
//
// The log-listener (program/logListener.ts) indexes the same events in the
// background; this endpoint exists so the dashboard gets instant confirmation
// instead of waiting for the websocket push.

import { Router, Request, Response } from 'express'
import { PublicKey } from '@solana/web3.js'
import { BorshCoder, EventParser } from '@coral-xyz/anchor'
import Trade from '../models/Trade'
import Token from '../models/Token'
import { connection, bondingCurveProgram } from '../program/client'
import { BONDING_CURVE_PROGRAM_ID } from '../config'
import { upsertCandleForTrade } from '../utils/candle'

const router = Router()

router.post('/:mint/trade', async (req: Request, res: Response) => {
  try {
    const { mint } = req.params
    const { txSignature } = req.body || {}

    if (!txSignature) return res.status(400).json({ error: 'txSignature is required' })
    try { new PublicKey(mint) } catch { return res.status(400).json({ error: 'invalid mint' }) }

    // Idempotent: return existing if we already indexed it.
    const existing = await Trade.findOne({ txSignature })
    if (existing) return res.status(200).json({ trade: existing, cached: true })

    const tx = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    })
    if (!tx) return res.status(404).json({ error: 'transaction not confirmed yet' })
    if (tx.meta?.err) return res.status(400).json({ error: 'transaction failed on-chain', details: tx.meta.err })

    const logs = tx.meta?.logMessages ?? []
    const program = bondingCurveProgram()
    const coder = new BorshCoder(program.idl as any)
    const parser = new EventParser(BONDING_CURVE_PROGRAM_ID, coder)

    let tradeEvent: any = null
    for (const ev of parser.parseLogs(logs)) {
      if ((ev.name === 'TradeEvent' || ev.name === 'Trade') && (ev.data as any).mint.toBase58() === mint) {
        tradeEvent = ev.data
        break
      }
    }
    if (!tradeEvent) return res.status(400).json({ error: 'no Trade event for this mint in tx logs' })

    const solAmount = Number(tradeEvent.solAmount)
    const tokenAmount = Number(tradeEvent.tokenAmount)
    const price = tokenAmount > 0 ? solAmount / tokenAmount : 0

    const trade = await Trade.create({
      mint,
      side: tradeEvent.isBuy ? 'buy' : 'sell',
      user: tradeEvent.user.toBase58(),
      solAmount, tokenAmount, price,
      virtualSolReserves:   tradeEvent.virtualSolReserves.toString(),
      virtualTokenReserves: tradeEvent.virtualTokenReserves.toString(),
      realSolReserves:      tradeEvent.realSolReserves.toString(),
      realTokenReserves:    tradeEvent.realTokenReserves.toString(),
      txSignature,
      ts: new Date(Number(tradeEvent.timestamp) * 1000),
    })

    await upsertCandleForTrade(trade)
    await Token.updateOne({ mint }, {
      $inc: { tradeCount: 1, solRaised: tradeEvent.isBuy ? solAmount : -solAmount },
      $set: { lastPrice: price, lastTradeAt: trade.ts },
    })

    // Push to subscribers — log listener will also push, de-duped client-side by txSignature.
    const io = req.app.get('io')
    if (io) io.to(`mint:${mint}`).emit('trade', trade)

    return res.status(201).json({ trade })
  } catch (e) {
    // Mongo duplicate-key = race with log listener. Return the existing doc.
    if ((e as any).code === 11000) {
      const existing = await Trade.findOne({ txSignature: req.body?.txSignature })
      if (existing) return res.status(200).json({ trade: existing, cached: true })
    }
    return res.status(500).json({ error: (e as Error).message })
  }
})

export default router
