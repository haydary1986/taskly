import type { CollectionConfig } from 'payload'

export const FirewallRules: CollectionConfig = {
  slug: 'firewall-rules',
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['type', 'value', 'action', 'isActive', 'createdAt'],
    group: 'الأمان',
  },
  access: {
    create: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'auditor'].includes(req.user.role as string)
    },
    read: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'auditor'].includes(req.user.role as string)
    },
    update: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'auditor'].includes(req.user.role as string)
    },
    delete: ({ req }) => req.user?.role === 'super-admin',
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      label: 'النوع',
      options: [
        { label: 'عنوان IP', value: 'ip' },
        { label: 'نطاق IP', value: 'ip-range' },
        { label: 'دولة', value: 'country' },
      ],
    },
    {
      name: 'value',
      type: 'text',
      required: true,
      label: 'القيمة',
      admin: { description: 'مثال: 192.168.1.1 أو 192.168.1.0/24 أو SA' },
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      defaultValue: 'block',
      label: 'الإجراء',
      options: [
        { label: 'حظر', value: 'block' },
        { label: 'سماح', value: 'allow' },
      ],
    },
    {
      name: 'description',
      type: 'text',
      label: 'الوصف',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'مفعل',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أضيف بواسطة',
      admin: { readOnly: true },
    },
  ],
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
  timestamps: true,
}
