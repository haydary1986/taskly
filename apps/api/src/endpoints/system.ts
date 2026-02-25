import type { PayloadHandler } from 'payload'

export const testTelegram: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user || user.role !== 'super-admin') {
    return Response.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const settings = await payload.findGlobal({ slug: 'system-settings' })
  if (!settings.telegramBotToken || !settings.telegramEnabled) {
    return Response.json({ error: 'تيليجرام غير مفعل أو لم يتم إدخال رمز البوت' }, { status: 400 })
  }

  const body = await req.json?.() as { chatId?: string; message?: string } | undefined
  const chatId = body?.chatId || (user as any).telegramChatId
  const message = body?.message || 'رسالة تجريبية من Taskly!'

  if (!chatId) {
    return Response.json({ error: 'يرجى تحديد معرف الدردشة' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })

    const data = await res.json()
    if (!data.ok) {
      return Response.json({ error: `خطأ من تيليجرام: ${data.description}` }, { status: 400 })
    }

    return Response.json({ message: 'تم إرسال الرسالة بنجاح' })
  } catch (err: any) {
    return Response.json({ error: `فشل الإرسال: ${err.message}` }, { status: 500 })
  }
}

export const testEmail: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user || user.role !== 'super-admin') {
    return Response.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const body = await req.json?.() as { to?: string } | undefined
  const to = body?.to || user.email

  try {
    await payload.sendEmail({
      to: to as string,
      subject: 'رسالة تجريبية من Taskly',
      html: '<div dir="rtl"><h2>مرحباً!</h2><p>هذه رسالة تجريبية من نظام Taskly - ALGO-NEST</p></div>',
    })
    return Response.json({ message: `تم إرسال البريد إلى ${to}` })
  } catch (err: any) {
    return Response.json({ error: `فشل الإرسال: ${err.message}` }, { status: 500 })
  }
}

export const telegramUsers: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user || !['super-admin', 'supervisor'].includes(user.role as string)) {
    return Response.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const users = await payload.find({
    collection: 'users',
    where: { telegramChatId: { exists: true } },
    limit: 100,
  })

  return Response.json({
    total: users.totalDocs,
    users: users.docs.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      telegramChatId: u.telegramChatId,
    })),
  })
}
