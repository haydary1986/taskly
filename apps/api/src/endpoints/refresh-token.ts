import type { PayloadHandler } from 'payload'
import crypto from 'crypto'
import { validateBody, refreshTokenSchema } from '../lib/validators'
import { createLogger } from '../lib/logger'

const log = createLogger('refresh-token')

/** Issue a new refresh token for a user */
export async function issueRefreshToken(
    payload: any,
    userId: string,
    device?: string,
): Promise<string> {
    const token = crypto.randomBytes(48).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await payload.create({
        collection: 'refresh-tokens',
        data: { user: userId, token, expiresAt: expiresAt.toISOString(), device },
        overrideAccess: true,
    })

    // Cleanup: keep max 5 refresh tokens per user
    const existing = await payload.find({
        collection: 'refresh-tokens',
        where: { user: { equals: userId } },
        sort: '-createdAt',
        limit: 100,
        overrideAccess: true,
    })

    if (existing.docs.length > 5) {
        const toDelete = existing.docs.slice(5)
        for (const doc of toDelete) {
            await payload.delete({ collection: 'refresh-tokens', id: doc.id, overrideAccess: true })
        }
    }

    return token
}

/** POST /refresh-token — Exchange refresh token for new JWT + refresh token */
export const refreshToken: PayloadHandler = async (req) => {
    const { payload } = req

    const body = await req.json?.()
    const validation = validateBody(refreshTokenSchema, body)
    if (!validation.success) return validation.response

    const { refreshToken: token } = validation.data

    // Find the refresh token
    const result = await payload.find({
        collection: 'refresh-tokens',
        where: { token: { equals: token } },
        limit: 1,
        depth: 1,
        overrideAccess: true,
    })

    if (result.docs.length === 0) {
        log.warn('Invalid refresh token attempted')
        return Response.json({ error: 'رمز التحديث غير صالح' }, { status: 401 })
    }

    const refreshDoc = result.docs[0] as any
    const user = refreshDoc.user

    // Check expiration
    if (new Date(refreshDoc.expiresAt) < new Date()) {
        await payload.delete({ collection: 'refresh-tokens', id: refreshDoc.id, overrideAccess: true })
        return Response.json({ error: 'رمز التحديث منتهي الصلاحية' }, { status: 401 })
    }

    // Check user is still active
    const fullUser = typeof user === 'object' ? user : await payload.findByID({ collection: 'users', id: user })
    if (!fullUser || !fullUser.isActive) {
        return Response.json({ error: 'الحساب معطل' }, { status: 403 })
    }

    // Delete the used refresh token (rotation)
    await payload.delete({ collection: 'refresh-tokens', id: refreshDoc.id, overrideAccess: true })

    // Issue new JWT via Payload's login mechanism
    const jwt = await import('jsonwebtoken')
    const jwtToken = jwt.default.sign(
        { id: fullUser.id, email: fullUser.email, role: fullUser.role, collection: 'users' },
        process.env.PAYLOAD_SECRET || 'default-secret-change-me',
        { expiresIn: '2h' },
    )

    // Issue a new refresh token
    const newRefreshToken = await issueRefreshToken(payload, fullUser.id, refreshDoc.device)

    log.info({ userId: fullUser.id }, 'Token refreshed successfully')

    return Response.json({
        token: jwtToken,
        exp: Math.floor(Date.now() / 1000) + 7200,
        refreshToken: newRefreshToken,
        user: {
            id: fullUser.id,
            name: fullUser.name,
            email: fullUser.email,
            role: fullUser.role,
            phone: fullUser.phone,
            avatar: fullUser.avatar,
            isActive: fullUser.isActive,
            telegramChatId: fullUser.telegramChatId,
        },
    })
}
