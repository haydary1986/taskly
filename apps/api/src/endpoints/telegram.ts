import type { Payload, PayloadHandler } from 'payload'
import { getTelegramLinkUrl } from '../lib/telegram'

// Track last processed update ID to avoid reprocessing
let lastUpdateId = 0

/** Get the Telegram deep link for the current user to link their account */
export const telegramLink: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  // Check if already linked
  if (user.telegramChatId) {
    return Response.json({ linked: true, chatId: user.telegramChatId })
  }

  const url = await getTelegramLinkUrl(payload, user.id)
  if (!url) {
    return Response.json({ error: 'تيليجرام غير مفعل أو لم يتم إعداد البوت' }, { status: 400 })
  }

  return Response.json({ linked: false, url })
}

/** Check if the current user has linked their Telegram account */
export const telegramStatus: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  // Poll Telegram getUpdates to process any pending /start messages
  await processTelegramUpdates(payload)

  // Re-fetch user to get latest data
  const freshUser = await payload.findByID({ collection: 'users', id: user.id })
  return Response.json({ linked: !!freshUser.telegramChatId })
}

/** Unlink Telegram from the current user */
export const telegramUnlink: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { telegramChatId: '' },
    overrideAccess: true,
  })

  return Response.json({ success: true })
}

/**
 * Telegram Bot Webhook - receives updates from Telegram (for production with public URL)
 */
export const telegramWebhook: PayloadHandler = async (req) => {
  const { payload } = req

  const body = (await req.json?.()) as any
  if (!body?.message) return Response.json({ ok: true })

  await processStartMessage(payload, body.message)
  return Response.json({ ok: true })
}

/**
 * Poll Telegram getUpdates API and process /start messages.
 * Works without a public webhook URL (ideal for local development).
 */
async function processTelegramUpdates(payload: Payload) {
  try {
    const settings = await payload.findGlobal({ slug: 'system-settings', overrideAccess: true }) as any
    if (!settings.telegramBotToken) return

    const res = await fetch(
      `https://api.telegram.org/bot${settings.telegramBotToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=0&allowed_updates=["message"]`,
    )
    const data = await res.json() as any
    if (!data.ok || !data.result?.length) return

    for (const update of data.result) {
      lastUpdateId = update.update_id
      if (update.message) {
        await processStartMessage(payload, update.message)
      }
    }
  } catch (err) {
    console.error('[Telegram] getUpdates failed:', err)
  }
}

/** Process a single Telegram message - handle /start TOKEN */
async function processStartMessage(payload: Payload, message: any) {
  const chatId = message.chat?.id?.toString()
  const text = message.text || ''

  if (text.startsWith('/start ')) {
    const token = text.replace('/start ', '').trim()
    try {
      const userId = Buffer.from(token, 'base64url').toString()

      const user = await payload.findByID({ collection: 'users', id: userId })
      if (!user) {
        await sendBotMessage(payload, chatId, 'المستخدم غير موجود. يرجى المحاولة مرة أخرى من التطبيق.')
        return
      }

      await payload.update({
        collection: 'users',
        id: userId,
        data: { telegramChatId: chatId },
        overrideAccess: true,
      })

      await sendBotMessage(
        payload,
        chatId,
        `✅ تم ربط حسابك بنجاح!\n\nمرحباً ${user.name}، ستصلك الآن جميع إشعارات Taskly على تيليجرام.`,
      )
    } catch (err) {
      console.error('[Telegram] processStartMessage error:', err)
      await sendBotMessage(payload, chatId, 'حدث خطأ. يرجى المحاولة مرة أخرى.')
    }
  } else if (text === '/start') {
    await sendBotMessage(
      payload,
      chatId,
      'مرحباً بك في بوت Taskly! 🤖\n\nلربط حسابك، يرجى النقر على زر "ربط بتيليجرام" من داخل تطبيق Taskly.',
    )
  }
}

async function sendBotMessage(payload: Payload, chatId: string, text: string) {
  try {
    const settings = await payload.findGlobal({ slug: 'system-settings', overrideAccess: true }) as any
    if (!settings.telegramBotToken) return

    await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (err) {
    console.error('[Telegram] sendBotMessage failed:', err)
  }
}
