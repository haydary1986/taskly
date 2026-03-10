import type { PayloadHandler } from 'payload'

const submitTimestamps = new Map<string, number[]>()

/** GET /v1/public/services — List active products/services (no auth) */
export const publicServices: PayloadHandler = async (req) => {
  const { docs } = await req.payload.find({
    collection: 'products',
    where: { isActive: { equals: true } },
    sort: 'name',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })

  // Return only public-safe fields
  const services = docs.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    price: p.price,
    currency: p.currency,
    category: p.category,
    image: p.image,
  }))

  return Response.json({ services })
}

/** POST /v1/public/request-service — Submit a service request (no auth, rate limited) */
export const requestService: PayloadHandler = async (req) => {
  // Rate limit: max 3 requests per IP per hour
  const ip = req.headers.get?.('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get?.('x-real-ip')
    || 'unknown'

  const now = Date.now()
  const hourAgo = now - 3600000
  const ipTimestamps = submitTimestamps.get(ip) || []
  const recentSubmissions = ipTimestamps.filter((t) => t > hourAgo)

  if (recentSubmissions.length >= 3) {
    return Response.json({ error: 'تم تجاوز الحد المسموح. حاول لاحقاً.' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json!()
  } catch {
    return Response.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  const { companyName, contactName, email, phone, service, serviceName, message, budget } = body

  if (!companyName || !contactName || !email || !phone) {
    return Response.json({ error: 'جميع الحقول المطلوبة يجب تعبئتها' }, { status: 400 })
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'البريد الإلكتروني غير صالح' }, { status: 400 })
  }

  try {
    const doc = await req.payload.create({
      collection: 'service-requests',
      data: {
        companyName,
        contactName,
        email,
        phone,
        service: service || undefined,
        serviceName: serviceName || undefined,
        message: message || undefined,
        budget: budget || undefined,
        source: 'website',
      } as any,
      overrideAccess: true,
    })

    // Update rate limit
    recentSubmissions.push(now)
    submitTimestamps.set(ip, recentSubmissions)

    // Notify admins
    try {
      const admins = await req.payload.find({
        collection: 'users',
        where: { role: { in: ['super-admin', 'supervisor'] }, isActive: { equals: true } },
        limit: 10,
        depth: 0,
        overrideAccess: true,
      })

      for (const admin of admins.docs) {
        await req.payload.create({
          collection: 'notifications',
          data: {
            recipient: admin.id,
            type: 'system',
            title: 'طلب خدمة جديد',
            message: `طلب جديد من ${companyName} — ${contactName}`,
            link: '/service-requests',
          } as any,
          overrideAccess: true,
        })
      }
    } catch {
      // Don't fail the request if notifications fail
    }

    return Response.json({ success: true, message: 'تم استلام طلبك بنجاح. سنتواصل معك قريباً.' })
  } catch (err: any) {
    return Response.json({ error: 'حدث خطأ. حاول مرة أخرى.' }, { status: 500 })
  }
}
