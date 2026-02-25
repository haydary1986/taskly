import { defineStore } from 'pinia'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link?: string
  createdAt: string
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)

  const api = useApi()

  async function fetchNotifications() {
    loading.value = true
    try {
      const res = await api.get('/notifications', {
        query: { sort: '-createdAt', limit: 20 },
      })
      notifications.value = res.docs
      unreadCount.value = res.docs.filter((n: Notification) => !n.isRead).length
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(id: string) {
    try {
      await api.patch(`/notifications/${id}`, { isRead: true })
      const notif = notifications.value.find((n) => n.id === id)
      if (notif && !notif.isRead) {
        notif.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  async function markAllAsRead() {
    const unread = notifications.value.filter((n) => !n.isRead)
    await Promise.all(unread.map((n) => markAsRead(n.id)))
  }

  function addNotification(notif: Notification) {
    notifications.value.unshift(notif)
    if (!notif.isRead) {
      unreadCount.value++
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
  }
})
