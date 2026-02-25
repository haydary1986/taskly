import type { CollectionConfig } from 'payload'

export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  admin: {
    defaultColumns: ['user', 'endpoint', 'createdAt'],
    group: 'النظام',
  },
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin') return true
      return { user: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin') return true
      return { user: { equals: req.user.id } }
    },
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
      name: 'endpoint',
      type: 'text',
      required: true,
      label: 'نقطة الاشتراك',
      index: true,
    },
    {
      name: 'subscription',
      type: 'json',
      required: true,
      label: 'بيانات الاشتراك',
    },
  ],
  timestamps: true,
}
