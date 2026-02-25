import type { PayloadHandler } from 'payload'

/** Get daily route for a specific representative on a specific date */
export const dailyRoute: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const url = new URL(req.url || '', 'http://localhost')
  const repId = url.searchParams.get('rep') || user.id
  const dateStr = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  // Only admins can view other reps' routes
  const isAdmin = ['super-admin', 'supervisor', 'auditor'].includes(user.role as string)
  if (repId !== user.id && !isAdmin) {
    return Response.json({ error: 'غير مصرح لعرض مسار مندوب آخر' }, { status: 403 })
  }

  const dayStart = new Date(dateStr)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dateStr)
  dayEnd.setHours(23, 59, 59, 999)

  const visits = await payload.find({
    collection: 'visits',
    where: {
      representative: { equals: repId },
      checkInTime: {
        greater_than: dayStart.toISOString(),
        less_than: dayEnd.toISOString(),
      },
    },
    sort: 'checkInTime',
    depth: 2,
    limit: 100,
  })

  // Build route data
  const route: any[] = []
  let totalDistance = 0
  let totalDuration = 0
  let validVisits = 0
  let invalidVisits = 0

  for (let i = 0; i < visits.docs.length; i++) {
    const visit = visits.docs[i] as any
    const clientName = typeof visit.client === 'object' ? visit.client.companyName || visit.client.name : visit.client

    const point: any = {
      visitId: visit.id,
      clientName,
      clientId: typeof visit.client === 'object' ? visit.client.id : visit.client,
      checkInTime: visit.checkInTime,
      checkOutTime: visit.checkOutTime,
      checkInLocation: visit.checkInLocation,
      checkOutLocation: visit.checkOutLocation,
      distance: visit.distance,
      isValid: visit.isValid,
      status: visit.status,
      notes: visit.notes,
      order: i + 1,
    }

    if (visit.isValid) validVisits++
    else invalidVisits++

    // Calculate duration if checked out
    if (visit.checkInTime && visit.checkOutTime) {
      const duration = new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime()
      point.durationMinutes = Math.round(duration / 60000)
      totalDuration += point.durationMinutes
    }

    // Calculate travel distance from previous visit
    if (i > 0 && visit.checkInLocation) {
      const prev = visits.docs[i - 1] as any
      const prevLoc = prev.checkOutLocation || prev.checkInLocation
      if (prevLoc && Array.isArray(prevLoc) && Array.isArray(visit.checkInLocation)) {
        const [lng1, lat1] = prevLoc as [number, number]
        const [lng2, lat2] = visit.checkInLocation as [number, number]
        const R = 6371
        const dLat = ((lat2 - lat1) * Math.PI) / 180
        const dLon = ((lng2 - lng1) * Math.PI) / 180
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
        const travelKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        point.travelFromPreviousKm = Math.round(travelKm * 100) / 100
        totalDistance += travelKm
      }
    }

    route.push(point)
  }

  // Get rep info
  let repName = user.name
  if (repId !== user.id) {
    try {
      const rep = await payload.findByID({ collection: 'users', id: repId, depth: 0 })
      repName = (rep as any).name
    } catch { /* ignore */ }
  }

  return Response.json({
    representative: { id: repId, name: repName },
    date: dateStr,
    route,
    summary: {
      totalVisits: visits.docs.length,
      validVisits,
      invalidVisits,
      totalDurationMinutes: totalDuration,
      totalDistanceKm: Math.round(totalDistance * 100) / 100,
    },
  })
}
