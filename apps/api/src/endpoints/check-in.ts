import type { PayloadHandler } from 'payload'
import { validateBody, checkInSchema, checkOutSchema } from '../lib/validators'
import { rateLimitResponse, RATE_LIMITS } from '../lib/rate-limiter'
import { haversineMeters, isImpossibleTravel, isWithinRadius, isSameLocation } from '../services/geo.service'
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
  const gpsAccuracy = (body as any)?.gpsAccuracy as number | undefined

  // Flag: reject high GPS inaccuracy (likely GPS spoofer/VPN)
  const suspiciousAccuracy = typeof gpsAccuracy === 'number' && gpsAccuracy > 200

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

  // Detect "same location" pattern (rep always checks in from ~same coords = home)
  let suspiciousPattern = false
  try {
    const last10 = await payload.find({
      collection: 'visits',
      where: { representative: { equals: user.id } },
      sort: '-checkInTime',
      limit: 10,
      depth: 0,
      overrideAccess: true,
    })
    const pastLocations = last10.docs
      .filter((v: any) => v.checkInLocation && Array.isArray(v.checkInLocation))
      .map((v: any) => v.checkInLocation as [number, number])
    pastLocations.unshift(location)
    suspiciousPattern = isSameLocation(pastLocations, 50, 4)
  } catch { /* noop */ }

  if (suspiciousAccuracy || suspiciousPattern) isValid = false

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

  // Alert supervisors on suspicious visits
  if (!isValid || impossibleTravel || suspiciousPattern || suspiciousAccuracy) {
    const userName = (user as any).name || user.email
    const flags = [
      !isValid && distance > 200 ? `بعيد ${distance}م` : '',
      impossibleTravel ? 'سفر مستحيل' : '',
      suspiciousPattern ? 'نمط موقع مكرر (محتمل من المنزل)' : '',
      suspiciousAccuracy ? `دقة GPS ضعيفة (${gpsAccuracy}م)` : '',
    ].filter(Boolean).join('، ')

    try {
      const { sendTelegramMessage } = await import('../lib/telegram')
      const supervisors = await payload.find({
        collection: 'users',
        where: {
          and: [
            { role: { in: ['super-admin', 'supervisor'] } },
            { isActive: { equals: true } },
            { telegramChatId: { exists: true } },
          ],
        },
        limit: 20,
        depth: 0,
        overrideAccess: true,
      })

      const alertMsg = [
        `🚨 <b>تنبيه زيارة مشبوهة</b>`,
        ``,
        `👤 المندوب: <b>${userName}</b>`,
        `🏢 العميل: <b>${(client as any).name || clientId}</b>`,
        `⚠️ الأسباب: ${flags}`,
        `📍 المسافة: ${distance} متر`,
        `🕐 الوقت: ${new Date().toLocaleString('ar-IQ')}`,
      ].join('\n')

      for (const sup of supervisors.docs) {
        const chatId = (sup as any).telegramChatId
        if (chatId) sendTelegramMessage(payload, chatId, alertMsg).catch(() => {})
      }
    } catch { /* noop */ }
  }

  log.info({ userId: user.id, clientId, distance, isValid, impossibleTravel, suspiciousPattern, suspiciousAccuracy, gpsAccuracy }, 'Check-in recorded')

  return Response.json({
    visit,
    distance,
    isValid,
    impossibleTravel,
    suspiciousPattern,
    message: impossibleTravel
      ? 'تحذير: تم اكتشاف انتقال مستحيل!'
      : suspiciousPattern
        ? 'تنبيه: نمط موقع مكرر — يرجى التأكد من تواجدك الفعلي'
        : suspiciousAccuracy
          ? 'تحذير: دقة GPS ضعيفة — لا يمكن التحقق من موقعك'
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

  // Enforce minimum visit duration (5 minutes)
  const checkInTime = new Date((existingVisit as any).checkInTime).getTime()
  const now = Date.now()
  const durationMinutes = Math.round((now - checkInTime) / 60000)
  const MIN_DURATION = 5

  if (durationMinutes < MIN_DURATION) {
    return Response.json({
      error: `مدة الزيارة ${durationMinutes} دقائق — أقل من الحد الأدنى (${MIN_DURATION} دقائق). لا يمكن تسجيل الخروج بعد.`,
    }, { status: 400 })
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

  log.info({ userId: user.id, visitId, durationMinutes }, 'Check-out recorded')

  return Response.json({ visit, durationMinutes, message: `تم تسجيل الخروج بنجاح (${durationMinutes} دقيقة)` })
}
