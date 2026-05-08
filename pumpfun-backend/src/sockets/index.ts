import { Server, Socket } from 'socket.io'
import { logger } from './logger'

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
const socketio = async (server: any): Promise<Server> => {
  const origins = process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3001']
  const io = new Server(server, {
    cors: { origin: origins, methods: ['GET', 'POST'] },
  })

  io.on('connection', (socket: Socket) => {
    logger.info(`socket connected: ${socket.id}`)

    socket.on('subscribe', (mint: string) => {
      if (typeof mint !== 'string' || mint.length < 32) return
      socket.join(`mint:${mint}`)
    })
    socket.on('unsubscribe', (mint: string) => {
      if (typeof mint !== 'string') return
      socket.leave(`mint:${mint}`)
    })

    socket.on('disconnect', () => {
      logger.info(`socket disconnected: ${socket.id}`)
    })
  })

  logger.info('Socket server is running')
  return io
}

export default socketio
