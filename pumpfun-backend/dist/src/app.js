"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const dbConncetion_1 = require("./db/dbConncetion");
const user_1 = __importDefault(require("./routes/user"));
const feedback_1 = __importDefault(require("./routes/feedback"));
// Rebranded launchpad routes
const tokens_1 = __importDefault(require("./routes/tokens"));
const trade_1 = __importDefault(require("./routes/trade"));
const candles_1 = __importDefault(require("./routes/candles"));
const trades_1 = __importDefault(require("./routes/trades"));
const chart_1 = __importDefault(require("./routes/chart"));
const launch_1 = __importDefault(require("./routes/launch"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
}));
app.use(body_parser_1.default.json({ limit: '5mb' }));
app.use(body_parser_1.default.urlencoded({ extended: true, limit: '5mb' }));
(0, dbConncetion_1.init)();
app.set('port', PORT);
// Health
app.get('/health', (_req, res) => res.json({ ok: true, service: 'redacted-backend', ts: Date.now() }));
// Legacy (kept for backward compat with existing dashboard auth)
app.use('/user/', user_1.default);
app.use('/feedback/', feedback_1.default);
// ── Launchpad API (matches dashboard expectations) ─────────────────────────
app.use('/api/launch', launch_1.default); // POST / — on-chain token creation
app.use('/api/tokens', tokens_1.default); // list / create / get
app.use('/api/tokens', trade_1.default); // POST /:mint/trade
app.use('/api/tokens', candles_1.default); // GET /:mint/candles
app.use('/api/tokens', trades_1.default); // GET /:mint/trades
app.use('/api/chart', chart_1.default); // legacy chart endpoint
exports.default = app;
