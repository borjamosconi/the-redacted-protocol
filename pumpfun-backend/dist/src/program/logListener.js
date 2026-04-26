"use strict";
// Subscribes to rd-bondingcurve program logs on Solana and indexes every
// Trade / PoolCreated / PoolGraduated event into MongoDB so candles + trade
// feed can be built even if a trade POST never hits the backend (e.g. user
// builds their own tx client-side).
//
// Emits realtime updates to Socket.io per mint.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLogListener = startLogListener;
const anchor_1 = require("@coral-xyz/anchor");
const config_1 = require("../config");
const client_1 = require("./client");
const Token_1 = __importDefault(require("../models/Token"));
const Trade_1 = __importDefault(require("../models/Trade"));
const candle_1 = require("../utils/candle");
const logger_1 = require("../sockets/logger");
function startLogListener(io) {
    const program = (0, client_1.bondingCurveProgram)();
    const coder = new anchor_1.BorshCoder(program.idl);
    const parser = new anchor_1.EventParser(config_1.BONDING_CURVE_PROGRAM_ID, coder);
    return client_1.connection.onLogs(config_1.BONDING_CURVE_PROGRAM_ID, async (logs) => {
        if (logs.err)
            return;
        try {
            for (const ev of parser.parseLogs(logs.logs)) {
                const name = ev.name;
                const data = ev.data;
                if (name === 'TradeEvent' || name === 'Trade') {
                    const mint = data.mint.toBase58();
                    const trade = await Trade_1.default.create({
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
                    });
                    await (0, candle_1.upsertCandleForTrade)(trade);
                    // Update aggregate on token doc
                    await Token_1.default.updateOne({ mint }, {
                        $inc: { tradeCount: 1, solRaised: data.isBuy ? Number(data.solAmount) : -Number(data.solAmount) },
                        $set: { lastPrice: trade.price, lastTradeAt: trade.ts },
                    });
                    io.to(`mint:${mint}`).emit('trade', trade);
                }
                else if (name === 'PoolCreated') {
                    io.emit('pool-created', {
                        mint: data.mint.toBase58(),
                        creator: data.creator.toBase58(),
                        name: data.name, symbol: data.symbol, uri: data.uri,
                        ts: Number(data.timestamp),
                    });
                }
                else if (name === 'PoolGraduated') {
                    const mint = data.mint.toBase58();
                    await Token_1.default.updateOne({ mint }, { $set: { graduated: true, graduatedAt: new Date() } });
                    io.to(`mint:${mint}`).emit('graduated', { mint });
                }
            }
        }
        catch (e) {
            logger_1.logger.error(`log listener error: ${e.message}`);
        }
    }, 'confirmed');
}
