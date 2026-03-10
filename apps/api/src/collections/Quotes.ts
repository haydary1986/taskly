import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'

export const Quotes: CollectionConfig = {
  slug: 'quotes',
  admin: {
    useAsTitle: 'quoteNumber',
    defaultColumns: ['quoteNumber', 'deal', 'company', 'total', 'status', 'validUntil'],
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
        if (operation === 'create') {
          if (req.user) data.createdBy = req.user.id
          // Auto-generate quote number
          const count = await req.payload.count({ collection: 'quotes', overrideAccess: true })
          data.quoteNumber = `QT-${String(count.totalDocs + 1).padStart(5, '0')}`
        }
        // Calculate total from items
        if (data?.items && Array.isArray(data.items)) {
          let subtotal = 0
          for (const item of data.items) {
            const lineTotal = (item.quantity || 0) * (item.unitPrice || 0)
            const discount = lineTotal * ((item.discount || 0) / 100)
            subtotal += lineTotal - discount
          }
          const tax = subtotal * ((data.taxRate || 0) / 100)
          data.subtotal = subtotal
          data.total = subtotal + tax
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'quoteNumber',
      type: 'text',
      unique: true,
      label: 'رقم العرض',
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'deal',
          type: 'relationship',
          relationTo: 'deals',
          label: 'الصفقة',
          admin: { width: '33%' },
        },
        {
          name: 'company',
          type: 'relationship',
          relationTo: 'companies',
          label: 'الشركة',
          admin: { width: '33%' },
        },
        {
          name: 'contact',
          type: 'relationship',
          relationTo: 'clients',
          label: 'جهة الاتصال',
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'الحالة',
      options: [
        { label: 'مسودة', value: 'draft' },
        { label: 'مرسل', value: 'sent' },
        { label: 'مقبول', value: 'accepted' },
        { label: 'مرفوض', value: 'rejected' },
        { label: 'منتهي', value: 'expired' },
      ],
    },
    {
      name: 'validUntil',
      type: 'date',
      label: 'صالح حتى',
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      label: 'البنود',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          label: 'المنتج/الخدمة',
        },
        {
          name: 'description',
          type: 'text',
          required: true,
          label: 'الوصف',
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          defaultValue: 1,
          min: 1,
          label: 'الكمية',
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          label: 'سعر الوحدة',
        },
        {
          name: 'discount',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 100,
          label: 'الخصم (%)',
        },
      ],
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'USD',
      label: 'العملة',
      options: [
        { label: 'دولار أمريكي', value: 'USD' },
        { label: 'دينار عراقي', value: 'IQD' },
        { label: 'يورو', value: 'EUR' },
      ],
    },
    {
      name: 'taxRate',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 100,
      label: 'نسبة الضريبة (%)',
    },
    {
      name: 'subtotal',
      type: 'number',
      label: 'المجموع الفرعي',
      admin: { readOnly: true },
    },
    {
      name: 'total',
      type: 'number',
      label: 'المجموع الكلي',
      admin: { readOnly: true },
    },
    {
      name: 'notes',
      type: 'richText',
      label: 'ملاحظات/شروط',
    },
    {
      name: 'termsAndConditions',
      type: 'textarea',
      label: 'الشروط والأحكام',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أنشأ بواسطة',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
