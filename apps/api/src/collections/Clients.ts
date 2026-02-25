import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../access/roles'

export const Clients: CollectionConfig = {
  slug: 'clients',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'city', 'tags', 'createdAt'],
    group: 'المبيعات',
  },
  access: {
    create: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      return ['super-admin', 'supervisor', 'auditor', 'sales-rep'].includes(role)
    },
    read: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor', 'auditor'].includes(role)) return true
      if (role === 'sales-rep') return { createdBy: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor', 'auditor'].includes(role)) return true
      if (role === 'sales-rep') return { createdBy: { equals: req.user.id } }
      return false
    },
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.createdBy = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'اسم العميل',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'رقم الهاتف',
    },
    {
      name: 'email',
      type: 'email',
      label: 'البريد الإلكتروني',
    },
    {
      name: 'address',
      type: 'text',
      label: 'العنوان',
    },
    {
      name: 'city',
      type: 'text',
      label: 'المدينة',
      index: true,
    },
    {
      name: 'location',
      type: 'point',
      label: 'الموقع الجغرافي',
    },
    {
      name: 'tags',
      type: 'select',
      hasMany: true,
      label: 'التصنيفات',
      options: [
        { label: 'عميل VIP', value: 'vip' },
        { label: 'عميل جديد', value: 'new' },
        { label: 'عميل دائم', value: 'regular' },
        { label: 'عميل محتمل', value: 'prospect' },
        { label: 'متوقف', value: 'inactive' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'ملاحظات',
    },
    {
      name: 'uuid',
      type: 'text',
      unique: true,
      index: true,
      label: 'معرف العميل (UUID)',
      admin: { readOnly: true },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أضيف بواسطة',
      admin: { readOnly: true },
    },
    {
      name: 'visits',
      type: 'join',
      collection: 'visits',
      on: 'client',
    },
  ],
  timestamps: true,
}
