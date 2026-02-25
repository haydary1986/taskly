import type { CollectionConfig } from 'payload'
import { isAdmin, adminOrOwn } from '../access/roles'

export const DesignRequests: CollectionConfig = {
  slug: 'design-requests',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'platform', 'status', 'designer', 'createdAt'],
    group: 'التصميم',
  },
  access: {
    create: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'supervisor', 'social-media-manager', 'auditor'].includes(req.user.role as string)
    },
    read: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor', 'auditor', 'social-media-manager'].includes(role)) return true
      if (role === 'designer') return { designer: { equals: req.user.id } }
      return false
    },
    update: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor', 'auditor', 'social-media-manager'].includes(role)) return true
      if (role === 'designer') return { designer: { equals: req.user.id } }
      return false
    },
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.requestedBy = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create' && doc.designer) {
          const designerId = typeof doc.designer === 'object' ? doc.designer.id : doc.designer
          await req.payload.create({
            collection: 'notifications',
            data: {
              recipient: designerId,
              type: 'task-assigned',
              title: 'طلب تصميم جديد',
              message: `تم تعيين طلب تصميم "${doc.title}" لك`,
              link: '/designs/my',
            },
            req,
          })
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'عنوان الطلب',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'الوصف والمتطلبات',
    },
    {
      name: 'platform',
      type: 'select',
      hasMany: true,
      required: true,
      label: 'المنصات',
      options: [
        { label: 'إنستغرام', value: 'instagram' },
        { label: 'تويتر', value: 'twitter' },
        { label: 'فيسبوك', value: 'facebook' },
        { label: 'تيك توك', value: 'tiktok' },
        { label: 'لينكدإن', value: 'linkedin' },
        { label: 'سناب شات', value: 'snapchat' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'requested',
      label: 'الحالة',
      options: [
        { label: 'مطلوب', value: 'requested' },
        { label: 'قيد التنفيذ', value: 'in-progress' },
        { label: 'قيد المراجعة', value: 'in-review' },
        { label: 'موافق', value: 'approved' },
        { label: 'مرفوض', value: 'rejected' },
        { label: 'منشور', value: 'published' },
      ],
    },
    {
      name: 'designer',
      type: 'relationship',
      relationTo: 'users',
      label: 'المصمم',
    },
    {
      name: 'requestedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'طلب بواسطة',
      admin: { readOnly: true },
    },
    {
      name: 'dueDate',
      type: 'date',
      label: 'تاريخ التسليم',
    },
    {
      name: 'designs',
      type: 'array',
      label: 'التصاميم المرفقة',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'الصورة',
        },
        {
          name: 'note',
          type: 'text',
          label: 'ملاحظة',
        },
      ],
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      label: 'ملاحظات المراجعة',
    },
  ],
  timestamps: true,
}
