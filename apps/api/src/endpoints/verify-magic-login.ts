import type { PayloadHandler } from 'payload'
import { validateBody, verifyMagicLoginSchema } from '../lib/validators'
import { issueRefreshToken } from './refresh-token'
import { createLogger } from '../lib/logger'
import jwt from 'jsonwebtoken'

const log = createLogger('verify-magic-login')

/** POST /verify-magic-login — Verify a magic login token and issue JWT */
export const verifyMagicLogin: PayloadHandler = async (req) => {
    const { payload } = req

    const body = await req.json?.()
    const validation = validateBody(verifyMagicLoginSchema, body)
    if (!validation.success) return validation.response

    const { token, email } = validation.data

    // Find the magic token
    const result = await payload.find({
        collection: 'magic-tokens',
        where: {
            token: { equals: token },
            used: { equals: false },
        },
        limit: 1,
        depth: 1,
        overrideAccess: true,
    })

    if (result.docs.length === 0) {
        return Response.json({ error: 'رمز الدخول غير صالح أو تم استخدامه' }, { status: 401 })
    }

    const magicDoc = result.docs[0] as any
    const userId = typeof magicDoc.user === 'object' ? magicDoc.user.id : magicDoc.user

    // Check expiration
    if (new Date(magicDoc.expiresAt) < new Date()) {
        await payload.update({
            collection: 'magic-tokens',
            id: magicDoc.id,
            data: { used: true },
            overrideAccess: true,
        })
        return Response.json({ error: 'رمز الدخول منتهي الصلاحية' }, { status: 401 })
    }

    // Mark as used
    await payload.update({
        collection: 'magic-tokens',
        id: magicDoc.id,
        data: { used: true },
        overrideAccess: true,
    })

    // Verify email matches
    const user = await payload.findByID({ collection: 'users', id: userId }) as any
    if (!user || user.email !== email) {
        return Response.json({ error: 'بيانات غير متطابقة' }, { status: 401 })
    }

    if (!user.isActive) {
        return Response.json({ error: 'الحساب معطل' }, { status: 403 })
    }

    // Sign JWT with same fields Payload v3 expects (id, email, collection)
    const collectionConfig = payload.collections['users'].config
    const tokenExpiration = typeof collectionConfig.auth === 'object'
        ? (collectionConfig.auth.tokenExpiration || 7200)
        : 7200

    const jwtToken = jwt.sign(
        { id: user.id, email: user.email, collection: 'users' },
        payload.secret,
        { algorithm: 'HS256', expiresIn: tokenExpiration },
    )
    const exp = Math.floor(Date.now() / 1000) + tokenExpiration

    // Issue refresh token
    const refreshTokenValue = await issueRefreshToken(payload, user.id, 'magic-login')

    log.info({ userId: user.id, email }, 'Magic login successful')

    return Response.json({
        token: jwtToken,
        exp,
        refreshToken: refreshTokenValue,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            avatar: user.avatar,
            isActive: user.isActive,
            telegramChatId: user.telegramChatId,
        },
    })
}
