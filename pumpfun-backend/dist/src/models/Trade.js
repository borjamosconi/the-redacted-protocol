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
const mongoose_1 = __importStar(require("mongoose"));
const TradeSchema = new mongoose_1.Schema({
    mint: { type: String, required: true, index: true },
    side: { type: String, enum: ['buy', 'sell'], required: true },
    user: { type: String, required: true, index: true },
    solAmount: { type: Number, required: true },
    tokenAmount: { type: Number, required: true },
    price: { type: Number, required: true },
    virtualSolReserves: { type: String },
    virtualTokenReserves: { type: String },
    realSolReserves: { type: String },
    realTokenReserves: { type: String },
    txSignature: { type: String, required: true, unique: true, index: true },
    ts: { type: Date, default: Date.now, index: true },
});
exports.default = mongoose_1.default.models.Trade || mongoose_1.default.model('Trade', TradeSchema);
