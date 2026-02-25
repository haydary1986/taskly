import { createServer } from 'http'
import next from 'next'
import { initSocket } from './socket/index.js'

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
    console.log(`> Taskly API ready on http://localhost:${port}`)
    console.log(`> Admin panel: http://localhost:${port}/admin`)
    console.log(`> Socket.io: initialized`)
  })
})
