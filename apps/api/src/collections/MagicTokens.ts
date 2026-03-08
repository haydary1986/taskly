import type { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../access/roles'

export const MagicTokens: CollectionConfig = {
    slug: 'magic-tokens',
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
            label: 'رمز الدخول السحري',
        },
        {
            name: 'expiresAt',
            type: 'date',
            required: true,
            label: 'ينتهي في',
        },
        {
            name: 'used',
            type: 'checkbox',
            defaultValue: false,
            label: 'تم الاستخدام',
        },
    ],
    timestamps: true,
}
