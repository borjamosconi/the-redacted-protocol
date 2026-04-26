"use strict";
// /api/launch — on-chain token creation endpoint
//
// POST /api/launch
//   Endpoint que crea un token SPL real en blockchain.
//   Combina:
//     1. Generación de mint
//     2. Creación de token en blockchain (vía createToken)
//     3. Registro en MongoDB
//     4. Inicialización en Redis (dashboard)
//
//   Request:
//     {
//       name: string            (token name)
//       symbol: string          (ticker)
//       description: string     (optional)
//       imageUrl: string        (optional, IPFS/HTTP URL)
//       creator: string         (wallet pubkey)
//       twitterUrl: string      (optional)
//       websiteUrl: string      (optional)
//     }
//
//   Response:
//     {
//       mint: string            (mint address on mainnet)
//       txSignature: string     (confirmation tx)
//       name, symbol, creator   (echoed back)
//     }
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
const joi_1 = __importDefault(require("joi"));
const Token_1 = __importDefault(require("../models/Token"));
const web3_1 = require("../program/web3");
const router = (0, express_1.Router)();
// Schema validation
const launchSchema = joi_1.default.object().keys({
    name: joi_1.default.string().required().min(1).max(100),
    symbol: joi_1.default.string().required().min(1).max(10),
    description: joi_1.default.string().optional().max(500),
    imageUrl: joi_1.default.string().optional().uri(),
    creator: joi_1.default.string().required(),
    twitterUrl: joi_1.default.string().optional().uri(),
    websiteUrl: joi_1.default.string().optional().uri(),
});
router.post('/', async (req, res) => {
    try {
        const { body } = req;
        // Validate input
        const validation = launchSchema.validate(body);
        if (validation.error) {
            return res.status(400).json({ error: validation.error.details[0].message });
        }
        const { name, symbol, description = '', imageUrl = '', creator, twitterUrl = '', websiteUrl = '', } = body;
        // Sanity: valid creator pubkey
        try {
            new web3_js_1.PublicKey(creator);
        }
        catch {
            return res.status(400).json({ error: 'invalid creator pubkey' });
        }
        // Check for duplicate symbol (optional, prevents confusion)
        const existing = await Token_1.default.findOne({ symbol: String(symbol).toUpperCase() });
        if (existing) {
            return res.status(409).json({ error: `Symbol ${symbol} already in use` });
        }
        console.log(`[LAUNCH] Starting token creation: ${name} (${symbol}) by ${creator}`);
        // Create token on-chain (this calls Metaplex createAndMint + LP creation)
        // The createToken function handles:
        //   1. Generate mint via UMI
        //   2. Upload metadata to Pinata
        //   3. Create SPL token via Metaplex
        //   4. Create liquidity pool
        //   5. Save to MongoDB
        //   6. Return response
        const coinData = {
            name,
            ticker: symbol,
            description,
            url: imageUrl || 'https://via.placeholder.com/1024',
            creator,
            // Note: we'll add social links after token is created
        };
        const result = await (0, web3_1.createToken)(coinData);
        if (result === 'transaction failed') {
            return res.status(500).json({ error: 'Failed to create token on-chain' });
        }
        const mint = result.token?.toBase58?.() || result.token || result._id;
        const txSignature = result.tx || 'pending';
        console.log(`[LAUNCH] ✅ Token created: ${mint}`);
        // Save additional metadata to Token collection (for dashboard queries)
        const token = await Token_1.default.create({
            mint: String(mint),
            creator,
            name,
            symbol: String(symbol).toUpperCase(),
            description,
            logo: imageUrl,
            twitterUrl,
            websiteUrl,
            launchTxSignature: txSignature,
        }).catch(err => {
            // Already exists or other DB error — continue anyway
            console.warn(`[LAUNCH] Token already in DB or DB error:`, err.message);
        });
        // Return success
        return res.status(201).json({
            mint: String(mint),
            txSignature,
            name,
            symbol,
            creator,
            message: 'Token created successfully on mainnet',
        });
    }
    catch (e) {
        console.error('[LAUNCH] Error:', e.message);
        return res.status(500).json({ error: e.message || 'Unknown error' });
    }
});
exports.default = router;
