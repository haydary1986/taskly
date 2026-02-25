import type { PayloadHandler } from 'payload'

export const checkIn: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json?.() as {
    clientId: string
    location: [number, number]
    photo?: string
  } | undefined

  if (!body?.clientId || !body?.location) {
    return Response.json({ error: 'يرجى تحديد العميل والموقع' }, { status: 400 })
  }

  // Fetch client to verify distance
  const client = await payload.findByID({ collection: 'clients', id: body.clientId })
  if (!client) return Response.json({ error: 'العميل غير موجود' }, { status: 404 })

  let distance = 0
  let isValid = true
  if (client.location && Array.isArray(client.location)) {
    const [cLng, cLat] = client.location as [number, number]
    const [vLng, vLat] = body.location
    // Haversine distance in meters
    const R = 6371000
    const dLat = ((vLat - cLat) * Math.PI) / 180
    const dLon = ((vLng - cLng) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((cLat * Math.PI) / 180) * Math.cos((vLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
    isValid = distance <= 500 // 500m radius
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
      const [lLng, lLat] = last.checkInLocation as [number, number]
      const [vLng, vLat] = body.location
      const R = 6371000
      const dLat = ((vLat - lLat) * Math.PI) / 180
      const dLon = ((vLng - lLng) * Math.PI) / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lLat * Math.PI) / 180) * Math.cos((vLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
      const travelDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      if (travelDist > 50000) {
        impossibleTravel = true
        isValid = false
      }
    }
  }

  const visit = await payload.create({
    collection: 'visits',
    data: {
      client: body.clientId,
      representative: user.id,
      status: 'checked-in',
      checkInTime: new Date().toISOString(),
      checkInLocation: body.location,
      checkInPhoto: body.photo || undefined,
      distance,
      isValid,
    },
    req,
  })

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

  const body = await req.json?.() as { visitId: string; location: [number, number] } | undefined
  if (!body?.visitId) return Response.json({ error: 'يرجى تحديد الزيارة' }, { status: 400 })

  const visit = await payload.update({
    collection: 'visits',
    id: body.visitId,
    data: {
      status: 'checked-out',
      checkOutTime: new Date().toISOString(),
      checkOutLocation: body.location || undefined,
    },
    req,
  })

  return Response.json({ visit, message: 'تم تسجيل الخروج بنجاح' })
}
