import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'
import { sendNotification } from '../lib/notify'
import { createLogger } from '../lib/logger'

const log = createLogger('Invoices')

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  admin: {
    useAsTitle: 'invoiceNumber',
    defaultColumns: ['invoiceNumber', 'quote', 'client', 'total', 'status', 'dueDate'],
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
      if (role === 'sales-rep') return { deletedAt: { exists: false } }
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
        if (operation === 'create') {
          if (req.user) data.createdBy = req.user.id
          const count = await req.payload.count({ collection: 'invoices', overrideAccess: true })
          data.invoiceNumber = `INV-${String(count.totalDocs + 1).padStart(5, '0')}`
          if (!data.issuedAt) data.issuedAt = new Date().toISOString()
        }
        // Recalculate totals from items
        if (Array.isArray(data?.items)) {
          let subtotal = 0
          for (const item of data.items) {
            const line = (item.quantity || 0) * (item.unitPrice || 0)
            const discount = line * ((item.discount || 0) / 100)
            subtotal += line - discount
          }
          const tax = subtotal * ((data.taxRate || 0) / 100)
          data.subtotal = subtotal
          data.total = subtotal + tax
        }
        // Auto-set paidAt when status becomes paid
        if (data?.status === 'paid' && !data.paidAt) {
          data.paidAt = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        if (operation !== 'update') return doc
        if (previousDoc?.status === 'paid' || doc.status !== 'paid') return doc
        const ownerId = typeof doc.createdBy === 'object' ? doc.createdBy?.id : doc.createdBy
        if (!ownerId) return doc
        try {
          await sendNotification(req.payload, {
            recipientId: String(ownerId),
            type: 'system',
            title: '💰 تم دفع الفاتورة',
            message: `الفاتورة ${doc.invoiceNumber} بقيمة ${doc.total} ${doc.currency || 'USD'} تم تحصيلها`,
            link: `/invoices/${doc.id}`,
            metadata: { invoiceId: doc.id, total: doc.total },
          })
        } catch (err: unknown) {
          log.error({ err, invoiceId: doc.id }, 'Failed invoice-paid notification')
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'invoiceNumber',
      type: 'text',
      unique: true,
      label: 'رقم الفاتورة',
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'quote',
          type: 'relationship',
          relationTo: 'quotes',
          label: 'عرض السعر المصدر',
          admin: { width: '33%' },
          index: true,
        },
        {
          name: 'deal',
          type: 'relationship',
          relationTo: 'deals',
          label: 'الصفقة',
          admin: { width: '33%' },
        },
        {
          name: 'client',
          type: 'relationship',
          relationTo: 'clients',
          label: 'العميل',
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'company',
      type: 'relationship',
      relationTo: 'companies',
      label: 'الشركة',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'الحالة',
      index: true,
      options: [
        { label: 'مسودة', value: 'draft' },
        { label: 'مرسلة', value: 'sent' },
        { label: 'مدفوعة', value: 'paid' },
        { label: 'متأخرة', value: 'overdue' },
        { label: 'ملغاة', value: 'cancelled' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'issuedAt', type: 'date', label: 'تاريخ الإصدار', admin: { width: '33%' } },
        { name: 'dueDate', type: 'date', label: 'تاريخ الاستحقاق', admin: { width: '33%' } },
        { name: 'paidAt', type: 'date', label: 'تاريخ الدفع', admin: { width: '33%', readOnly: true } },
      ],
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      label: 'البنود',
      fields: [
        { name: 'description', type: 'text', required: true, label: 'الوصف' },
        { name: 'quantity', type: 'number', required: true, defaultValue: 1, label: 'الكمية' },
        { name: 'unitPrice', type: 'number', required: true, label: 'سعر الوحدة' },
        { name: 'discount', type: 'number', defaultValue: 0, label: 'خصم %', min: 0, max: 100 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'subtotal', type: 'number', label: 'المجموع الفرعي', admin: { width: '33%', readOnly: true } },
        { name: 'taxRate', type: 'number', defaultValue: 0, label: 'نسبة الضريبة %', admin: { width: '33%' }, min: 0, max: 100 },
        { name: 'total', type: 'number', label: 'الإجمالي', admin: { width: '33%', readOnly: true } },
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
      ],
    },
    {
      name: 'paymentTerms',
      type: 'textarea',
      label: 'شروط الدفع',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'ملاحظات',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أضيف بواسطة',
      admin: { readOnly: true },
    },
    {
      name: 'deletedAt',
      type: 'date',
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'deletedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  timestamps: true,
}
