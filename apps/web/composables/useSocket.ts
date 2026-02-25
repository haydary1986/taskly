import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function useSocket() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  function connect() {
    if (socket?.connected) return

    const token = authStore.token
    if (!token) return

    socket = io(config.public.apiBase as string, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected')
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
    })
  }

  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  }

  function on(event: string, callback: (...args: any[]) => void) {
    socket?.on(event, callback)
  }

  function off(event: string, callback?: (...args: any[]) => void) {
    socket?.off(event, callback)
  }

  function emit(event: string, ...args: any[]) {
    socket?.emit(event, ...args)
  }

  return {
    connect,
    disconnect,
    on,
    off,
    emit,
    get connected() {
      return socket?.connected ?? false
    },
  }
}
