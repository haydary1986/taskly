import type { Payload } from 'payload'
import { createLogger } from './logger'

const log = createLogger('telegram')

/** Send a Telegram message to a user by their chat ID */
export async function sendTelegramMessage(
  payload: Payload,
  chatId: string,
  text: string,
): Promise<boolean> {
  try {
    const settings = await payload.findGlobal({
      slug: 'system-settings',
      overrideAccess: true
    }) as any
    if (!settings.telegramEnabled || !settings.telegramBotToken) {
      log.debug({ enabled: settings.telegramEnabled, hasToken: !!settings.telegramBotToken }, 'Telegram skipped')
      return false
    }
    const res = await fetch(
      `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      },
    )
    const data = await res.json()
    return data.ok === true
  } catch (err) {
    log.error({ err, chatId }, 'Telegram send failed')
    return false
  }
}

/** Send Telegram notification to a user by their user ID */
export async function notifyUserViaTelegram(
  payload: Payload,
  userId: string,
  text: string,
): Promise<boolean> {
  try {
    const user = await payload.findByID({ collection: 'users', id: userId })
    if (!user?.telegramChatId) {
      log.debug({ userId }, 'User has no telegramChatId')
      return false
    }
    log.debug({ userId, name: user.name }, 'Sending Telegram notification')
    return sendTelegramMessage(payload, user.telegramChatId as string, text)
  } catch {
    return false
  }
}

/** Get the Telegram bot deep link for a user to link their account */
export async function getTelegramLinkUrl(
  payload: Payload,
  userId: string,
): Promise<string | null> {
  try {
    const settings = await payload.findGlobal({
      slug: 'system-settings',
      overrideAccess: true
    }) as any // Using any to avoid TS errors
    if (!settings.telegramBotToken) {
      log.debug('telegramBotToken is missing')
      return null
    }

    const botUsername = settings.telegramBotUsername as string
    if (!botUsername) {
      log.debug('telegramBotUsername is missing')
      return null
    }

    // Encode userId as base64 for the start parameter
    const token = Buffer.from(userId).toString('base64url')
    return `https://t.me/${botUsername}?start=${token}`
  } catch (err: any) {
    log.error({ err: err.message || err }, 'getTelegramLinkUrl failed')
    return null
  }
}
