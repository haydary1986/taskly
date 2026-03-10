import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'

export const CrmActivities: CollectionConfig = {
  slug: 'crm-activities',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['type', 'subject', 'contact', 'deal', 'scheduledAt', 'completed'],
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
          if (!data.assignedTo) data.assignedTo = req.user.id
        }
        if (data?.completed && !data.completedAt) {
          data.completedAt = new Date().toISOString()
        }
        if (data && !data.completed) {
          data.completedAt = null
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      label: 'النوع',
      options: [
        { label: 'مكالمة', value: 'call' },
        { label: 'اجتماع', value: 'meeting' },
        { label: 'بريد إلكتروني', value: 'email' },
        { label: 'مهمة', value: 'task' },
        { label: 'ملاحظة', value: 'note' },
        { label: 'زيارة', value: 'visit' },
        { label: 'عرض تقديمي', value: 'presentation' },
      ],
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      label: 'الموضوع',
    },
    {
      name: 'description',
      type: 'richText',
      label: 'التفاصيل',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'contact',
          type: 'relationship',
          relationTo: 'clients',
          label: 'جهة الاتصال',
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
          name: 'deal',
          type: 'relationship',
          relationTo: 'deals',
          label: 'الصفقة',
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
      type: 'row',
      fields: [
        {
          name: 'scheduledAt',
          type: 'date',
          label: 'الموعد',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
        {
          name: 'duration',
          type: 'number',
          label: 'المدة (دقيقة)',
          min: 0,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'callDirection',
      type: 'select',
      label: 'اتجاه المكالمة',
      admin: {
        condition: (data) => data?.type === 'call',
      },
      options: [
        { label: 'صادرة', value: 'outgoing' },
        { label: 'واردة', value: 'incoming' },
      ],
    },
    {
      name: 'callResult',
      type: 'select',
      label: 'نتيجة المكالمة',
      admin: {
        condition: (data) => data?.type === 'call',
      },
      options: [
        { label: 'تم الرد', value: 'answered' },
        { label: 'لم يرد', value: 'no-answer' },
        { label: 'مشغول', value: 'busy' },
        { label: 'رسالة صوتية', value: 'voicemail' },
      ],
    },
    {
      name: 'meetingLocation',
      type: 'text',
      label: 'مكان الاجتماع',
      admin: {
        condition: (data) => data?.type === 'meeting',
      },
    },
    {
      name: 'completed',
      type: 'checkbox',
      defaultValue: false,
      label: 'مكتمل',
    },
    {
      name: 'completedAt',
      type: 'date',
      label: 'تاريخ الإكمال',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'outcome',
      type: 'textarea',
      label: 'النتيجة',
    },
    {
      name: 'attachments',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      label: 'المرفقات',
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
