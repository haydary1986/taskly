const isOnline = ref(true)
const wasOffline = ref(false)

export function useNetworkStatus() {
  if (import.meta.client) {
    isOnline.value = navigator.onLine

    const handleOnline = () => {
      isOnline.value = true
      if (wasOffline.value) {
        wasOffline.value = false
      }
    }

    const handleOffline = () => {
      isOnline.value = false
      wasOffline.value = true
    }

    onMounted(() => {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    })

    onUnmounted(() => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    })
  }

  return { isOnline: readonly(isOnline), wasOffline: readonly(wasOffline) }
}
