import type { CollectionConfig } from 'payload'

export const LoginLogs: CollectionConfig = {
  slug: 'login-logs',
  admin: {
    defaultColumns: ['user', 'success', 'ip', 'createdAt'],
    group: 'الأمان',
  },
  access: {
    create: () => false,
    read: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'auditor'].includes(req.user.role as string)
    },
    update: () => false,
    delete: ({ req }) => req.user?.role === 'super-admin',
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
      name: 'email',
      type: 'text',
      label: 'البريد المستخدم',
    },
    {
      name: 'success',
      type: 'checkbox',
      label: 'ناجح',
    },
    {
      name: 'ip',
      type: 'text',
      label: 'عنوان IP',
      index: true,
    },
    {
      name: 'userAgent',
      type: 'text',
      label: 'المتصفح',
    },
    {
      name: 'country',
      type: 'text',
      label: 'الدولة',
    },
    {
      name: 'isTor',
      type: 'checkbox',
      defaultValue: false,
      label: 'شبكة Tor',
    },
    {
      name: 'isVPN',
      type: 'checkbox',
      defaultValue: false,
      label: 'VPN',
    },
    {
      name: 'isProxy',
      type: 'checkbox',
      defaultValue: false,
      label: 'Proxy',
    },
    {
      name: 'reason',
      type: 'text',
      label: 'سبب الفشل',
    },
  ],
  timestamps: true,
}
