"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./src/app"));
const sockets_1 = __importDefault(require("./src/sockets/"));
const logger_1 = require("./src/sockets/logger");
const logListener_1 = require("./src/program/logListener");
const server = (0, http_1.createServer)(app_1.default);
(async () => {
    const io = await (0, sockets_1.default)(server);
    // Expose io on the Express app so route handlers can emit via req.app.get('io').
    app_1.default.set('io', io);
    // Start on-chain log indexer — rebuilds candles + trade feed from program events.
    try {
        const sub = (0, logListener_1.startLogListener)(io);
        logger_1.logger.info(`rd-bondingcurve log listener attached (subscription=${sub})`);
    }
    catch (e) {
        logger_1.logger.error(`failed to start log listener: ${e.message}`);
    }
    server.listen(app_1.default.get('port'), () => {
        logger_1.logger.info('  App is running at http://localhost:%d in %s mode', app_1.default.get('port'), app_1.default.get('env'));
    });
})();
exports.default = server;
