import type { PayloadHandler } from 'payload'
import { validateBody, pushSubscribeSchema, pushUnsubscribeSchema } from '../lib/validators'
import { createLogger } from '../lib/logger'

const log = createLogger('push')

/** Save a push subscription for the current user */
export const pushSubscribe: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json?.()
  const validation = validateBody(pushSubscribeSchema, body)
  if (!validation.success) return validation.response

  const { subscription } = validation.data

  // Check if this subscription already exists for this user
  const existing = await payload.find({
    collection: 'push-subscriptions',
    where: {
      user: { equals: user.id },
      endpoint: { equals: subscription.endpoint },
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'push-subscriptions',
      id: existing.docs[0].id,
      data: { subscription },
    })
  } else {
    await payload.create({
      collection: 'push-subscriptions',
      data: {
        user: user.id,
        endpoint: subscription.endpoint,
        subscription,
      },
    })
  }

  log.info({ userId: user.id }, 'Push subscription registered')
  return Response.json({ message: 'تم تسجيل الاشتراك بنجاح' })
}

/** Remove a push subscription */
export const pushUnsubscribe: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json?.()
  const validation = validateBody(pushUnsubscribeSchema, body)
  if (!validation.success) return validation.response

  const { endpoint } = validation.data

  await payload.delete({
    collection: 'push-subscriptions',
    where: {
      user: { equals: user.id },
      endpoint: { equals: endpoint },
    },
  })

  log.info({ userId: user.id }, 'Push subscription removed')
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
