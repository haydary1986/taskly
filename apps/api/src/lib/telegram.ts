import type { Payload } from 'payload'

/** Send a Telegram message to a user by their chat ID */
export async function sendTelegramMessage(
  payload: Payload,
  chatId: string,
  text: string,
): Promise<boolean> {
  try {
    const settings = await payload.findGlobal({ slug: 'system-settings' })
    if (!settings.telegramEnabled || !settings.telegramBotToken) {
      console.log('[Telegram] Skipped: enabled=', settings.telegramEnabled, 'token=', !!settings.telegramBotToken)
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
    console.error('[Telegram] Send failed:', err)
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
      console.log(`[Telegram] User ${userId} has no telegramChatId`)
      return false
    }
    console.log(`[Telegram] Sending to user ${user.name} (chatId: ${user.telegramChatId})`)
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
    const settings = await payload.findGlobal({ slug: 'system-settings' })
    if (!settings.telegramBotToken) return null

    const botUsername = settings.telegramBotUsername as string
    if (!botUsername) return null

    // Encode userId as base64 for the start parameter
    const token = Buffer.from(userId).toString('base64url')
    return `https://t.me/${botUsername}?start=${token}`
  } catch {
    return null
  }
}
