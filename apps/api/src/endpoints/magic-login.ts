import type { PayloadHandler } from 'payload'
import crypto from 'crypto'
import { validateBody, magicLoginSchema } from '../lib/validators'
import { rateLimitResponse, RATE_LIMITS } from '../lib/rate-limiter'
import { createLogger } from '../lib/logger'

const log = createLogger('magic-login')

export const magicLogin: PayloadHandler = async (req) => {
  const { payload } = req

  // Rate limit
  const ip = req.headers?.get?.('x-forwarded-for') || 'unknown'
  const rl = rateLimitResponse(`magic:${ip}`, RATE_LIMITS.magicLogin)
  if (rl) return rl

  const body = await req.json?.()
  const validation = validateBody(magicLoginSchema, body)
  if (!validation.success) return validation.response

  const { email } = validation.data

  // Find user by email
  const users = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })

  if (users.docs.length === 0) {
    // Don't reveal if user exists
    return Response.json({ message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط الدخول' })
  }

  const user = users.docs[0] as any

  // Generate magic token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  // Store token in MagicTokens collection
  await payload.create({
    collection: 'magic-tokens',
    data: {
      user: user.id,
      token,
      expiresAt: expiresAt.toISOString(),
      used: false,
    },
    overrideAccess: true,
  })

  log.info({ tokenPrefix: token.substring(0, 8), userId: user.id }, 'Magic token created and stored')

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
  const magicLink = `${frontendUrl}/magic-login?token=${token}&email=${encodeURIComponent(email)}`
  log.info({ frontendUrl, linkLength: magicLink.length }, 'Magic link generated')

  // Send via Telegram if user has linked account
  if (user.telegramChatId) {
    try {
      const { notifyUserViaTelegram } = await import('../lib/telegram')
      await notifyUserViaTelegram(
        payload,
        user.id,
        `🔑 <b>رابط الدخول السحري</b>\n\nاضغط للدخول:\n${magicLink}\n\n⏰ ينتهي خلال 15 دقيقة`,
      )
    } catch (err) {
      log.error({ err }, 'Failed to send magic link via Telegram')
    }
  }

  // Try to send via email
  try {
    await payload.sendEmail({
      to: email,
      subject: 'رابط الدخول السحري - Taskly',
      html: `
        <div dir="rtl" style="font-family: 'IBM Plex Sans Arabic', sans-serif; padding: 20px;">
          <h2>🔑 رابط الدخول السحري</h2>
          <p>مرحباً ${user.name}،</p>
          <p>اضغط على الزر أدناه للدخول إلى حسابك:</p>
          <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            دخول إلى Taskly
          </a>
          <p style="color: #666; font-size: 14px;">⏰ ينتهي هذا الرابط خلال 15 دقيقة</p>
        </div>
      `,
    })
  } catch (err) {
    log.warn({ err }, 'Email not configured, magic link logged')
  }

  log.info({ email: email, userId: user.id }, 'Magic login link generated')

  return Response.json({
    message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط الدخول',
    // In dev mode, return the link
    ...(process.env.NODE_ENV !== 'production' ? { devLink: magicLink } : {}),
  })
}
