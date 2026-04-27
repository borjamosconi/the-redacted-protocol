import express from 'express'
import 'dotenv/config'
import bodyParser from 'body-parser'
import cors from 'cors'

import { init as initDb } from './db/dbConncetion'

import userRoutes from './routes/user'
import feedbackRoutes from './routes/feedback'

// Rebranded launchpad routes
import tokenRoutes from './routes/tokens'
import tradeRoutes from './routes/trade'
import candlesRoutes from './routes/candles'
import tradesRoutes from './routes/trades'

const app = express()
const PORT = Number(process.env.PORT) || 5000

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
  credentials: true,
}))
app.use(bodyParser.json({ limit: '5mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }))

initDb()

app.set('port', PORT)

// Health
app.get('/health', (_req, res) => res.json({ ok: true, service: 'redacted-backend', ts: Date.now() }))

// Legacy auth/user routes
app.use('/user/', userRoutes)
app.use('/feedback/', feedbackRoutes)

// Launchpad API — strictly off-chain Mongo registry. NONE of these routes
// touch wallets, mint tokens, or hold private keys. The dashboard owns the
// on-chain side via the user's wallet directly.
//
// Removed (had foreign wallets hardcoded in pump.fun template):
//   - /api/launch    → routes/launch.ts (deleted: imported web3.ts which
//                      had EmPsWiBxEy6… and 3XMrhbv989Vx… as fee sinks)
//   - /api/chart     → routes/chart.ts (legacy, used coin model that
//                      depended on web3.ts)
//   - /api/coin*     → routes/coin.ts, coinStatus.ts, coinTradeRoutes.ts
//                      (also deleted, same web3.ts dependency)
app.use('/api/tokens', tokenRoutes)                 // list / create / get / metadata pin
app.use('/api/tokens', tradeRoutes)                 // POST /:mint/trade
app.use('/api/tokens', candlesRoutes)               // GET /:mint/candles
app.use('/api/tokens', tradesRoutes)                // GET /:mint/trades

export default app
