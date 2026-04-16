import type { CollectionConfig } from 'payload'
import { hasRole } from '../access/roles'

export const AuditLogs: CollectionConfig = {
    slug: 'audit-logs',
    admin: {
        useAsTitle: 'action',
        defaultColumns: ['user', 'action', 'collectionName', 'documentId', 'createdAt'],
        group: 'النظام',
    },
    access: {
        create: () => false,  // Only created programmatically
        read: hasRole('super-admin', 'auditor'),
        update: () => false,
        delete: () => false,
    },
    fields: [
        {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            label: 'المستخدم',
            index: true,
        },
        {
            name: 'action',
            type: 'select',
            required: true,
            label: 'الإجراء',
            options: [
                { label: 'إنشاء', value: 'create' },
                { label: 'تعديل', value: 'update' },
                { label: 'حذف', value: 'delete' },
                { label: 'حذف مؤقت', value: 'soft-delete' },
                { label: 'استعادة', value: 'restore' },
                { label: 'نقل', value: 'transfer' },
                { label: 'تسجيل دخول', value: 'login' },
                { label: 'تسجيل خروج', value: 'logout' },
            ],
        },
        {
            name: 'collectionName',
            type: 'text',
            required: true,
            label: 'المجموعة',
            index: true,
        },
        {
            name: 'documentId',
            type: 'text',
            label: 'معرّف المستند',
        },
        {
            name: 'changes',
            type: 'json',
            label: 'التغييرات',
            admin: { description: 'الحقول التي تم تغييرها' },
        },
        {
            name: 'ip',
            type: 'text',
            label: 'عنوان IP',
        },
    ],
    timestamps: true,
}
