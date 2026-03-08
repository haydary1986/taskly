export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const notificationsStore = useNotificationsStore()
  const tasksStore = useTasksStore()
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

        // Listen for live task updates
        socket.on('task:created', (task: any) => {
          if (!tasksStore.tasks.find(t => t.id === task.id)) {
            tasksStore.tasks.unshift(task)
          }
        })

        socket.on('task:updated', (task: any) => {
          const idx = tasksStore.tasks.findIndex(t => t.id === task.id)
          if (idx !== -1) {
            tasksStore.tasks[idx] = task
          }
        })

        socket.on('task:deleted', (id: string) => {
          tasksStore.tasks = tasksStore.tasks.filter(t => t.id !== id)
        })
      } else {
        socket.disconnect()
      }
    },
    { immediate: true },
  )
})
