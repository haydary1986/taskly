import type { CollectionConfig } from 'payload'
import { isAuthenticated, isAdmin } from '../access/roles'

export const ProjectFiles: CollectionConfig = {
  slug: 'project-files',
  admin: {
    defaultColumns: ['name', 'project', 'uploadedBy', 'file', 'createdAt'],
    group: 'إدارة العمل',
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: ({ req }) => {
      if (!req.user) return false
      if (['super-admin', 'supervisor'].includes(req.user.role as string)) return true
      return { uploadedBy: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (['super-admin', 'supervisor'].includes(req.user.role as string)) return true
      return { uploadedBy: { equals: req.user.id } }
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.uploadedBy = req.user.id
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
      label: 'اسم الملف',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'الوصف',
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      label: 'المشروع',
      index: true,
    },
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'الملف',
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'رفع بواسطة',
      admin: { readOnly: true },
    },
    {
      name: 'category',
      type: 'select',
      label: 'التصنيف',
      defaultValue: 'general',
      options: [
        { label: 'عام', value: 'general' },
        { label: 'مستند', value: 'document' },
        { label: 'تصميم', value: 'design' },
        { label: 'عقد', value: 'contract' },
        { label: 'تقرير', value: 'report' },
        { label: 'صورة', value: 'image' },
      ],
    },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      label: 'الوسوم',
    },
    {
      name: 'sharedWith',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'مشترك مع',
    },
  ],
  timestamps: true,
}
