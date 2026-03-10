import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { createLogger } from '../lib/logger'

const log = createLogger('socket')

interface ConnectedUser {
  userId: string
  role: string
  socketIds: Set<string>
}

const connectedUsers = new Map<string, ConnectedUser>()

let io: SocketServer | null = null

// Cache for user active status to avoid DB hit on every connection
const userStatusCache = new Map<string, { isActive: boolean; checkedAt: number }>()
const CACHE_TTL = 5 * 60_000 // 5 minutes

export function initSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true,
    },
  })

  // JWT Authentication middleware — enhanced with user validation
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      const decoded = jwt.verify(token, process.env.PAYLOAD_SECRET || 'default-secret-change-me') as {
        id: string
        role: string
        collection: string
      }

      // Verify this is a users collection token
      if (decoded.collection !== 'users') {
        return next(new Error('Invalid token type'))
      }

      // Check if user is still active (with caching)
      const cached = userStatusCache.get(decoded.id)
      if (cached && Date.now() - cached.checkedAt < CACHE_TTL) {
        if (!cached.isActive) return next(new Error('User disabled'))
      } else {
        // Lazy import payload to avoid circular dependency
        try {
          const { default: payload } = await import('payload') as any
          if (payload?.find) {
            const user = await payload.find({
              collection: 'users',
              where: { id: { equals: decoded.id }, isActive: { equals: true } },
              limit: 1,
            })
            const isActive = user.docs.length > 0
            userStatusCache.set(decoded.id, { isActive, checkedAt: Date.now() })
            if (!isActive) return next(new Error('User disabled'))
          }
        } catch {
          // If payload isn't ready yet, allow connection (startup race)
          log.warn({ userId: decoded.id }, 'Could not verify user active status at socket connect')
        }
      }

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
      log.info({ userId, role }, 'User connected')
    }

    // ── Chat events relay ──
    socket.on('chat:join-room', (roomId: string) => {
      socket.join(`room:${roomId}`)
    })

    socket.on('chat:leave-room', (roomId: string) => {
      socket.leave(`room:${roomId}`)
    })

    socket.on('chat:message', (data: any) => {
      if (data.roomId) {
        socket.to(`room:${data.roomId}`).emit('chat:message', data)
      }
    })

    socket.on('chat:typing', (data: any) => {
      if (data.roomId) {
        socket.to(`room:${data.roomId}`).emit('chat:typing', {
          userId,
          userName: data.userName,
          roomId: data.roomId,
        })
      }
    })

    socket.on('chat:message-deleted', (data: any) => {
      if (data.roomId) {
        socket.to(`room:${data.roomId}`).emit('chat:message-deleted', data)
      }
    })

    socket.on('disconnect', () => {
      const user = connectedUsers.get(userId)
      if (user) {
        user.socketIds.delete(socket.id)
        if (user.socketIds.size === 0) {
          connectedUsers.delete(userId)
          if (io) io.emit('user:offline', userId)
          log.info({ userId }, 'User disconnected')
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

  /** Invalidate the user status cache (call when user is deactivated) */
  invalidateUserCache(userId: string) {
    userStatusCache.delete(userId)
  },
}
