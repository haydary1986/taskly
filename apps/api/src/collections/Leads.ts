import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'source', 'status', 'assignedTo', 'estimatedValue', 'createdAt'],
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
      if (role === 'sales-rep') return { assignedTo: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor', 'auditor'].includes(role)) return true
      if (role === 'sales-rep') return { assignedTo: { equals: req.user.id } }
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
        if (data?.status === 'converted' && !data.convertedAt) {
          data.convertedAt = new Date().toISOString()
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
      label: 'اسم العميل المحتمل',
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
      name: 'companyName',
      type: 'text',
      label: 'اسم الشركة',
    },
    {
      name: 'jobTitle',
      type: 'text',
      label: 'المسمى الوظيفي',
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      label: 'المصدر',
      options: [
        { label: 'موقع إلكتروني', value: 'website' },
        { label: 'إحالة', value: 'referral' },
        { label: 'سوشيال ميديا', value: 'social-media' },
        { label: 'إعلان', value: 'advertisement' },
        { label: 'معرض/مؤتمر', value: 'exhibition' },
        { label: 'اتصال بارد', value: 'cold-call' },
        { label: 'بريد إلكتروني', value: 'email-campaign' },
        { label: 'شريك', value: 'partner' },
        { label: 'أخرى', value: 'other' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      label: 'الحالة',
      index: true,
      options: [
        { label: 'جديد', value: 'new' },
        { label: 'تم التواصل', value: 'contacted' },
        { label: 'مؤهل', value: 'qualified' },
        { label: 'غير مؤهل', value: 'unqualified' },
        { label: 'تم التحويل', value: 'converted' },
        { label: 'مفقود', value: 'lost' },
      ],
    },
    {
      name: 'estimatedValue',
      type: 'number',
      label: 'القيمة المتوقعة (USD)',
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      label: 'المسؤول',
    },
    {
      name: 'notes',
      type: 'richText',
      label: 'ملاحظات',
    },
    {
      name: 'city',
      type: 'text',
      label: 'المدينة',
    },
    {
      name: 'convertedAt',
      type: 'date',
      label: 'تاريخ التحويل',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'convertedTo',
      type: 'group',
      label: 'تم التحويل إلى',
      admin: {
        condition: (data) => data?.status === 'converted',
      },
      fields: [
        {
          name: 'client',
          type: 'relationship',
          relationTo: 'clients',
          label: 'العميل',
        },
        {
          name: 'deal',
          type: 'relationship',
          relationTo: 'deals',
          label: 'الصفقة',
        },
        {
          name: 'company',
          type: 'relationship',
          relationTo: 'companies',
          label: 'الشركة',
        },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أضيف بواسطة',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
