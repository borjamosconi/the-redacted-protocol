"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const logger_1 = require("./logger");
/**
 * Initialises Socket.io and wires per-mint rooms.
 *
 * Clients subscribe to a specific token feed by emitting:
 *   socket.emit('subscribe', '<mint pubkey>')
 *   socket.emit('unsubscribe', '<mint pubkey>')
 *
 * Server-side, the log-listener (program/logListener.ts) and the
 * /api/tokens/:mint/trade route push into `io.to('mint:<pubkey>').emit('trade', ...)`.
 */
const socketio = async (server) => {
    const io = new socket_io_1.Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    io.on('connection', (socket) => {
        logger_1.logger.info(`socket connected: ${socket.id}`);
        socket.on('subscribe', (mint) => {
            if (typeof mint !== 'string' || mint.length < 32)
                return;
            socket.join(`mint:${mint}`);
        });
        socket.on('unsubscribe', (mint) => {
            if (typeof mint !== 'string')
                return;
            socket.leave(`mint:${mint}`);
        });
        socket.on('disconnect', () => {
            logger_1.logger.info(`socket disconnected: ${socket.id}`);
        });
    });
    logger_1.logger.info('Socket server is running');
    return io;
};
exports.default = socketio;
