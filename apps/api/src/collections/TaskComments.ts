import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access/roles'

export const TaskComments: CollectionConfig = {
  slug: 'task-comments',
  admin: {
    defaultColumns: ['task', 'author', 'content', 'createdAt'],
    group: 'إدارة العمل',
  },
  access: {
    create: isAuthenticated,
    read: isAuthenticated,
    update: ({ req }) => {
      if (!req.user) return false
      return { author: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (['super-admin', 'supervisor'].includes(req.user.role as string)) return true
      return { author: { equals: req.user.id } }
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.author = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' || !req.user) return

        // Notify task assignee and assignedBy about the comment
        const taskId = typeof doc.task === 'object' ? doc.task.id : doc.task
        const task = await req.payload.findByID({ collection: 'tasks', id: taskId, depth: 0 })
        if (!task) return

        const { sendNotification } = await import('../lib/notify')
        const authorName = req.user.name || 'مستخدم'
        const content = doc.content || 'مرفق'

        const notifyIds = new Set<string>()
        if (task.assignee) {
          const id = typeof task.assignee === 'object' ? (task.assignee as any).id : task.assignee
          if (id !== req.user.id) notifyIds.add(id)
        }
        if (task.assignedBy) {
          const id = typeof task.assignedBy === 'object' ? (task.assignedBy as any).id : task.assignedBy
          if (id !== req.user.id) notifyIds.add(id)
        }

        // Handle @mentions
        const mentionIds = (doc.mentions || []).map((m: any) => typeof m === 'object' && m?.id ? m.id : m).filter(Boolean)
        for (const mid of mentionIds) {
          if (mid !== req.user.id) notifyIds.add(mid)
        }

        for (const userId of notifyIds) {
          sendNotification(req.payload, {
            recipientId: userId,
            type: 'comment',
            title: `تعليق جديد من ${authorName}`,
            message: content.length > 100 ? content.substring(0, 100) + '...' : content,
            link: `/tasks/${taskId}`,
            metadata: { taskId, commentId: doc.id },
          }).catch((err) => console.error('[TaskComment] Notification error:', err))
        }
      },
    ],
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
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'الكاتب',
      admin: { readOnly: true },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      label: 'التعليق',
    },
    {
      name: 'attachment',
      type: 'upload',
      relationTo: 'media',
      label: 'مرفق',
    },
    {
      name: 'mentions',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'الإشارات',
    },
  ],
  timestamps: true,
}
