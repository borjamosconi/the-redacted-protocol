"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const Trade_1 = __importDefault(require("../models/Trade"));
const Token_1 = __importDefault(require("../models/Token"));
const client_1 = require("../program/client");
const config_1 = require("../config");
const candle_1 = require("../utils/candle");
const router = (0, express_1.Router)();
router.post('/:mint/trade', async (req, res) => {
    try {
        const { mint } = req.params;
        const { txSignature } = req.body || {};
        if (!txSignature)
            return res.status(400).json({ error: 'txSignature is required' });
        try {
            new web3_js_1.PublicKey(mint);
        }
        catch {
            return res.status(400).json({ error: 'invalid mint' });
        }
        // Idempotent: return existing if we already indexed it.
        const existing = await Trade_1.default.findOne({ txSignature });
        if (existing)
            return res.status(200).json({ trade: existing, cached: true });
        const tx = await client_1.connection.getTransaction(txSignature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed',
        });
        if (!tx)
            return res.status(404).json({ error: 'transaction not confirmed yet' });
        if (tx.meta?.err)
            return res.status(400).json({ error: 'transaction failed on-chain', details: tx.meta.err });
        const logs = tx.meta?.logMessages ?? [];
        const program = (0, client_1.bondingCurveProgram)();
        const coder = new anchor_1.BorshCoder(program.idl);
        const parser = new anchor_1.EventParser(config_1.BONDING_CURVE_PROGRAM_ID, coder);
        let tradeEvent = null;
        for (const ev of parser.parseLogs(logs)) {
            if (ev.name === 'TradeEvent' && ev.data.mint.toBase58() === mint) {
                tradeEvent = ev.data;
                break;
            }
        }
        if (!tradeEvent)
            return res.status(400).json({ error: 'no Trade event for this mint in tx logs' });
        const solAmount = Number(tradeEvent.solAmount);
        const tokenAmount = Number(tradeEvent.tokenAmount);
        const price = tokenAmount > 0 ? solAmount / tokenAmount : 0;
        const trade = await Trade_1.default.create({
            mint,
            side: tradeEvent.isBuy ? 'buy' : 'sell',
            user: tradeEvent.user.toBase58(),
            solAmount, tokenAmount, price,
            virtualSolReserves: tradeEvent.virtualSolReserves.toString(),
            virtualTokenReserves: tradeEvent.virtualTokenReserves.toString(),
            realSolReserves: tradeEvent.realSolReserves.toString(),
            realTokenReserves: tradeEvent.realTokenReserves.toString(),
            txSignature,
            ts: new Date(Number(tradeEvent.timestamp) * 1000),
        });
        await (0, candle_1.upsertCandleForTrade)(trade);
        await Token_1.default.updateOne({ mint }, {
            $inc: { tradeCount: 1, solRaised: tradeEvent.isBuy ? solAmount : -solAmount },
            $set: { lastPrice: price, lastTradeAt: trade.ts },
        });
        // Push to subscribers — log listener will also push, de-duped client-side by txSignature.
        const io = req.app.get('io');
        if (io)
            io.to(`mint:${mint}`).emit('trade', trade);
        return res.status(201).json({ trade });
    }
    catch (e) {
        // Mongo duplicate-key = race with log listener. Return the existing doc.
        if (e.code === 11000) {
            const existing = await Trade_1.default.findOne({ txSignature: req.body?.txSignature });
            if (existing)
                return res.status(200).json({ trade: existing, cached: true });
        }
        return res.status(500).json({ error: e.message });
    }
});
exports.default = router;
