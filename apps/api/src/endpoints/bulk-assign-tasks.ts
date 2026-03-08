import type { PayloadHandler } from 'payload'
import { validateBody, bulkAssignSchema } from '../lib/validators'
import { createLogger } from '../lib/logger'

const log = createLogger('bulk-assign')

export const bulkAssignTasks: PayloadHandler = async (req) => {
  const { payload, user } = req

  if (!user) {
    return Response.json({ error: 'غير مصرح' }, { status: 401 })
  }

  if (!['super-admin', 'supervisor', 'auditor'].includes(user.role as string)) {
    return Response.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const body = await req.json?.()
  const validation = validateBody(bulkAssignSchema, body)
  if (!validation.success) return validation.response

  const { taskIds, assignee } = validation.data

  const results = await Promise.allSettled(
    taskIds.map((id) =>
      payload.update({
        collection: 'tasks',
        id,
        data: { assignee },
        req,
      }),
    ),
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  log.info({ userId: user.id, taskCount: taskIds.length, succeeded, failed }, 'Bulk assignment completed')

  return Response.json({
    message: `تم تعيين ${succeeded} مهمة بنجاح${failed > 0 ? `، فشل ${failed}` : ''}`,
    succeeded,
    failed,
  })
}
