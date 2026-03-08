import { describe, it, expect } from 'vitest'
import { haversineMeters, haversineKm, isImpossibleTravel, isWithinRadius } from '../geo.service'

describe('Geo Service', () => {
    // Known distance: Baghdad (33.3157, 44.3661) to Basra (30.5085, 47.7834) ≈ 465 km
    const baghdad: [number, number] = [44.3661, 33.3157]
    const basra: [number, number] = [47.7834, 30.5085]

    // Close points (same area in Baghdad)
    const bagPoint1: [number, number] = [44.3661, 33.3157]
    const bagPoint2: [number, number] = [44.3700, 33.3160] // ~400m away

    describe('haversineMeters', () => {
        it('should calculate distance between Baghdad and Basra ~449km', () => {
            const distance = haversineMeters(baghdad, basra)
            expect(distance).toBeGreaterThan(440_000)
            expect(distance).toBeLessThan(460_000)
        })

        it('should return 0 for same point', () => {
            const distance = haversineMeters(baghdad, baghdad)
            expect(distance).toBe(0)
        })

        it('should calculate close distances correctly', () => {
            const distance = haversineMeters(bagPoint1, bagPoint2)
            expect(distance).toBeGreaterThan(300)
            expect(distance).toBeLessThan(500)
        })
    })

    describe('haversineKm', () => {
        it('should return km between Baghdad and Basra', () => {
            const distance = haversineKm(baghdad, basra)
            expect(distance).toBeGreaterThan(440)
            expect(distance).toBeLessThan(460)
        })
    })

    describe('isImpossibleTravel', () => {
        it('should detect impossible travel (465km in 5 minutes)', () => {
            const result = isImpossibleTravel(baghdad, basra, 3 * 60_000) // 3 minutes
            expect(result).toBe(true)
        })

        it('should not flag normal travel (close points, 5 minutes)', () => {
            const result = isImpossibleTravel(bagPoint1, bagPoint2, 3 * 60_000)
            expect(result).toBe(false)
        })

        it('should not flag travel longer than window', () => {
            const result = isImpossibleTravel(baghdad, basra, 6 * 60_000) // 6 minutes (> 5 min window)
            expect(result).toBe(false)
        })
    })

    describe('isWithinRadius', () => {
        it('should approve close visits', () => {
            const result = isWithinRadius(bagPoint1, bagPoint2, 500)
            expect(result.isValid).toBe(true)
            expect(result.distance).toBeLessThan(500)
        })

        it('should reject distant visits', () => {
            const result = isWithinRadius(baghdad, basra, 500)
            expect(result.isValid).toBe(false)
            expect(result.distance).toBeGreaterThan(10000)
        })

        it('should use custom radius', () => {
            const result = isWithinRadius(bagPoint1, bagPoint2, 100) // Very tight radius
            expect(result.isValid).toBe(false)
        })
    })
})
