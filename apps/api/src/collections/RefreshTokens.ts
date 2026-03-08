import type { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../access/roles'

export const RefreshTokens: CollectionConfig = {
    slug: 'refresh-tokens',
    admin: {
        group: 'النظام',
        hidden: true,
    },
    access: {
        create: () => false,
        read: isSuperAdmin,
        update: () => false,
        delete: isSuperAdmin,
    },
    fields: [
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            required: true,
            label: 'المستخدم',
            index: true,
        },
        {
            name: 'token',
            type: 'text',
            required: true,
            unique: true,
            index: true,
            label: 'رمز التحديث',
        },
        {
            name: 'expiresAt',
            type: 'date',
            required: true,
            label: 'ينتهي في',
        },
        {
            name: 'device',
            type: 'text',
            label: 'الجهاز',
            admin: { description: 'User-Agent أو معرّف الجهاز' },
        },
    ],
    timestamps: true,
}
