"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTERVALS = void 0;
exports.bucket = bucket;
exports.upsertCandleForTrade = upsertCandleForTrade;
const Candle_1 = __importDefault(require("../models/Candle"));
exports.INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];
const SECS = {
    '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400,
};
function bucket(ts, interval) {
    return Math.floor(ts / SECS[interval]) * SECS[interval];
}
/** Given a trade doc { mint, price, solAmount, ts }, upsert candles for every interval. */
async function upsertCandleForTrade(trade) {
    const ts = Math.floor((trade.ts instanceof Date ? trade.ts.getTime() : trade.ts) / 1000);
    const price = trade.price;
    const volume = trade.solAmount;
    await Promise.all(exports.INTERVALS.map(async (interval) => {
        const time = bucket(ts, interval);
        const existing = await Candle_1.default.findOne({ mint: trade.mint, interval, time });
        if (existing) {
            existing.high = Math.max(existing.high, price);
            existing.low = Math.min(existing.low, price);
            existing.close = price;
            existing.volume += volume;
            await existing.save();
        }
        else {
            await Candle_1.default.create({
                mint: trade.mint, interval, time,
                open: price, high: price, low: price, close: price,
                volume,
            });
        }
    }));
}
