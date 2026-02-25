export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // Only register if authenticated and browser supports push
  if (!authStore.isAuthenticated) return
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  // Register push service worker
  try {
    await navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
  } catch (err) {
    console.warn('[Push] SW registration failed:', err)
  }

  // Auto-subscribe if permission was already granted
  if (Notification.permission === 'granted') {
    const push = usePushNotifications()
    await push.subscribe()
  }
})
