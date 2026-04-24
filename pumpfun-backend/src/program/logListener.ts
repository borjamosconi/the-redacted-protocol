// Subscribes to rd-bondingcurve program logs on Solana and indexes every
// Trade / PoolCreated / PoolGraduated event into MongoDB so candles + trade
// feed can be built even if a trade POST never hits the backend (e.g. user
// builds their own tx client-side).
//
// Emits realtime updates to Socket.io per mint.

import { Server } from 'socket.io'
import { BorshCoder, EventParser } from '@coral-xyz/anchor'
import { BONDING_CURVE_PROGRAM_ID } from '../config'
import { connection, bondingCurveProgram } from './client'
import Token from '../models/Token'
import Trade from '../models/Trade'
import { upsertCandleForTrade } from '../utils/candle'
import { logger } from '../sockets/logger'

export function startLogListener(io: Server): number {
  const program = bondingCurveProgram()
  const coder = new BorshCoder(program.idl as any)
  const parser = new EventParser(BONDING_CURVE_PROGRAM_ID, coder)

  return connection.onLogs(
    BONDING_CURVE_PROGRAM_ID,
    async (logs) => {
      if (logs.err) return
      try {
        for (const ev of parser.parseLogs(logs.logs)) {
          const name = ev.name
          const data = ev.data as any
          if (name === 'TradeEvent' || name === 'Trade') {
            const mint = data.mint.toBase58()
            const trade = await Trade.create({
              mint,
              side: data.isBuy ? 'buy' : 'sell',
              user: data.user.toBase58(),
              solAmount: Number(data.solAmount),
              tokenAmount: Number(data.tokenAmount),
              price: data.tokenAmount > 0 ? Number(data.solAmount) / Number(data.tokenAmount) : 0,
              virtualSolReserves: data.virtualSolReserves.toString(),
              virtualTokenReserves: data.virtualTokenReserves.toString(),
              realSolReserves: data.realSolReserves.toString(),
              realTokenReserves: data.realTokenReserves.toString(),
              txSignature: logs.signature,
              ts: new Date(Number(data.timestamp) * 1000),
            })
            await upsertCandleForTrade(trade)
            // Update aggregate on token doc
            await Token.updateOne({ mint }, {
              $inc: { tradeCount: 1, solRaised: data.isBuy ? Number(data.solAmount) : -Number(data.solAmount) },
              $set: { lastPrice: trade.price, lastTradeAt: trade.ts },
            })
            io.to(`mint:${mint}`).emit('trade', trade)
          } else if (name === 'PoolCreated') {
            io.emit('pool-created', {
              mint: data.mint.toBase58(),
              creator: data.creator.toBase58(),
              name: data.name, symbol: data.symbol, uri: data.uri,
              ts: Number(data.timestamp),
            })
          } else if (name === 'PoolGraduated') {
            const mint = data.mint.toBase58()
            await Token.updateOne({ mint }, { $set: { graduated: true, graduatedAt: new Date() } })
            io.to(`mint:${mint}`).emit('graduated', { mint })
          }
        }
      } catch (e) {
        logger.error(`log listener error: ${(e as Error).message}`)
      }
    },
    'confirmed',
  )
}
