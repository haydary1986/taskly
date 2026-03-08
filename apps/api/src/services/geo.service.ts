/**
 * Geographic utility service.
 * Extracted Haversine distance calculation used across check-in and daily-route endpoints.
 */

const EARTH_RADIUS_METERS = 6_371_000
const EARTH_RADIUS_KM = 6_371

/** Calculate Haversine distance between two points in meters */
export function haversineMeters(
    point1: [number, number],
    point2: [number, number],
): number {
    const [lng1, lat1] = point1
    const [lng2, lat2] = point2
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2
    return Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

/** Calculate Haversine distance between two points in kilometers */
export function haversineKm(
    point1: [number, number],
    point2: [number, number],
): number {
    const [lng1, lat1] = point1
    const [lng2, lat2] = point2
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2
    return Math.round(EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100
}

/**
 * Check if travel between two locations within the given time is "impossible"
 * (e.g. > 50 km within 5 minutes, implying GPS spoofing)
 */
export function isImpossibleTravel(
    currentLocation: [number, number],
    previousLocation: [number, number],
    timeDiffMs: number,
    { maxDistanceKm = 50, maxTimeMs = 5 * 60_000 } = {},
): boolean {
    if (timeDiffMs > maxTimeMs) return false
    const distanceKm = haversineKm(currentLocation, previousLocation)
    return distanceKm > maxDistanceKm
}

/** Check if a visit is within acceptable distance from the client location */
export function isWithinRadius(
    visitLocation: [number, number],
    clientLocation: [number, number],
    radiusMeters = 500,
): { distance: number; isValid: boolean } {
    const distance = haversineMeters(visitLocation, clientLocation)
    return { distance, isValid: distance <= radiusMeters }
}
