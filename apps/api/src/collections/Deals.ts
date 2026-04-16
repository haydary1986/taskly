import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'
import { socketService } from '../socket/index'
import { sendNotification } from '../lib/notify'
import { createLogger } from '../lib/logger'

const log = createLogger('Deals')

export const Deals: CollectionConfig = {
  slug: 'deals',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'company', 'stage', 'value', 'assignedTo', 'expectedCloseDate'],
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
            { assignedTo: { equals: req.user.id } },
            { assignedTo: { exists: false } },
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
        if (data?.stage === 'won' && !data.closedAt) {
          data.closedAt = new Date().toISOString()
        }
        if (data?.stage === 'lost' && !data.closedAt) {
          data.closedAt = new Date().toISOString()
        }
        if (data?.stage && !['won', 'lost'].includes(data.stage)) {
          data.closedAt = null
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        // Notify on stage change
        if (operation === 'update' && previousDoc?.stage !== doc.stage && doc.assignedTo) {
          const assignedToId = typeof doc.assignedTo === 'object' ? doc.assignedTo.id : doc.assignedTo
          if (String(assignedToId) !== String(req.user?.id)) {
            const stageLabels: Record<string, string> = {
              qualification: 'تأهيل',
              proposal: 'عرض سعر',
              negotiation: 'مفاوضة',
              won: 'مكسوبة',
              lost: 'خاسرة',
            }
            const type =
              doc.stage === 'won' ? 'deal-won' : doc.stage === 'lost' ? 'deal-lost' : 'system'
            const title =
              doc.stage === 'won'
                ? '🎉 صفقة مكسوبة'
                : doc.stage === 'lost'
                ? '❌ صفقة خاسرة'
                : 'تحديث صفقة'
            try {
              await sendNotification(req.payload, {
                recipientId: String(assignedToId),
                type,
                title,
                message: `"${doc.title}" → ${stageLabels[doc.stage] || doc.stage}${doc.value ? ` (${doc.value})` : ''}`,
                link: `/deals/${doc.id}`,
                metadata: { dealId: doc.id, stage: doc.stage, value: doc.value },
              })
            } catch (err: unknown) {
              log.error({ err, dealId: doc.id }, 'Deal notification failed')
            }
          }
        }

        const eventName = operation === 'create' ? 'deal:created' : 'deal:updated'
        socketService.emitToAll(eventName, doc)
      },
    ],
    afterDelete: [
      async ({ id }) => {
        socketService.emitToAll('deal:deleted', id)
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'عنوان الصفقة',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'company',
          type: 'relationship',
          relationTo: 'companies',
          label: 'الشركة',
          admin: { width: '50%' },
        },
        {
          name: 'contact',
          type: 'relationship',
          relationTo: 'clients',
          label: 'جهة الاتصال',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'stage',
      type: 'select',
      required: true,
      defaultValue: 'qualification',
      label: 'المرحلة',
      index: true,
      options: [
        { label: 'تأهيل', value: 'qualification' },
        { label: 'عرض سعر', value: 'proposal' },
        { label: 'مفاوضة', value: 'negotiation' },
        { label: 'مكسوبة', value: 'won' },
        { label: 'خاسرة', value: 'lost' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'value',
          type: 'number',
          required: true,
          label: 'القيمة (USD)',
          min: 0,
          admin: { width: '33%' },
        },
        {
          name: 'currency',
          type: 'select',
          defaultValue: 'USD',
          label: 'العملة',
          admin: { width: '33%' },
          options: [
            { label: 'دولار أمريكي', value: 'USD' },
            { label: 'دينار عراقي', value: 'IQD' },
            { label: 'يورو', value: 'EUR' },
          ],
        },
        {
          name: 'probability',
          type: 'number',
          label: 'احتمال الفوز (%)',
          min: 0,
          max: 100,
          defaultValue: 50,
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'assignedTo',
      type: 'relationship',
      relationTo: 'users',
      label: 'المسؤول',
    },
    {
      name: 'expectedCloseDate',
      type: 'date',
      label: 'تاريخ الإغلاق المتوقع',
    },
    {
      name: 'source',
      type: 'select',
      label: 'المصدر',
      options: [
        { label: 'موقع إلكتروني', value: 'website' },
        { label: 'إحالة', value: 'referral' },
        { label: 'سوشيال ميديا', value: 'social-media' },
        { label: 'إعلان', value: 'advertisement' },
        { label: 'معرض/مؤتمر', value: 'exhibition' },
        { label: 'اتصال بارد', value: 'cold-call' },
        { label: 'عميل محتمل محوّل', value: 'converted-lead' },
        { label: 'أخرى', value: 'other' },
      ],
    },
    {
      name: 'products',
      type: 'array',
      label: 'المنتجات/الخدمات',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          label: 'المنتج',
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
      name: 'notes',
      type: 'richText',
      label: 'ملاحظات',
    },
    {
      name: 'lostReason',
      type: 'select',
      label: 'سبب الخسارة',
      admin: {
        condition: (data) => data?.stage === 'lost',
      },
      options: [
        { label: 'السعر مرتفع', value: 'price' },
        { label: 'اختار منافس', value: 'competitor' },
        { label: 'تأخر الرد', value: 'delayed' },
        { label: 'لم يعد مهتماً', value: 'no-interest' },
        { label: 'تغير الميزانية', value: 'budget' },
        { label: 'أخرى', value: 'other' },
      ],
    },
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      label: 'العميل المحتمل الأصلي',
      admin: { readOnly: true },
    },
    {
      name: 'closedAt',
      type: 'date',
      label: 'تاريخ الإغلاق',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أنشأ بواسطة',
      admin: { readOnly: true },
    },
    // Join fields
    {
      name: 'activities',
      type: 'join',
      collection: 'crm-activities',
      on: 'deal',
    },
    {
      name: 'quotes',
      type: 'join',
      collection: 'quotes',
      on: 'deal',
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
