import type { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../access/roles'

export const Webhooks: CollectionConfig = {
    slug: 'webhooks',
    admin: {
        useAsTitle: 'name',
        group: 'النظام',
    },
    access: {
        create: isSuperAdmin,
        read: isSuperAdmin,
        update: isSuperAdmin,
        delete: isSuperAdmin,
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            label: 'الاسم',
        },
        {
            name: 'url',
            type: 'text',
            required: true,
            label: 'رابط Webhook',
            admin: { description: 'URL الذي سيتم إرسال الأحداث إليه' },
        },
        {
            name: 'events',
            type: 'select',
            hasMany: true,
            required: true,
            label: 'الأحداث',
            options: [
                { label: 'إنشاء مهمة', value: 'task.created' },
                { label: 'تحديث مهمة', value: 'task.updated' },
                { label: 'حذف مهمة', value: 'task.deleted' },
                { label: 'إنشاء زيارة', value: 'visit.created' },
                { label: 'إنشاء عميل', value: 'client.created' },
                { label: 'تحديث عميل', value: 'client.updated' },
            ],
        },
        {
            name: 'secret',
            type: 'text',
            label: 'المفتاح السري',
            admin: { description: 'سيُستخدم لتوقيع Payload (HMAC-SHA256)' },
        },
        {
            name: 'isActive',
            type: 'checkbox',
            defaultValue: true,
            label: 'مفعّل',
        },
    ],
    timestamps: true,
}
