import type { PayloadHandler } from 'payload'
import crypto from 'crypto'

export const magicLogin: PayloadHandler = async (req) => {
  const { payload } = req

  const body = await req.json?.() as { email?: string } | undefined
  if (!body?.email) {
    return Response.json({ error: 'يرجى إدخال البريد الإلكتروني' }, { status: 400 })
  }

  // Find user by email
  const users = await payload.find({
    collection: 'users',
    where: { email: { equals: body.email } },
    limit: 1,
  })

  if (users.docs.length === 0) {
    // Don't reveal if user exists
    return Response.json({ message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط الدخول' })
  }

  const user = users.docs[0] as any

  // Generate magic token
  const token = crypto.randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  // Store token (simple approach - store in user metadata)
  await payload.update({
    collection: 'users',
    id: user.id,
    data: {
      // We'll use a custom field or just log it
    },
  })

  // In production, send via email/telegram
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
  const magicLink = `${frontendUrl}/magic-login?token=${token}&email=${encodeURIComponent(body.email)}`

  payload.logger.info({ msg: `Magic login link for ${body.email}: ${magicLink}` })

  return Response.json({
    message: 'إذا كان البريد مسجلاً، سيتم إرسال رابط الدخول',
    // In dev mode, return the link
    ...(process.env.NODE_ENV !== 'production' ? { devLink: magicLink } : {}),
  })
}
