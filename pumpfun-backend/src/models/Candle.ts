import mongoose, { Schema } from 'mongoose'

const CandleSchema = new Schema({
  mint:     { type: String, required: true, index: true },
  interval: { type: String, enum: ['1m', '5m', '15m', '1h', '4h', '1d'], required: true },
  time:     { type: Number, required: true, index: true },  // unix seconds bucket start
  open:     { type: Number, required: true },
  high:     { type: Number, required: true },
  low:      { type: Number, required: true },
  close:    { type: Number, required: true },
  volume:   { type: Number, default: 0 },
})
CandleSchema.index({ mint: 1, interval: 1, time: 1 }, { unique: true })

export default mongoose.models.Candle || mongoose.model('Candle', CandleSchema)
