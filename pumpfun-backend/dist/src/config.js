"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RD_TREASURY_PROGRAM_ID = exports.RD_TOKEN_PROGRAM_ID = exports.BONDING_CURVE_PROGRAM_ID = exports.config = void 0;
exports.getAdminKeypair = getAdminKeypair;
require("dotenv/config");
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
function req(key) {
    const v = process.env[key];
    if (!v)
        throw new Error(`Missing required env: ${key}`);
    return v;
}
function opt(key, fallback = '') {
    return process.env[key] ?? fallback;
}
exports.config = {
    port: Number(process.env.PORT) || 5000,
    corsOrigin: opt('CORS_ORIGIN', 'http://localhost:3000').split(','),
    jwtSecret: opt('JWT_SECRET', 'change-me'),
    mongoUri: opt('MONGODB_URI', 'mongodb://localhost:27017/redacted'),
    rpcUrl: opt('SOLANA_RPC', 'https://api.mainnet-beta.solana.com'),
    cluster: opt('SOLANA_CLUSTER', 'mainnet-beta'),
    programIds: {
        bondingCurve: opt('RD_BONDINGCURVE_PROGRAM_ID', 'BCurve1111111111111111111111111111111111111'),
        token: opt('RD_TOKEN_PROGRAM_ID', 'CPLCsPQJrfWQgacJEq1QcbwoMcJocbEhjGVmJLPhs38Z'),
        treasury: opt('RD_TREASURY_PROGRAM_ID', 'HpvmQtmxyPeeYKGvKHqEdcnsYUzAQrdynoCX452s2xLz'),
        presale: opt('RD_PRESALE_PROGRAM_ID', 'HACK1L8hdDN1wuhV5mEbNYGeMXjhFzvz3HNvDTCdFP2a'),
    },
    treasuryPubkey: opt('TREASURY_PUBKEY', 'CMESXEN77tCC6ndjVBmHEuY1fg86X6GWkEvFiMfKc5X8'),
    migrationAuthorityPubkey: opt('MIGRATION_AUTHORITY_PUBKEY'),
    pinataJwt: opt('PINATA_JWT'),
    pinataGateway: opt('PINATA_GATEWAY_URL', 'https://gateway.pinata.cloud/ipfs'),
};
/** Load admin signer from ADMIN_PRIVATE_KEY (base58). Lazy + cached. */
let _adminKp = null;
function getAdminKeypair() {
    if (_adminKp)
        return _adminKp;
    const sk = req('ADMIN_PRIVATE_KEY');
    _adminKp = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(sk));
    return _adminKp;
}
exports.BONDING_CURVE_PROGRAM_ID = new web3_js_1.PublicKey(exports.config.programIds.bondingCurve);
exports.RD_TOKEN_PROGRAM_ID = new web3_js_1.PublicKey(exports.config.programIds.token);
exports.RD_TREASURY_PROGRAM_ID = new web3_js_1.PublicKey(exports.config.programIds.treasury);
