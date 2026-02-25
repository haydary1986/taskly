import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../access/roles'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'manager', 'progress', 'startDate', 'endDate'],
    group: 'إدارة العمل',
  },
  access: {
    create: isAdmin,
    read: isAuthenticated,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'اسم المشروع',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'الوصف',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planning',
      label: 'الحالة',
      options: [
        { label: 'تخطيط', value: 'planning' },
        { label: 'نشط', value: 'active' },
        { label: 'معلق', value: 'on-hold' },
        { label: 'مكتمل', value: 'completed' },
        { label: 'ملغي', value: 'cancelled' },
      ],
    },
    {
      name: 'estimatedHours',
      type: 'number',
      label: 'الساعات المقدرة',
      min: 0,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startDate',
          type: 'date',
          label: 'تاريخ البداية',
          admin: { width: '50%' },
        },
        {
          name: 'endDate',
          type: 'date',
          label: 'تاريخ النهاية',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'manager',
      type: 'relationship',
      relationTo: 'users',
      label: 'مدير المشروع',
    },
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'أعضاء الفريق',
    },
    {
      name: 'tasks',
      type: 'join',
      collection: 'tasks',
      on: 'project',
    },
  ],
  timestamps: true,
}
