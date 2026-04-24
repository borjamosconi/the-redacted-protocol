// models/Token.ts — a launched token on the RDX terminal.
import mongoose, { Schema } from 'mongoose'

const TokenSchema = new Schema({
  mint:        { type: String, required: true, unique: true, index: true },
  creator:     { type: String, required: true, index: true },
  name:        { type: String, required: true },
  symbol:      { type: String, required: true, uppercase: true },
  description: { type: String, default: '' },
  logo:        { type: String, default: '' },
  twitterUrl:  { type: String, default: '' },
  websiteUrl:  { type: String, default: '' },
  launchTxSignature: { type: String, default: '' },

  // on-chain pool state mirrors (updated by log listener)
  virtualSolReserves:   { type: String, default: '0' },
  virtualTokenReserves: { type: String, default: '0' },
  realSolReserves:      { type: String, default: '0' },
  realTokenReserves:    { type: String, default: '0' },
  lastPrice:            { type: Number, default: 0 },
  solRaised:            { type: Number, default: 0 },
  tradeCount:           { type: Number, default: 0 },
  graduated:            { type: Boolean, default: false },
  graduatedAt:          { type: Date, default: null },
  lastTradeAt:          { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
}, { timestamps: true })

export default mongoose.models.Token || mongoose.model('Token', TokenSchema)
