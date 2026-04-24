import { createServer } from 'http'
import app from './src/app'
import socketio from './src/sockets/'
import { logger } from './src/sockets/logger'
import { startLogListener } from './src/program/logListener'

const server = createServer(app)

;(async () => {
  const io = await socketio(server)
  // Expose io on the Express app so route handlers can emit via req.app.get('io').
  app.set('io', io)

  // Start on-chain log indexer — rebuilds candles + trade feed from program events.
  try {
    const sub = startLogListener(io)
    logger.info(`rd-bondingcurve log listener attached (subscription=${sub})`)
  } catch (e) {
    logger.error(`failed to start log listener: ${(e as Error).message}`)
  }

  server.listen(app.get('port'), () => {
    logger.info('  App is running at http://localhost:%d in %s mode', app.get('port'), app.get('env'))
  })
})()

export default server
