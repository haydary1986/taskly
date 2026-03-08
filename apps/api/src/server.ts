// Initialize Sentry as early as possible
import '../sentry.server.config.js'
import { createServer } from 'http'
import next from 'next'
import { initSocket } from './socket/index.js'
import { createLogger } from './lib/logger.js'

const log = createLogger('server')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(handle as any)

  // Initialize Socket.io
  initSocket(httpServer)

  httpServer.listen(port, () => {
    log.info({ port, hostname }, `Taskly API ready on http://localhost:${port}`)
    log.info('Admin panel: http://localhost:%d/admin', port)
    log.info('Socket.io: initialized')
    if (process.env.SENTRY_DSN) {
      log.info('Sentry: error tracking enabled')
    }
  })
})
