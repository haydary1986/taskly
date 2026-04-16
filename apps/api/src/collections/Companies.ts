import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../access/roles'

export const Companies: CollectionConfig = {
  slug: 'companies',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'industry', 'phone', 'city', 'status', 'createdAt'],
    group: 'CRM',
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
      if (role === 'sales-rep') return true
      return false
    },
    update: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor', 'auditor'].includes(role)) return true
      if (role === 'sales-rep') {
        return {
          or: [
            { createdBy: { equals: req.user.id } },
            { createdBy: { exists: false } },
          ],
        }
      }
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
      label: 'اسم الشركة',
    },
    {
      name: 'industry',
      type: 'select',
      label: 'القطاع',
      options: [
        { label: 'تكنولوجيا المعلومات', value: 'it' },
        { label: 'التجارة', value: 'trade' },
        { label: 'التصنيع', value: 'manufacturing' },
        { label: 'الخدمات', value: 'services' },
        { label: 'العقارات', value: 'real-estate' },
        { label: 'الصحة', value: 'healthcare' },
        { label: 'التعليم', value: 'education' },
        { label: 'المالية والبنوك', value: 'finance' },
        { label: 'الإعلام', value: 'media' },
        { label: 'النفط والطاقة', value: 'energy' },
        { label: 'أخرى', value: 'other' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'phone',
          type: 'text',
          label: 'رقم الهاتف',
          admin: { width: '50%' },
        },
        {
          name: 'email',
          type: 'email',
          label: 'البريد الإلكتروني',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'website',
      type: 'text',
      label: 'الموقع الإلكتروني',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'address',
          type: 'text',
          label: 'العنوان',
          admin: { width: '50%' },
        },
        {
          name: 'city',
          type: 'text',
          label: 'المدينة',
          index: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'location',
      type: 'point',
      label: 'الموقع الجغرافي',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      label: 'الحالة',
      options: [
        { label: 'نشطة', value: 'active' },
        { label: 'غير نشطة', value: 'inactive' },
        { label: 'عميل محتمل', value: 'prospect' },
      ],
    },
    {
      name: 'employeeCount',
      type: 'select',
      label: 'عدد الموظفين',
      options: [
        { label: '1-10', value: '1-10' },
        { label: '11-50', value: '11-50' },
        { label: '51-200', value: '51-200' },
        { label: '201-500', value: '201-500' },
        { label: '500+', value: '500+' },
      ],
    },
    {
      name: 'annualRevenue',
      type: 'number',
      label: 'الإيرادات السنوية (USD)',
      admin: { description: 'تقدير الإيرادات السنوية بالدولار' },
    },
    {
      name: 'notes',
      type: 'richText',
      label: 'ملاحظات',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'شعار الشركة',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أضيف بواسطة',
      admin: { readOnly: true },
    },
    // Join fields
    {
      name: 'contacts',
      type: 'join',
      collection: 'clients',
      on: 'company',
    },
    {
      name: 'deals',
      type: 'join',
      collection: 'deals',
      on: 'company',
    },
  ],
  timestamps: true,
}
