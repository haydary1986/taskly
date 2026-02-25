import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'

export const CodeReviews: CollectionConfig = {
  slug: 'code-reviews',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'task', 'submittedBy', 'status', 'createdAt'],
    group: 'البرمجة',
  },
  access: {
    create: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'supervisor', 'programmer'].includes(req.user.role as string)
    },
    read: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor', 'auditor'].includes(role)) return true
      if (role === 'programmer') {
        return {
          or: [
            { submittedBy: { equals: req.user.id } } as Record<string, any>,
            { reviewer: { equals: req.user.id } } as Record<string, any>,
          ],
        }
      }
      return false
    },
    update: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor', 'auditor'].includes(role)) return true
      return { submittedBy: { equals: req.user.id } }
    },
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.submittedBy = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, previousDoc, req }) => {
        if (operation === 'update' && previousDoc?.status !== doc.status) {
          const submittedById = typeof doc.submittedBy === 'object' ? doc.submittedBy.id : doc.submittedBy
          if (submittedById && submittedById !== req.user?.id) {
            const statusLabels: Record<string, string> = {
              approved: 'تمت الموافقة',
              rejected: 'تم الرفض',
              'changes-requested': 'مطلوب تعديلات',
            }
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: submittedById,
                type: 'task-updated',
                title: 'تحديث مراجعة الكود',
                message: `${statusLabels[doc.status] || doc.status} على "${doc.title}"`,
                link: '/code-reviews',
              },
              req,
            })
          }
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'العنوان',
    },
    {
      name: 'task',
      type: 'relationship',
      relationTo: 'tasks',
      label: 'المهمة المرتبطة',
    },
    {
      name: 'submittedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'مقدم من',
      admin: { readOnly: true },
    },
    {
      name: 'reviewer',
      type: 'relationship',
      relationTo: 'users',
      label: 'المراجع',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: 'الحالة',
      options: [
        { label: 'بانتظار المراجعة', value: 'pending' },
        { label: 'قيد المراجعة', value: 'in-review' },
        { label: 'تمت الموافقة', value: 'approved' },
        { label: 'مرفوض', value: 'rejected' },
        { label: 'مطلوب تعديلات', value: 'changes-requested' },
      ],
    },
    {
      name: 'githubRepo',
      type: 'text',
      label: 'مستودع GitHub',
    },
    {
      name: 'githubBranch',
      type: 'text',
      label: 'الفرع',
    },
    {
      name: 'githubPR',
      type: 'text',
      label: 'رابط Pull Request',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'وصف التغييرات',
    },
    {
      name: 'reviewNotes',
      type: 'textarea',
      label: 'ملاحظات المراجعة',
    },
  ],
  timestamps: true,
}
