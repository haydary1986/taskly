import type { CollectionConfig } from 'payload'
import { isAdmin, isManagement, isSuperAdmin, hasRoleOrSelf, managementFieldAccess } from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 600000,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'isActive'],
    group: 'إدارة النظام',
  },
  access: {
    create: isAdmin,
    read: hasRoleOrSelf('super-admin', 'supervisor', 'auditor'),
    update: hasRoleOrSelf('super-admin', 'supervisor', 'auditor'),
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
      name: 'phone',
      type: 'text',
      label: 'رقم الهاتف',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'الصورة الشخصية',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'sales-rep',
      saveToJWT: true,
      label: 'الدور',
      access: {
        update: managementFieldAccess,
      },
      options: [
        { label: 'مدير عام', value: 'super-admin' },
        { label: 'مشرف', value: 'supervisor' },
        { label: 'مراقب', value: 'auditor' },
        { label: 'مندوب مبيعات', value: 'sales-rep' },
        { label: 'مبرمج', value: 'programmer' },
        { label: 'مصمم', value: 'designer' },
        { label: 'مسؤول سوشيال ميديا', value: 'social-media-manager' },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'نشط',
      access: {
        update: managementFieldAccess,
      },
    },
    {
      name: 'telegramChatId',
      type: 'text',
      label: 'معرف تيليجرام',
      admin: {
        position: 'sidebar',
        condition: (data, siblingData, { user }) => {
          const role = (user as any)?.role
          return role === 'super-admin' || role === 'supervisor'
        },
      },
    },
  ],
  timestamps: true,
}
