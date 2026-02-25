import type { CollectionConfig } from 'payload'
import { isAdmin, adminOrOwn } from '../access/roles'

export const TimeEntries: CollectionConfig = {
  slug: 'time-entries',
  admin: {
    defaultColumns: ['user', 'task', 'startTime', 'endTime', 'duration', 'createdAt'],
    group: 'البرمجة',
  },
  access: {
    create: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'supervisor', 'programmer'].includes(req.user.role as string)
    },
    read: adminOrOwn('user'),
    update: adminOrOwn('user'),
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.user = req.user.id
        }
        if (data?.startTime && data?.endTime) {
          const start = new Date(data.startTime).getTime()
          const end = new Date(data.endTime).getTime()
          data.duration = Math.round((end - start) / 60000)
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'المستخدم',
      admin: { readOnly: true },
      index: true,
    },
    {
      name: 'task',
      type: 'relationship',
      relationTo: 'tasks',
      required: true,
      label: 'المهمة',
    },
    {
      name: 'startTime',
      type: 'date',
      required: true,
      label: 'وقت البدء',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'endTime',
      type: 'date',
      label: 'وقت الانتهاء',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'duration',
      type: 'number',
      label: 'المدة (دقيقة)',
      admin: { readOnly: true },
    },
    {
      name: 'description',
      type: 'text',
      label: 'وصف العمل',
    },
    {
      name: 'isRunning',
      type: 'checkbox',
      defaultValue: false,
      label: 'قيد التسجيل',
    },
  ],
  timestamps: true,
}
