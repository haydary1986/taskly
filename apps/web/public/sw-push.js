// Push notification handler for service worker
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.svg',
      badge: data.badge || '/icons/icon-192x192.svg',
      dir: 'rtl',
      lang: 'ar',
      data: { url: data.url || '/' },
      vibrate: [100, 50, 100],
      actions: [{ action: 'open', title: 'فتح' }],
    }

    event.waitUntil(self.registration.showNotification(data.title || 'Taskly', options))
  } catch {
    // fallback for plain text
    event.waitUntil(
      self.registration.showNotification('Taskly', {
        body: event.data.text(),
        icon: '/icons/icon-192x192.svg',
        dir: 'rtl',
      }),
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})
