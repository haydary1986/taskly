import type { PayloadHandler } from 'payload'

/** Save a push subscription for the current user */
export const pushSubscribe: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = (await req.json?.()) as { subscription?: any } | undefined
  if (!body?.subscription) {
    return Response.json({ error: 'يرجى إرسال بيانات الاشتراك' }, { status: 400 })
  }

  // Check if this subscription already exists for this user
  const existing = await payload.find({
    collection: 'push-subscriptions',
    where: {
      user: { equals: user.id },
      endpoint: { equals: body.subscription.endpoint },
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    // Update existing subscription
    await payload.update({
      collection: 'push-subscriptions',
      id: existing.docs[0].id,
      data: { subscription: body.subscription },
    })
  } else {
    // Create new subscription
    await payload.create({
      collection: 'push-subscriptions',
      data: {
        user: user.id,
        endpoint: body.subscription.endpoint,
        subscription: body.subscription,
      },
    })
  }

  return Response.json({ message: 'تم تسجيل الاشتراك بنجاح' })
}

/** Remove a push subscription */
export const pushUnsubscribe: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = (await req.json?.()) as { endpoint?: string } | undefined
  if (!body?.endpoint) {
    return Response.json({ error: 'يرجى إرسال نقطة الاشتراك' }, { status: 400 })
  }

  await payload.delete({
    collection: 'push-subscriptions',
    where: {
      user: { equals: user.id },
      endpoint: { equals: body.endpoint },
    },
  })

  return Response.json({ message: 'تم إلغاء الاشتراك' })
}

/** Get VAPID public key */
export const pushVapidKey: PayloadHandler = async () => {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    return Response.json({ error: 'VAPID key not configured' }, { status: 500 })
  }
  return Response.json({ publicKey: key })
}
