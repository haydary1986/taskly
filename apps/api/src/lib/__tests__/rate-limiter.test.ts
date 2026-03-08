import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '../rate-limiter'

describe('Rate Limiter', () => {
    beforeEach(() => {
        // Reset by using a unique key per test
    })

    it('should allow requests within the limit', () => {
        const key = `test-allow-${Date.now()}`
        const result = checkRateLimit(key, { maxAttempts: 3, windowMs: 60000 })
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(2)
    })

    it('should block requests exceeding the limit', () => {
        const key = `test-block-${Date.now()}`
        const opts = { maxAttempts: 2, windowMs: 60000 }

        checkRateLimit(key, opts) // 1st
        checkRateLimit(key, opts) // 2nd
        const result = checkRateLimit(key, opts) // 3rd — should be blocked

        expect(result.allowed).toBe(false)
        expect(result.remaining).toBe(0)
    })

    it('should reset after the window expires', async () => {
        const key = `test-reset-${Date.now()}`
        const opts = { maxAttempts: 1, windowMs: 50 } // Very short window

        checkRateLimit(key, opts) // 1st — uses the quota
        const blocked = checkRateLimit(key, opts) // 2nd — should be blocked
        expect(blocked.allowed).toBe(false)

        // Wait for window to expire
        await new Promise((r) => setTimeout(r, 60))

        const afterReset = checkRateLimit(key, opts) // Should be allowed now
        expect(afterReset.allowed).toBe(true)
        expect(afterReset.remaining).toBe(0)
    })

    it('rateLimitResponse should return null when allowed', () => {
        const key = `test-resp-ok-${Date.now()}`
        const result = rateLimitResponse(key, { maxAttempts: 5, windowMs: 60000 })
        expect(result).toBeNull()
    })

    it('rateLimitResponse should return 429 Response when blocked', () => {
        const key = `test-resp-block-${Date.now()}`
        const opts = { maxAttempts: 1, windowMs: 60000 }

        rateLimitResponse(key, opts) // Use the first attempt
        const response = rateLimitResponse(key, opts) // Should be blocked

        expect(response).not.toBeNull()
        expect(response!.status).toBe(429)
    })

    it('should track remaining attempts correctly', () => {
        const key = `test-remaining-${Date.now()}`
        const opts = { maxAttempts: 5, windowMs: 60000 }

        expect(checkRateLimit(key, opts).remaining).toBe(4)
        expect(checkRateLimit(key, opts).remaining).toBe(3)
        expect(checkRateLimit(key, opts).remaining).toBe(2)
        expect(checkRateLimit(key, opts).remaining).toBe(1)
        expect(checkRateLimit(key, opts).remaining).toBe(0)
        expect(checkRateLimit(key, opts).allowed).toBe(false)
    })

    it('pre-configured limits should have correct values', () => {
        expect(RATE_LIMITS.login.maxAttempts).toBe(5)
        expect(RATE_LIMITS.magicLogin.maxAttempts).toBe(3)
        expect(RATE_LIMITS.checkIn.maxAttempts).toBe(10)
        expect(RATE_LIMITS.api.maxAttempts).toBe(100)
    })
})
