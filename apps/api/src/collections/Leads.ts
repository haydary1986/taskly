import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'
import { sendNotification } from '../lib/notify'
import { socketService } from '../socket/index'
import { createLogger } from '../lib/logger'
import { logAudit } from '../lib/audit'

const log = createLogger('Leads')

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
      async ({ data, operation, req, originalDoc }) => {
        if (operation === 'create' && req.user) {
          data.createdBy = req.user.id
        }
        if (data?.status === 'converted' && !data.convertedAt) {
          data.convertedAt = new Date().toISOString()
        }
        // Stash previous assignee for afterChange comparison
        if (operation === 'update' && originalDoc) {
          const prevId = typeof originalDoc.assignedTo === 'object' ? originalDoc.assignedTo?.id : originalDoc.assignedTo
          ;(data as Record<string, unknown>).__prevAssignedTo = prevId ?? null
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req, previousDoc }) => {
        // Always broadcast lead updates so all maps refresh in real time
        socketService.emitToAll('lead:updated', {
          id: doc.id,
          assignedTo: typeof doc.assignedTo === 'object' ? doc.assignedTo?.id : doc.assignedTo,
          status: doc.status,
        })

        if (operation !== 'update') return doc
        const prevId = previousDoc
          ? (typeof previousDoc.assignedTo === 'object' ? previousDoc.assignedTo?.id : previousDoc.assignedTo) ?? null
          : null
        const newId = typeof doc.assignedTo === 'object' ? doc.assignedTo?.id : doc.assignedTo
        if (!newId || String(prevId) === String(newId)) return doc

        try {
          const actorName = req.user?.name || 'مستخدم'
          await sendNotification(req.payload, {
            recipientId: String(newId),
            type: 'lead-transferred',
            title: 'عميل محتمل جديد مُعيَّن إليك',
            message: `تم نقل "${doc.name}" إليك بواسطة ${actorName}`,
            link: `/prospects-map`,
            metadata: { leadId: doc.id, fromUserId: prevId, transferredBy: req.user?.id },
          })
          await logAudit(req.payload, {
            userId: req.user?.id as string | undefined,
            action: 'transfer',
            collectionName: 'leads',
            documentId: String(doc.id),
            changes: { assignedTo: { from: prevId, to: newId } },
          })
        } catch (err: unknown) {
          log.error({ err, leadId: doc.id }, 'Failed to send lead-transfer notification')
        }
        return doc
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
        { label: 'خرائط جوجل (Apify)', value: 'google-maps' },
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
      name: 'address',
      type: 'text',
      label: 'العنوان',
    },
    {
      name: 'location',
      type: 'point',
      label: 'الموقع الجغرافي',
      index: true,
    },
    {
      name: 'category',
      type: 'text',
      label: 'النشاط/التصنيف',
      index: true,
    },
    {
      name: 'priority',
      type: 'select',
      label: 'أولوية الزيارة',
      defaultValue: 'B',
      options: [
        { label: 'A - عالية', value: 'A' },
        { label: 'B - متوسطة', value: 'B' },
        { label: 'C - منخفضة', value: 'C' },
      ],
      index: true,
    },
    {
      name: 'externalData',
      type: 'group',
      label: 'بيانات خارجية (Apify / Google Maps)',
      admin: {
        condition: (data) => data?.source === 'google-maps',
      },
      fields: [
        { name: 'placeId', type: 'text', label: 'Google Place ID', index: true },
        { name: 'mapsUrl', type: 'text', label: 'رابط الخريطة' },
        { name: 'website', type: 'text', label: 'الموقع الإلكتروني' },
        { name: 'rating', type: 'number', label: 'تقييم Google', min: 0, max: 5 },
        { name: 'reviewCount', type: 'number', label: 'عدد المراجعات', min: 0 },
      ],
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
    {
      name: 'deletedAt',
      type: 'date',
      label: 'تاريخ الحذف',
      index: true,
      admin: { readOnly: true, position: 'sidebar', description: 'حذف مؤقت — يمكن استعادته' },
    },
    {
      name: 'deletedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'حُذف بواسطة',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
  timestamps: true,
}
