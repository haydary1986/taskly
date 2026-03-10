import type { PayloadHandler } from 'payload'
import { validateBody, checkInSchema, checkOutSchema } from '../lib/validators'
import { rateLimitResponse, RATE_LIMITS } from '../lib/rate-limiter'
import { haversineMeters, isImpossibleTravel, isWithinRadius } from '../services/geo.service'
import { createLogger } from '../lib/logger'

const log = createLogger('check-in')

export const checkIn: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  // Rate limit
  const rl = rateLimitResponse(`checkin:${user.id}`, RATE_LIMITS.checkIn)
  if (rl) return rl

  const body = await req.json?.()
  const validation = validateBody(checkInSchema, body)
  if (!validation.success) return validation.response

  const { clientId, location, photo } = validation.data

  // Fetch client to verify distance
  const client = await payload.findByID({ collection: 'clients', id: clientId })
  if (!client) return Response.json({ error: 'العميل غير موجود' }, { status: 404 })

  let distance = 0
  let isValid = true
  if (client.location && Array.isArray(client.location)) {
    const result = isWithinRadius(location, client.location as [number, number])
    distance = result.distance
    isValid = result.isValid
  }

  // Check for impossible travel (last visit within 5 min but > 50km away)
  const recentVisits = await payload.find({
    collection: 'visits',
    where: {
      representative: { equals: user.id },
      checkInTime: { greater_than: new Date(Date.now() - 5 * 60000).toISOString() },
    },
    sort: '-checkInTime',
    limit: 1,
  })

  let impossibleTravel = false
  if (recentVisits.docs.length > 0) {
    const last = recentVisits.docs[0] as any
    if (last.checkInLocation && Array.isArray(last.checkInLocation)) {
      impossibleTravel = isImpossibleTravel(
        location,
        last.checkInLocation as [number, number],
        Date.now() - new Date(last.checkInTime).getTime(),
      )
      if (impossibleTravel) isValid = false
    }
  }

  const visit = await payload.create({
    collection: 'visits',
    data: {
      client: clientId,
      representative: user.id,
      status: 'checked-in',
      checkInTime: new Date().toISOString(),
      checkInLocation: location,
      checkInPhoto: photo || undefined,
      distance,
      isValid,
    },
    req,
  })

  log.info({ userId: user.id, clientId, distance, isValid, impossibleTravel }, 'Check-in recorded')

  return Response.json({
    visit,
    distance,
    isValid,
    impossibleTravel,
    message: impossibleTravel
      ? 'تحذير: تم اكتشاف انتقال مستحيل!'
      : isValid
        ? 'تم تسجيل الحضور بنجاح'
        : `تحذير: المسافة ${distance}م - بعيد عن موقع العميل`,
  })
}

export const checkOut: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json?.()
  const validation = validateBody(checkOutSchema, body)
  if (!validation.success) return validation.response

  const { visitId, location } = validation.data

  // Verify visit ownership
  const existingVisit = await payload.findByID({ collection: 'visits', id: visitId, depth: 0 })
  const repId = typeof (existingVisit as any).representative === 'object'
    ? (existingVisit as any).representative.id : (existingVisit as any).representative
  if (repId !== user.id) {
    return Response.json({ error: 'لا يمكنك تسجيل خروج زيارة غير خاصة بك' }, { status: 403 })
  }

  const visit = await payload.update({
    collection: 'visits',
    id: visitId,
    data: {
      status: 'checked-out',
      checkOutTime: new Date().toISOString(),
      checkOutLocation: location || undefined,
    },
    req,
  })

  log.info({ userId: user.id, visitId }, 'Check-out recorded')

  return Response.json({ visit, message: 'تم تسجيل الخروج بنجاح' })
}
