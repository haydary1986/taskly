import type { CollectionConfig } from 'payload'
import { adminOrOwn, ADMIN_ROLES } from '../access/roles'

export const TimeEntries: CollectionConfig = {
  slug: 'time-entries',
  admin: {
    defaultColumns: ['user', 'task', 'startTime', 'endTime', 'duration', 'createdAt'],
    group: 'البرمجة',
  },
  access: {
    // Any authenticated user can log time. The beforeChange hook forces
    // user = req.user.id so they cannot log time as someone else.
    create: ({ req }) => !!req.user,
    // Read: admins see everything; others see entries they own OR entries
    // attached to a task they are the assignee of (so an employee can see
    // sessions a manager logged on their behalf).
    read: async ({ req }) => {
      if (!req.user) return false
      if (ADMIN_ROLES.includes(req.user.role as never)) return true
      const myTasks = await req.payload.find({
        collection: 'tasks',
        where: { assignee: { equals: req.user.id } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })
      const taskIds = myTasks.docs.map((t) => t.id)
      const orClauses: Array<Record<string, unknown>> = [{ user: { equals: req.user.id } }]
      if (taskIds.length > 0) orClauses.push({ task: { in: taskIds } })
      return { or: orClauses }
    },
    update: adminOrOwn('user'),
    delete: adminOrOwn('user'),
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
