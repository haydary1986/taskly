import type { CollectionConfig } from 'payload'
import { isAdmin, adminOrOwn } from '../access/roles'

export const Tasks: CollectionConfig = {
  slug: 'tasks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'status', 'priority', 'assignee', 'dueDate'],
    group: 'إدارة العمل',
  },
  access: {
    create: isAdmin,
    read: adminOrOwn('assignee'),
    update: adminOrOwn('assignee'),
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.assignedBy = req.user.id
        }
        if (data?.status === 'completed' && !data.completedAt) {
          data.completedAt = new Date().toISOString()
        }
        if (data?.status !== 'completed') {
          data.completedAt = null
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req, previousDoc }) => {
        // Log activity (cast to any — types regenerated after payload generate:types)
        if (req.user) {
          try {
            const createActivity = (action: string, details: any) =>
              (req.payload as any).create({
                collection: 'task-activities',
                data: { task: doc.id, user: req.user!.id, action, details },
                overrideAccess: true,
              })

            if (operation === 'create') {
              await createActivity('created', { title: doc.title })
            } else if (operation === 'update' && previousDoc) {
              if (previousDoc.status !== doc.status) {
                await createActivity('status-changed', { from: previousDoc.status, to: doc.status })
              }
              if (previousDoc.priority !== doc.priority) {
                await createActivity('priority-changed', { from: previousDoc.priority, to: doc.priority })
              }
              const prevAssignee = typeof previousDoc.assignee === 'object' ? (previousDoc.assignee as any)?.id : previousDoc.assignee
              const newAssignee = typeof doc.assignee === 'object' ? doc.assignee?.id : doc.assignee
              if (prevAssignee !== newAssignee) {
                await createActivity('assignee-changed', { from: prevAssignee, to: newAssignee })
              }
            }
          } catch (err) {
            console.error('[Tasks] Activity log error:', err)
          }
        }

        // Create notification on task assignment
        if (operation === 'create' && doc.assignee) {
          const assigneeId = typeof doc.assignee === 'object' ? doc.assignee.id : doc.assignee
          if (assigneeId !== req.user?.id) {
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: assigneeId,
                type: 'task-assigned',
                title: 'مهمة جديدة',
                message: `تم تعيين مهمة "${doc.title}" لك`,
                link: `/tasks/my`,
              },
              req,
            })
          }
        }

        // Notify on status change
        if (operation === 'update' && previousDoc?.status !== doc.status && doc.assignedBy) {
          const assignedById = typeof doc.assignedBy === 'object' ? doc.assignedBy.id : doc.assignedBy
          if (assignedById !== req.user?.id) {
            const statusLabels: Record<string, string> = {
              'new': 'جديدة',
              'in-progress': 'قيد التنفيذ',
              'in-review': 'قيد المراجعة',
              'completed': 'مكتملة',
              'cancelled': 'ملغاة',
            }
            await req.payload.create({
              collection: 'notifications',
              data: {
                recipient: assignedById,
                type: 'task-updated',
                title: 'تحديث مهمة',
                message: `تم تحديث حالة "${doc.title}" إلى ${statusLabels[doc.status] || doc.status}`,
                link: `/tasks`,
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
      label: 'عنوان المهمة',
    },
    {
      name: 'description',
      type: 'richText',
      label: 'الوصف',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'general',
          label: 'النوع',
          admin: { width: '50%' },
          options: [
            { label: 'برمجة', value: 'programming' },
            { label: 'زيارة ميدانية', value: 'field-visit' },
            { label: 'تصميم', value: 'design' },
            { label: 'عام', value: 'general' },
          ],
        },
        {
          name: 'priority',
          type: 'select',
          required: true,
          defaultValue: 'medium',
          label: 'الأولوية',
          admin: { width: '50%' },
          options: [
            { label: 'عاجل', value: 'urgent' },
            { label: 'عالي', value: 'high' },
            { label: 'متوسط', value: 'medium' },
            { label: 'منخفض', value: 'low' },
          ],
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      label: 'الحالة',
      options: [
        { label: 'جديدة', value: 'new' },
        { label: 'قيد التنفيذ', value: 'in-progress' },
        { label: 'قيد المراجعة', value: 'in-review' },
        { label: 'مكتملة', value: 'completed' },
        { label: 'ملغاة', value: 'cancelled' },
      ],
    },
    {
      name: 'assignee',
      type: 'relationship',
      relationTo: 'users',
      label: 'المسند إليه',
    },
    {
      name: 'assignedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'المسند من',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'project',
      type: 'relationship',
      relationTo: 'projects',
      label: 'المشروع',
    },
    {
      name: 'dueDate',
      type: 'date',
      label: 'تاريخ الاستحقاق',
    },
    {
      name: 'recurrence',
      type: 'select',
      defaultValue: 'none',
      label: 'التكرار',
      options: [
        { label: 'بدون تكرار', value: 'none' },
        { label: 'يومي', value: 'daily' },
        { label: 'أسبوعي', value: 'weekly' },
        { label: 'شهري', value: 'monthly' },
      ],
    },
    {
      name: 'githubRepo',
      type: 'text',
      label: 'مستودع GitHub',
      admin: {
        condition: (data) => data?.type === 'programming',
      },
    },
    {
      name: 'githubBranch',
      type: 'text',
      label: 'فرع GitHub',
      admin: {
        condition: (data) => data?.type === 'programming',
      },
    },
    {
      name: 'dependencies',
      type: 'relationship',
      relationTo: 'tasks',
      hasMany: true,
      label: 'يعتمد على',
      admin: { description: 'المهام التي يجب إنجازها قبل هذه المهمة' },
    },
    {
      name: 'completedAt',
      type: 'date',
      label: 'تاريخ الإنجاز',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
