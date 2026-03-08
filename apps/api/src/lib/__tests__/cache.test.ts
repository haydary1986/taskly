import { describe, it, expect, vi } from 'vitest'
import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidatePrefix, cacheGetOrSet } from '../cache'

describe('Cache', () => {
    it('should return null for non-existent keys', () => {
        expect(cacheGet('nonexistent-key')).toBeNull()
    })

    it('should store and retrieve values', () => {
        cacheSet('test-key-1', { name: 'test' }, 60000)
        const result = cacheGet<{ name: string }>('test-key-1')
        expect(result).toEqual({ name: 'test' })
    })

    it('should return null for expired values', async () => {
        cacheSet('test-expired', 'data', 50) // 50ms TTL
        await new Promise((r) => setTimeout(r, 60))
        expect(cacheGet('test-expired')).toBeNull()
    })

    it('should invalidate a specific key', () => {
        cacheSet('test-invalidate', 'data', 60000)
        expect(cacheGet('test-invalidate')).toBe('data')
        cacheInvalidate('test-invalidate')
        expect(cacheGet('test-invalidate')).toBeNull()
    })

    it('should invalidate keys by prefix', () => {
        cacheSet('prefix:a', 'a', 60000)
        cacheSet('prefix:b', 'b', 60000)
        cacheSet('other:c', 'c', 60000)

        cacheInvalidatePrefix('prefix:')

        expect(cacheGet('prefix:a')).toBeNull()
        expect(cacheGet('prefix:b')).toBeNull()
        expect(cacheGet('other:c')).toBe('c')
    })

    it('cacheGetOrSet should use cached value if available', async () => {
        cacheSet('gos-cached', 42, 60000)
        const factory = vi.fn(() => Promise.resolve(99))

        const result = await cacheGetOrSet('gos-cached', 60000, factory)
        expect(result).toBe(42)
        expect(factory).not.toHaveBeenCalled()
    })

    it('cacheGetOrSet should call factory when no cached value', async () => {
        const factory = vi.fn(() => Promise.resolve(99))

        const result = await cacheGetOrSet('gos-new-' + Date.now(), 60000, factory)
        expect(result).toBe(99)
        expect(factory).toHaveBeenCalledOnce()
    })
})
