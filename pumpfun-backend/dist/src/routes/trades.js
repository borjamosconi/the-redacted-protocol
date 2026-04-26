"use strict";
// GET /api/tokens/:mint/trades?limit=100&before=<unix>
//
// Returns recent trades for a mint, newest first. Used by the dashboard
// trade feed. `before` pages back through history.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Trade_1 = __importDefault(require("../models/Trade"));
const router = (0, express_1.Router)();
router.get('/:mint/trades', async (req, res) => {
    try {
        const { mint } = req.params;
        const limit = Math.min(Number(req.query.limit) || 100, 500);
        const q = { mint };
        if (req.query.before)
            q.ts = { $lt: new Date(Number(req.query.before) * 1000) };
        if (req.query.user)
            q.user = req.query.user;
        if (req.query.side === 'buy' || req.query.side === 'sell')
            q.side = req.query.side;
        const trades = await Trade_1.default.find(q).sort({ ts: -1 }).limit(limit).lean();
        return res.json({ mint, trades });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
exports.default = router;
