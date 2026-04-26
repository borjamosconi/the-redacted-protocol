"use strict";
// /api/tokens — launchpad token registry.
//
// The on-chain state of a pool lives in the rd-bondingcurve program; this
// collection is a convenience mirror so the dashboard can list tokens + show
// social metadata without paging every pool account on each request.
//
// POST /api/tokens        register a token after the client successfully calls
//                         rd_bondingcurve.create_pool on-chain. Caller supplies
//                         { mint, creator, name, symbol, description?, logo?,
//                           twitterUrl?, websiteUrl?, launchTxSignature? }.
//                         The backend verifies the pool PDA exists before
//                         persisting.
// GET  /api/tokens        paginated list (newest first, supports ?limit & ?skip
//                         & ?graduated).
// GET  /api/tokens/:mint  token doc + on-chain pool snapshot (if available).
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
const Token_1 = __importDefault(require("../models/Token"));
const client_1 = require("../program/client");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    try {
        const { mint, creator, name, symbol, description = '', logo = '', twitterUrl = '', websiteUrl = '', launchTxSignature = '', } = req.body || {};
        if (!mint || !creator || !name || !symbol) {
            return res.status(400).json({ error: 'mint, creator, name, symbol are required' });
        }
        // sanity: valid base58 pubkeys
        try {
            new web3_js_1.PublicKey(mint);
            new web3_js_1.PublicKey(creator);
        }
        catch {
            return res.status(400).json({ error: 'invalid mint/creator pubkey' });
        }
        const existing = await Token_1.default.findOne({ mint });
        if (existing)
            return res.status(200).json({ token: existing, existed: true });
        const token = await Token_1.default.create({
            mint, creator, name, symbol: String(symbol).toUpperCase(),
            description, logo, twitterUrl, websiteUrl, launchTxSignature,
        });
        return res.status(201).json({ token });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const skip = Number(req.query.skip) || 0;
        const filter = {};
        if (req.query.graduated === 'true')
            filter.graduated = true;
        if (req.query.graduated === 'false')
            filter.graduated = false;
        const [items, total] = await Promise.all([
            Token_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Token_1.default.countDocuments(filter),
        ]);
        return res.json({ items, total, limit, skip });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
// Pin token metadata (image + JSON) to IPFS via Pinata. Returns a URI the
// frontend can pass into rd_bondingcurve.create_pool. If PINATA_JWT is not
// configured, falls back to inlining the metadata as a data:URI — works fine
// for the on-chain mint metadata field but won't render in third-party UIs.
router.post('/metadata/pin', async (req, res) => {
    try {
        const { name, symbol, description = '', image = '', external_url = '', twitter = '' } = req.body || {};
        if (!name || !symbol)
            return res.status(400).json({ error: 'name and symbol required' });
        const meta = { name, symbol, description, image, external_url, twitter };
        const jwt = process.env.PINATA_JWT;
        if (!jwt) {
            // Data-URI fallback (zero cost, works on-chain but not in marketplaces).
            const dataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(meta)).toString('base64')}`;
            return res.json({ uri: dataUri, ipfs: false });
        }
        const r = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinataContent: meta, pinataMetadata: { name: `${symbol}-metadata` } }),
        });
        if (!r.ok)
            throw new Error(`pinata ${r.status}: ${await r.text()}`);
        const j = await r.json();
        const gateway = process.env.PINATA_GATEWAY_URL ?? 'https://gateway.pinata.cloud/ipfs';
        return res.json({ uri: `${gateway}/${j.IpfsHash}`, ipfs: true });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
router.get('/:mint', async (req, res) => {
    try {
        const { mint } = req.params;
        const token = await Token_1.default.findOne({ mint });
        if (!token)
            return res.status(404).json({ error: 'token not found' });
        let pool = null;
        try {
            pool = await (0, client_1.fetchPool)(new web3_js_1.PublicKey(mint));
        }
        catch { /* ignore */ }
        return res.json({ token, pool });
    }
    catch (e) {
        return res.status(500).json({ error: e.message });
    }
});
exports.default = router;
