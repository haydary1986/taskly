import type { PayloadHandler } from 'payload'
import { validateBody, verify2FASchema } from '../lib/validators'
import { createLogger } from '../lib/logger'

const log = createLogger('two-factor')

/** POST /v1/2fa/setup — Generate TOTP secret for the current user */
export const setup2FA: PayloadHandler = async (req) => {
    const { payload, user } = req
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

    try {
        const { TOTP } = await import('otpauth')

        const totp = new TOTP({
            issuer: 'Taskly',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        })

        // Store secret temporarily (not yet enabled)
        await payload.update({
            collection: 'users',
            id: user.id,
            data: { twoFactorSecret: totp.secret.base32 } as any,
            overrideAccess: true,
        })

        const otpauthUrl = totp.toString()

        log.info({ userId: user.id }, '2FA setup initiated')

        return Response.json({
            secret: totp.secret.base32,
            otpauthUrl,
            message: 'قم بمسح رمز QR باستخدام تطبيق المصادقة، ثم أدخل الرمز للتأكيد',
        })
    } catch (err: any) {
        log.error({ err }, '2FA setup failed')
        return Response.json({ error: 'فشل إعداد المصادقة الثنائية' }, { status: 500 })
    }
}

/** POST /v1/2fa/verify — Verify TOTP code and enable 2FA */
export const verify2FA: PayloadHandler = async (req) => {
    const { payload, user } = req
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

    const body = await req.json?.()
    const validation = validateBody(verify2FASchema, body)
    if (!validation.success) return validation.response

    const { code } = validation.data
    const fullUser = await payload.findByID({ collection: 'users', id: user.id }) as any

    if (!fullUser.twoFactorSecret) {
        return Response.json({ error: 'يرجى إعداد المصادقة الثنائية أولاً' }, { status: 400 })
    }

    try {
        const { TOTP } = await import('otpauth')

        const totp = new TOTP({
            issuer: 'Taskly',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: fullUser.twoFactorSecret,
        })

        const delta = totp.validate({ token: code, window: 1 })
        if (delta === null) {
            return Response.json({ error: 'الرمز غير صالح' }, { status: 400 })
        }

        await payload.update({
            collection: 'users',
            id: user.id,
            data: { twoFactorEnabled: true } as any,
            overrideAccess: true,
        })

        log.info({ userId: user.id }, '2FA enabled successfully')

        return Response.json({ message: 'تم تفعيل المصادقة الثنائية بنجاح' })
    } catch (err: any) {
        log.error({ err }, '2FA verification failed')
        return Response.json({ error: 'فشل التحقق' }, { status: 500 })
    }
}

/** POST /v1/2fa/disable — Disable 2FA for the current user */
export const disable2FA: PayloadHandler = async (req) => {
    const { payload, user } = req
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

    const body = await req.json?.()
    const validation = validateBody(verify2FASchema, body)
    if (!validation.success) return validation.response

    const { code } = validation.data
    const fullUser = await payload.findByID({ collection: 'users', id: user.id }) as any

    if (!fullUser.twoFactorEnabled || !fullUser.twoFactorSecret) {
        return Response.json({ error: 'المصادقة الثنائية غير مفعلة' }, { status: 400 })
    }

    try {
        const { TOTP } = await import('otpauth')

        const totp = new TOTP({
            issuer: 'Taskly',
            label: user.email,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: fullUser.twoFactorSecret,
        })

        const delta = totp.validate({ token: code, window: 1 })
        if (delta === null) {
            return Response.json({ error: 'الرمز غير صالح' }, { status: 400 })
        }

        await payload.update({
            collection: 'users',
            id: user.id,
            data: { twoFactorEnabled: false, twoFactorSecret: '' } as any,
            overrideAccess: true,
        })

        log.info({ userId: user.id }, '2FA disabled')

        return Response.json({ message: 'تم تعطيل المصادقة الثنائية' })
    } catch (err: any) {
        log.error({ err }, '2FA disable failed')
        return Response.json({ error: 'فشل التعطيل' }, { status: 500 })
    }
}
