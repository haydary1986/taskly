import type { Payload } from 'payload'

let webpush: any = null

async function getWebPush() {
  if (!webpush) {
    webpush = await import('web-push')
    const vapidPublic = process.env.VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@algo-nest.com'

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)
    }
  }
  return webpush
}

/** Send push notification to a specific user */
export async function sendPushNotification(
  payload: Payload,
  userId: string,
  notification: { title: string; body: string; url?: string },
): Promise<void> {
  try {
    const wp = await getWebPush()
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

    const subs = await payload.find({
      collection: 'push-subscriptions',
      where: { user: { equals: userId } },
      limit: 10,
    })

    const pushPayload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url || '/',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-192x192.svg',
    })

    for (const sub of subs.docs) {
      try {
        await wp.sendNotification(sub.subscription, pushPayload)
      } catch (err: any) {
        // Remove expired subscriptions (410 Gone)
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await payload.delete({ collection: 'push-subscriptions', id: sub.id })
        }
      }
    }
  } catch (err) {
    console.error('[Push] Send failed:', err)
  }
}
