import type { PayloadHandler } from 'payload'

export const bulkAssignTasks: PayloadHandler = async (req) => {
  const { payload, user } = req

  if (!user) {
    return Response.json({ error: 'غير مصرح' }, { status: 401 })
  }

  if (!['super-admin', 'supervisor', 'auditor'].includes(user.role as string)) {
    return Response.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const body = await req.json?.() as { taskIds: string[]; assignee: string } | undefined
  if (!body?.taskIds?.length || !body?.assignee) {
    return Response.json({ error: 'يرجى تحديد المهام والموظف' }, { status: 400 })
  }

  const { taskIds, assignee } = body

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

  return Response.json({
    message: `تم تعيين ${succeeded} مهمة بنجاح${failed > 0 ? `، فشل ${failed}` : ''}`,
    succeeded,
    failed,
  })
}
