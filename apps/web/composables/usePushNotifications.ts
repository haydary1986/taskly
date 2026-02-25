export function usePushNotifications() {
  const api = useApi()
  const isSupported = ref(false)
  const isSubscribed = ref(false)
  const permission = ref<NotificationPermission>('default')

  if (import.meta.client) {
    isSupported.value = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    permission.value = Notification.permission
  }

  async function requestPermission(): Promise<boolean> {
    if (!isSupported.value) return false

    const result = await Notification.requestPermission()
    permission.value = result

    if (result === 'granted') {
      await subscribe()
      return true
    }
    return false
  }

  async function subscribe() {
    try {
      const vapidRes = await api.get('/push-vapid-key')
      if (!vapidRes.publicKey) return

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidRes.publicKey) as BufferSource,
      })

      await api.post('/push-subscribe', { subscription: subscription.toJSON() })
      isSubscribed.value = true
    } catch (err) {
      console.error('[Push] Subscribe failed:', err)
    }
  }

  async function unsubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await api.post('/push-unsubscribe', { endpoint: subscription.endpoint })
        await subscription.unsubscribe()
      }
      isSubscribed.value = false
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err)
    }
  }

  // Check existing subscription on init
  async function checkSubscription() {
    if (!isSupported.value) return
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      isSubscribed.value = !!subscription
    } catch {}
  }

  return {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
