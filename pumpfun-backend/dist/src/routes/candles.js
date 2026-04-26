"use strict";
// GET /api/tokens/:mint/candles?interval=1m&from=<unix>&to=<unix>&limit=500
//
// Serves OHLC candles for a given token mint. `interval` is one of
// 1m / 5m / 15m / 1h / 4h / 1d. `from` and `to` are unix seconds (inclusive).
// When unset, returns the most recent `limit` candles (default 500, max 2000).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Candle_1 = __importDefault(require("../models/Candle"));
const candle_1 = require("../utils/candle");
const router = (0, express_1.Router)();
router.get('/:mint/candles', async (req, res) => {
    try {
        const { mint } = req.params;
        const interval = req.query.interval || '1m';
        if (!candle_1.INTERVALS.includes(interval)) {
            return res.status(400).json({ error: `interval must be one of ${candle_1.INTERVALS.join(',')}` });
        }
        const limit = Math.min(Number(req.query.limit) || 500, 2000);
        const q = { mint, interval };
        const from = req.query.from ? Number(req.query.from) : undefined;
        const to = req.query.to ? Number(req.query.to) : undefined;
        if (from !== undefined || to !== undefined) {
            q.time = {};
            if (from !== undefined)
                q.time.$gte = from;
            if (to !== undefined)
                q.time.$lte = to;
        }
        const candles = await Candle_1.default.find(q).sort({ time: -1 }).limit(limit).lean();
        // Return oldest→newest so charts can push directly.
        candles.reverse();
        return res.json({ mint, interval, candles });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
exports.default = router;
