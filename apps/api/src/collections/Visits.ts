import type { CollectionConfig } from 'payload'
import { isAdmin, adminOrOwn } from '../access/roles'

export const Visits: CollectionConfig = {
  slug: 'visits',
  admin: {
    defaultColumns: ['client', 'representative', 'status', 'checkInTime', 'createdAt'],
    group: 'المبيعات',
  },
  access: {
    create: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'supervisor', 'sales-rep'].includes(req.user.role as string)
    },
    read: adminOrOwn('representative'),
    update: adminOrOwn('representative'),
    delete: isAdmin,
  },
  fields: [
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      required: true,
      label: 'العميل',
      index: true,
    },
    {
      name: 'representative',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'المندوب',
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'checked-in',
      label: 'الحالة',
      options: [
        { label: 'تم تسجيل الدخول', value: 'checked-in' },
        { label: 'تم تسجيل الخروج', value: 'checked-out' },
        { label: 'ملغاة', value: 'cancelled' },
      ],
    },
    {
      name: 'checkInTime',
      type: 'date',
      required: true,
      label: 'وقت الدخول',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'checkOutTime',
      type: 'date',
      label: 'وقت الخروج',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'checkInLocation',
      type: 'point',
      label: 'موقع الدخول',
    },
    {
      name: 'checkOutLocation',
      type: 'point',
      label: 'موقع الخروج',
    },
    {
      name: 'checkInPhoto',
      type: 'upload',
      relationTo: 'media',
      label: 'صورة إثبات الحضور',
    },
    {
      name: 'distance',
      type: 'number',
      label: 'المسافة من العميل (متر)',
      admin: { readOnly: true },
    },
    {
      name: 'isValid',
      type: 'checkbox',
      defaultValue: true,
      label: 'زيارة صالحة',
      admin: { description: 'يتم التحقق تلقائياً من صحة الموقع' },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'ملاحظات',
    },
    {
      name: 'syncedFromOffline',
      type: 'checkbox',
      defaultValue: false,
      label: 'تمت المزامنة من وضع عدم الاتصال',
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
