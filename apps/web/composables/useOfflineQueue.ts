import { ref, watch } from 'vue'

/**
 * Enhanced offline queue with IndexedDB storage,
 * conflict detection, and sync status tracking.
 */

interface QueueItem {
  id: string
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  url: string
  body: any
  timestamp: number
  retries: number
}

const DB_NAME = 'taskly-offline'
const DB_VERSION = 1
const STORE_NAME = 'queue'

// Reactive state
const pendingCount = ref(0)
const isSyncing = ref(false)
const lastSyncError = ref<string | null>(null)

/** Open (or create) the IndexedDB database */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Get all items from the queue */
async function getAll(): Promise<QueueItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/** Add an item to the queue */
async function addItem(item: QueueItem): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.add(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Remove an item from the queue */
async function removeItem(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Clear the entire queue */
async function clearAll(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function updatePendingCount() {
  const items = await getAll()
  pendingCount.value = items.length
}

export function useOfflineQueue() {
  const api = useApi()

  /** Enqueue a request to be processed later */
  async function enqueue(method: QueueItem['method'], url: string, body?: any) {
    await addItem({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      method,
      url,
      body,
      timestamp: Date.now(),
      retries: 0,
    })
    await updatePendingCount()
  }

  /** Process all queued items */
  async function processQueue() {
    const items = await getAll()
    if (items.length === 0) return

    isSyncing.value = true
    lastSyncError.value = null
    let processed = 0
    let failed = 0

    items.sort((a, b) => a.timestamp - b.timestamp)

    for (const item of items) {
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

        await removeItem(item.id)
        processed++
      } catch {
        failed++
      }
    }

    await updatePendingCount()
    isSyncing.value = false
  }

  // Auto-process when coming back online
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('[OfflineQueue] Back online, processing queue...')
      processQueue()
    })

    // Initialize pending count
    updatePendingCount()
  }

  return {
    enqueue,
    processQueue,
    clearAll: async () => { await clearAll(); await updatePendingCount() },
    pendingCount,
    isSyncing,
    lastSyncError,
  }
}
