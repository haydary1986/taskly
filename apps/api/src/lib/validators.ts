import { z } from 'zod/v4'

// ============================================
// Shared schemas
// ============================================
const locationSchema = z.tuple([z.number(), z.number()])
const objectIdSchema = z.string().min(1, 'معرف غير صالح')

// ============================================
// Check-in / Check-out
// ============================================
export const checkInSchema = z.object({
    clientId: objectIdSchema,
    location: locationSchema,
    photo: z.string().optional(),
})

export const checkOutSchema = z.object({
    visitId: objectIdSchema,
    location: locationSchema.optional(),
})

// ============================================
// Tasks
// ============================================
export const bulkAssignSchema = z.object({
    taskIds: z.array(objectIdSchema).min(1, 'يرجى تحديد مهمة واحدة على الأقل'),
    assignee: objectIdSchema,
})

// ============================================
// Auth
// ============================================
export const magicLoginSchema = z.object({
    email: z.email('بريد إلكتروني غير صالح'),
})

export const verifyMagicLoginSchema = z.object({
    token: z.string().min(1),
    email: z.email(),
})

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1),
})

// ============================================
// Chat
// ============================================
export const chatReactSchema = z.object({
    messageId: objectIdSchema,
    emoji: z.string().min(1).max(10),
})

export const chatPinSchema = z.object({
    messageId: objectIdSchema,
})

// ============================================
// Push
// ============================================
export const pushSubscribeSchema = z.object({
    subscription: z.object({
        endpoint: z.url(),
        keys: z.object({
            p256dh: z.string(),
            auth: z.string(),
        }),
    }),
})

export const pushUnsubscribeSchema = z.object({
    endpoint: z.url(),
})

// ============================================
// System tests
// ============================================
export const testTelegramSchema = z.object({
    chatId: z.string().optional(),
    message: z.string().optional(),
})

export const testEmailSchema = z.object({
    to: z.email().optional(),
})

// ============================================
// 2FA
// ============================================
export const verify2FASchema = z.object({
    code: z.string().length(6, 'الرمز يجب أن يكون 6 أرقام'),
})

// ============================================
// Webhooks
// ============================================
export const webhookEventTypes = [
    'task.created', 'task.updated', 'task.deleted',
    'visit.created', 'client.created', 'client.updated',
] as const

// ============================================
// Helper: validate and return parsed data or error Response
// ============================================
export function validateBody<T>(schema: z.ZodType<T>, body: unknown): { success: true; data: T } | { success: false; response: Response } {
    const result = schema.safeParse(body)
    if (!result.success) {
        const errors = result.error.issues.map((i) => i.message).join('، ')
        return {
            success: false,
            response: Response.json({ error: `بيانات غير صالحة: ${errors}` }, { status: 400 }),
        }
    }
    return { success: true, data: result.data }
}
