import { describe, it, expect } from 'vitest'
import {
    checkInSchema,
    checkOutSchema,
    bulkAssignSchema,
    magicLoginSchema,
    chatReactSchema,
    pushSubscribeSchema,
    verify2FASchema,
    validateBody,
} from '../validators'

describe('Validators', () => {
    describe('checkInSchema', () => {
        it('should validate correct data', () => {
            const result = checkInSchema.safeParse({
                clientId: '658abc123',
                location: [44.3661, 33.3157],
            })
            expect(result.success).toBe(true)
        })

        it('should reject missing clientId', () => {
            const result = checkInSchema.safeParse({
                location: [44.3661, 33.3157],
            })
            expect(result.success).toBe(false)
        })

        it('should reject invalid location', () => {
            const result = checkInSchema.safeParse({
                clientId: '658abc123',
                location: 'invalid',
            })
            expect(result.success).toBe(false)
        })

        it('should accept optional photo', () => {
            const result = checkInSchema.safeParse({
                clientId: '658abc123',
                location: [44.3661, 33.3157],
                photo: 'media123',
            })
            expect(result.success).toBe(true)
        })
    })

    describe('magicLoginSchema', () => {
        it('should validate correct email', () => {
            const result = magicLoginSchema.safeParse({ email: 'user@example.com' })
            expect(result.success).toBe(true)
        })

        it('should reject invalid email', () => {
            const result = magicLoginSchema.safeParse({ email: 'not-an-email' })
            expect(result.success).toBe(false)
        })
    })

    describe('bulkAssignSchema', () => {
        it('should validate correct data', () => {
            const result = bulkAssignSchema.safeParse({
                taskIds: ['id1', 'id2'],
                assignee: 'user1',
            })
            expect(result.success).toBe(true)
        })

        it('should reject empty taskIds', () => {
            const result = bulkAssignSchema.safeParse({
                taskIds: [],
                assignee: 'user1',
            })
            expect(result.success).toBe(false)
        })
    })

    describe('verify2FASchema', () => {
        it('should validate 6-digit code', () => {
            const result = verify2FASchema.safeParse({ code: '123456' })
            expect(result.success).toBe(true)
        })

        it('should reject short code', () => {
            const result = verify2FASchema.safeParse({ code: '123' })
            expect(result.success).toBe(false)
        })
    })

    describe('validateBody helper', () => {
        it('should return success with parsed data', () => {
            const result = validateBody(magicLoginSchema, { email: 'test@test.com' })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.email).toBe('test@test.com')
            }
        })

        it('should return error response for invalid data', () => {
            const result = validateBody(magicLoginSchema, { email: 'bad' })
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.response.status).toBe(400)
            }
        })
    })
})
