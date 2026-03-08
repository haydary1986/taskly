import type { Payload } from 'payload'
import { notifyUserViaTelegram } from './telegram'
import { sendPushNotification } from './push'
import { socketService } from '../socket/index'
import { createLogger } from './logger'

const log = createLogger('notify')

interface NotifyOptions {
  recipientId: string
  type: string
  title: string
  message: string
  link?: string
  metadata?: any
}

/**
 * Unified notification sender.
 * Creates an in-app notification + sends Telegram + Push + Socket.io
 */
export async function sendNotification(
  payload: Payload,
  options: NotifyOptions,
): Promise<void> {
  const { recipientId, type, title, message, link, metadata } = options

  // 1. Create in-app notification
  try {
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: recipientId,
        type: type as any,
        title,
        message,
        link,
        metadata,
        isRead: false,
      },
      overrideAccess: true,
    })
  } catch (err) {
    log.error({ err, recipientId }, 'Failed to create notification')
  }

  // 2. Socket.io real-time
  socketService.emitToUser(recipientId, 'notification', { type, title, message, link })

  // 3. Telegram (non-blocking)
  const telegramText = `<b>${title}</b>\n${message}`
  notifyUserViaTelegram(payload, recipientId, telegramText)
    .then((sent) => log.debug({ recipientId, sent }, 'Telegram notification'))
    .catch((err) => log.error({ err, recipientId }, 'Telegram notification failed'))

  // 4. Push notification (non-blocking)
  sendPushNotification(payload, recipientId, { title, body: message, url: link })
    .catch((err) => log.error({ err, recipientId }, 'Push notification failed'))
}
