import type { CollectionConfig } from 'payload'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    defaultColumns: ['title', 'recipient', 'type', 'isRead', 'createdAt'],
    group: 'النظام',
  },
  access: {
    create: ({ req }) => {
      // Only system (hooks) or admin can create notifications
      const role = req.user?.role
      return role === 'super-admin' || role === 'supervisor'
    },
    read: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role
      if (['super-admin', 'supervisor', 'auditor'].includes(role)) return true
      return { recipient: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      // Users can only mark their own notifications as read
      return { recipient: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      return req.user?.role === 'super-admin'
    },
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'المستلم',
      index: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: 'النوع',
      options: [
        { label: 'مهمة جديدة', value: 'task-assigned' },
        { label: 'تحديث مهمة', value: 'task-updated' },
        { label: 'تعليق', value: 'comment' },
        { label: 'تنبيه أمني', value: 'security-alert' },
        { label: 'زيارة', value: 'visit' },
        { label: 'نظام', value: 'system' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'العنوان',
    },
    {
      name: 'message',
      type: 'text',
      required: true,
      label: 'الرسالة',
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      label: 'مقروء',
    },
    {
      name: 'link',
      type: 'text',
      label: 'الرابط',
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'بيانات إضافية',
    },
  ],
  timestamps: true,
}
