import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'

interface ConnectedUser {
  userId: string
  role: string
  socketIds: Set<string>
}

const connectedUsers = new Map<string, ConnectedUser>()

let io: SocketServer | null = null

export function initSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true,
    },
  })

  // JWT Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      const decoded = jwt.verify(token, process.env.PAYLOAD_SECRET || 'default-secret-change-me') as any
      socket.data.userId = decoded.id
      socket.data.role = decoded.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const { userId, role } = socket.data
    const isNewUser = !connectedUsers.has(userId)

    // Track connected user
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, { userId, role, socketIds: new Set() })
    }
    connectedUsers.get(userId)!.socketIds.add(socket.id)

    // Join user-specific and role-specific rooms
    socket.join(`user:${userId}`)
    socket.join(`role:${role}`)

    // Send current online users to the newly connected socket
    const onlineUserIds = Array.from(connectedUsers.keys())
    socket.emit('users:online', onlineUserIds)

    // Broadcast user came online (only if they weren't already connected)
    if (isNewUser) {
      socket.broadcast.emit('user:online', userId)
    }

    socket.on('disconnect', () => {
      const user = connectedUsers.get(userId)
      if (user) {
        user.socketIds.delete(socket.id)
        if (user.socketIds.size === 0) {
          connectedUsers.delete(userId)
          // Broadcast user went offline
          if (io) io.emit('user:offline', userId)
        }
      }
    })
  })

  return io
}

export const socketService = {
  emitToUser(userId: string, event: string, data: any) {
    if (io) {
      io.to(`user:${userId}`).emit(event, data)
    }
  },

  emitToRole(role: string, event: string, data: any) {
    if (io) {
      io.to(`role:${role}`).emit(event, data)
    }
  },

  emitToAll(event: string, data: any) {
    if (io) {
      io.emit(event, data)
    }
  },

  getConnectedUsers() {
    return Array.from(connectedUsers.values()).map(({ userId, role }) => ({ userId, role }))
  },

  isUserOnline(userId: string) {
    return connectedUsers.has(userId)
  },
}
