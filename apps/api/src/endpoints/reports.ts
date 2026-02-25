import type { PayloadHandler } from 'payload'

export const exportReport: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  if (!['super-admin', 'supervisor', 'auditor'].includes(user.role as string)) {
    return Response.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const url = new URL(req.url || '', 'http://localhost')
  const type = url.searchParams.get('type') || 'tasks'
  const format = url.searchParams.get('format') || 'json'
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')

  const where: Record<string, any> = {}
  if (startDate) where.createdAt = { ...(where.createdAt || {}), greater_than: startDate }
  if (endDate) where.createdAt = { ...(where.createdAt || {}), less_than: endDate }

  let data: any[] = []
  let headers: string[] = []

  if (type === 'tasks') {
    const result = await payload.find({ collection: 'tasks', where, limit: 1000, depth: 1, sort: '-createdAt' })
    data = result.docs.map((t: any) => ({
      'العنوان': t.title,
      'النوع': t.type,
      'الحالة': t.status,
      'الأولوية': t.priority,
      'المسند إليه': t.assignee?.name || '',
      'المشروع': t.project?.name || '',
      'تاريخ الاستحقاق': t.dueDate || '',
      'تاريخ الإنجاز': t.completedAt || '',
      'تاريخ الإنشاء': t.createdAt,
    }))
    headers = ['العنوان', 'النوع', 'الحالة', 'الأولوية', 'المسند إليه', 'المشروع', 'تاريخ الاستحقاق', 'تاريخ الإنجاز', 'تاريخ الإنشاء']
  } else if (type === 'visits') {
    const result = await payload.find({ collection: 'visits', where, limit: 1000, depth: 1, sort: '-createdAt' })
    data = result.docs.map((v: any) => ({
      'العميل': v.client?.name || '',
      'المندوب': v.representative?.name || '',
      'الحالة': v.status,
      'وقت الدخول': v.checkInTime,
      'وقت الخروج': v.checkOutTime || '',
      'المسافة': v.distance || '',
      'صالحة': v.isValid ? 'نعم' : 'لا',
    }))
    headers = ['العميل', 'المندوب', 'الحالة', 'وقت الدخول', 'وقت الخروج', 'المسافة', 'صالحة']
  } else if (type === 'performance') {
    const result = await payload.find({ collection: 'time-entries', where, limit: 1000, depth: 1, sort: '-createdAt' })
    data = result.docs.map((e: any) => ({
      'المستخدم': e.user?.name || '',
      'المهمة': e.task?.title || '',
      'وقت البدء': e.startTime,
      'وقت الانتهاء': e.endTime || '',
      'المدة (دقيقة)': e.duration || '',
      'الوصف': e.description || '',
    }))
    headers = ['المستخدم', 'المهمة', 'وقت البدء', 'وقت الانتهاء', 'المدة (دقيقة)', 'الوصف']
  }

  if (format === 'csv') {
    const csvHeader = headers.join(',')
    const csvRows = data.map((row) => headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    const csv = '\uFEFF' + [csvHeader, ...csvRows].join('\n') // BOM for Arabic
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${type}-report.csv"`,
      },
    })
  }

  return Response.json({ type, total: data.length, data })
}
