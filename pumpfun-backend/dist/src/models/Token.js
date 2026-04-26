"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// models/Token.ts — a launched token on the RDX terminal.
const mongoose_1 = __importStar(require("mongoose"));
const TokenSchema = new mongoose_1.Schema({
    mint: { type: String, required: true, unique: true, index: true },
    creator: { type: String, required: true, index: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true, uppercase: true },
    description: { type: String, default: '' },
    logo: { type: String, default: '' },
    twitterUrl: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },
    launchTxSignature: { type: String, default: '' },
    // on-chain pool state mirrors (updated by log listener)
    virtualSolReserves: { type: String, default: '0' },
    virtualTokenReserves: { type: String, default: '0' },
    realSolReserves: { type: String, default: '0' },
    realTokenReserves: { type: String, default: '0' },
    lastPrice: { type: Number, default: 0 },
    solRaised: { type: Number, default: 0 },
    tradeCount: { type: Number, default: 0 },
    graduated: { type: Boolean, default: false },
    graduatedAt: { type: Date, default: null },
    lastTradeAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
exports.default = mongoose_1.default.models.Token || mongoose_1.default.model('Token', TokenSchema);
