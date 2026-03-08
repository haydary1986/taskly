/**
 * In-memory rate limiter (no Redis dependency).
 * Tracks request counts per key within a sliding window.
 */

interface RateLimitEntry {
    count: number
    resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key)
    }
}, 5 * 60_000)

interface RateLimitOptions {
    /** Max number of requests within the window */
    maxAttempts: number
    /** Time window in milliseconds */
    windowMs: number
}

interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetAt: number
}

/**
 * Check if a request is within the rate limit.
 * @param key Unique key (e.g. IP, userId, endpoint+IP)
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || entry.resetAt <= now) {
        // First request or window expired
        store.set(key, { count: 1, resetAt: now + options.windowMs })
        return { allowed: true, remaining: options.maxAttempts - 1, resetAt: now + options.windowMs }
    }

    entry.count++
    if (entry.count > options.maxAttempts) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt }
    }

    return { allowed: true, remaining: options.maxAttempts - entry.count, resetAt: entry.resetAt }
}

/**
 * Rate limit middleware for Payload endpoints.
 * Returns a 429 response if the limit is exceeded.
 */
export function rateLimitResponse(key: string, options: RateLimitOptions): Response | null {
    const result = checkRateLimit(key, options)
    if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
        return Response.json(
            { error: 'تم تجاوز الحد الأقصى للطلبات. يرجى المحاولة لاحقاً.' },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(result.resetAt),
                },
            },
        )
    }
    return null
}

/** Pre-configured limiters */
export const RATE_LIMITS = {
    login: { maxAttempts: 5, windowMs: 60_000 },           // 5 per minute
    magicLogin: { maxAttempts: 3, windowMs: 10 * 60_000 }, // 3 per 10 min
    checkIn: { maxAttempts: 10, windowMs: 60_000 },        // 10 per minute
    api: { maxAttempts: 100, windowMs: 60_000 },            // 100 per minute (general)
} as const
