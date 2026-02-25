export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const notificationsStore = useNotificationsStore()
  const socket = useSocket()

  // Watch for authentication changes
  watch(
    () => authStore.isAuthenticated,
    (isAuth) => {
      if (isAuth) {
        socket.connect()
        // Listen for notifications
        socket.on('notification:new', (data: any) => {
          notificationsStore.addNotification(data)
        })
        socket.on('notification:count', (data: any) => {
          notificationsStore.unreadCount = data.unreadCount
        })
      } else {
        socket.disconnect()
      }
    },
    { immediate: true },
  )
})
