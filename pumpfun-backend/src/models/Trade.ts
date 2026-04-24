import mongoose, { Schema } from 'mongoose'

const TradeSchema = new Schema({
  mint:        { type: String, required: true, index: true },
  side:        { type: String, enum: ['buy', 'sell'], required: true },
  user:        { type: String, required: true, index: true },
  solAmount:   { type: Number, required: true },
  tokenAmount: { type: Number, required: true },
  price:       { type: Number, required: true },
  virtualSolReserves:   { type: String },
  virtualTokenReserves: { type: String },
  realSolReserves:      { type: String },
  realTokenReserves:    { type: String },
  txSignature: { type: String, required: true, unique: true, index: true },
  ts:          { type: Date, default: Date.now, index: true },
})

export default mongoose.models.Trade || mongoose.model('Trade', TradeSchema)
