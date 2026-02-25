import type { CollectionConfig } from 'payload'
import { isAuthenticated, isAdmin } from '../access/roles'

export const TaskActivities: CollectionConfig = {
  slug: 'task-activities',
  admin: {
    defaultColumns: ['task', 'user', 'action', 'createdAt'],
    group: 'إدارة العمل',
  },
  access: {
    create: () => false, // System-only via hooks
    read: isAuthenticated,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'task',
      type: 'relationship',
      relationTo: 'tasks',
      required: true,
      label: 'المهمة',
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'المستخدم',
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      label: 'الإجراء',
      options: [
        { label: 'تم الإنشاء', value: 'created' },
        { label: 'تم التعديل', value: 'updated' },
        { label: 'تغيير الحالة', value: 'status-changed' },
        { label: 'تغيير الأولوية', value: 'priority-changed' },
        { label: 'تغيير المسند إليه', value: 'assignee-changed' },
        { label: 'تعليق', value: 'commented' },
        { label: 'مرفق', value: 'attachment-added' },
      ],
    },
    {
      name: 'details',
      type: 'json',
      label: 'التفاصيل',
    },
  ],
  timestamps: true,
}
