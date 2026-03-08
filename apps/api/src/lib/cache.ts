/**
 * Simple in-memory TTL cache.
 * Stores key-value pairs with expiration timestamps.
 */

interface CacheEntry<T> {
    value: T
    expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()

// Cleanup expired entries every 2 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of cache) {
        if (entry.expiresAt <= now) cache.delete(key)
    }
}, 2 * 60_000)

/** Get a cached value, or null if expired/missing */
export function cacheGet<T>(key: string): T | null {
    const entry = cache.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
        cache.delete(key)
        return null
    }
    return entry.value as T
}

/** Set a cached value with TTL in milliseconds */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/** Invalidate a specific cache key */
export function cacheInvalidate(key: string): void {
    cache.delete(key)
}

/** Invalidate all cache keys starting with a given prefix */
export function cacheInvalidatePrefix(prefix: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) cache.delete(key)
    }
}

/** Get or compute: returns cached value if available, otherwise runs factory and caches result */
export async function cacheGetOrSet<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const cached = cacheGet<T>(key)
    if (cached !== null) return cached
    const value = await factory()
    cacheSet(key, value, ttlMs)
    return value
}
