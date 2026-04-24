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
import chartRoutes from './routes/chart'

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

// Legacy (kept for backward compat with existing dashboard auth)
app.use('/user/', userRoutes)
app.use('/feedback/', feedbackRoutes)

// ── Launchpad API (matches dashboard expectations) ─────────────────────────
app.use('/api/tokens', tokenRoutes)                 // list / create / get
app.use('/api/tokens', tradeRoutes)                 // POST /:mint/trade
app.use('/api/tokens', candlesRoutes)               // GET /:mint/candles
app.use('/api/tokens', tradesRoutes)                // GET /:mint/trades
app.use('/api/chart', chartRoutes)                  // legacy chart endpoint

export default app
