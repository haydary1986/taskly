interface QueuedRequest {
  id: string
  url: string
  method: string
  body?: any
  timestamp: number
}

const QUEUE_KEY = 'taskly_offline_queue'

export function useOfflineQueue() {
  function getQueue(): QueuedRequest[] {
    if (!import.meta.client) return []
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    } catch {
      return []
    }
  }

  function saveQueue(queue: QueuedRequest[]) {
    if (import.meta.client) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    }
  }

  function addToQueue(url: string, method: string, body?: any) {
    const queue = getQueue()
    queue.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      url,
      method,
      body,
      timestamp: Date.now(),
    })
    saveQueue(queue)
  }

  function removeFromQueue(id: string) {
    const queue = getQueue().filter((q) => q.id !== id)
    saveQueue(queue)
  }

  function clearQueue() {
    saveQueue([])
  }

  async function processQueue() {
    const api = useApi()
    const queue = getQueue()
    if (queue.length === 0) return { processed: 0, failed: 0 }

    let processed = 0
    let failed = 0

    for (const item of queue) {
      try {
        if (item.method === 'POST') {
          await api.post(item.url, item.body)
        } else if (item.method === 'PATCH') {
          await api.patch(item.url, item.body)
        } else if (item.method === 'PUT') {
          await api.put(item.url, item.body)
        } else if (item.method === 'DELETE') {
          await api.del(item.url)
        }
        removeFromQueue(item.id)
        processed++
      } catch {
        failed++
      }
    }

    return { processed, failed }
  }

  const queueLength = computed(() => getQueue().length)

  return { addToQueue, removeFromQueue, clearQueue, processQueue, getQueue, queueLength }
}
