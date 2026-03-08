import type { PayloadHandler } from 'payload'
import { createLogger } from '../lib/logger'

const log = createLogger('reports')

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

  log.info({ type, format, count: data.length }, 'Report exported')

  if (format === 'csv') {
    const csvHeader = headers.join(',')
    const csvRows = data.map((row) => headers.map((h) => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    const csv = '\uFEFF' + [csvHeader, ...csvRows].join('\n')
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${type}-report.csv"`,
      },
    })
  }

  if (format === 'pdf') {
    // Generate HTML for client-side PDF rendering/printing
    const typeLabels: Record<string, string> = { tasks: 'المهام', visits: 'الزيارات', performance: 'الأداء' }
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تقرير ${typeLabels[type] || type} - Taskly</title>
  <style>
    body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', sans-serif; direction: rtl; padding: 20px; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
    .meta { color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #2563eb; color: white; padding: 10px 8px; text-align: right; font-size: 13px; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #999; font-size: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>📊 تقرير ${typeLabels[type] || type}</h1>
  <div class="meta">
    <p>التاريخ: ${new Date().toLocaleDateString('ar-IQ')}</p>
    ${startDate ? `<p>من: ${startDate}</p>` : ''}
    ${endDate ? `<p>إلى: ${endDate}</p>` : ''}
    <p>عدد السجلات: ${data.length}</p>
  </div>
  <table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${data.map((row) => `<tr>${headers.map((h) => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('\n')}
    </tbody>
  </table>
  <div class="footer">
    <p>Taskly - ALGO-NEST | تم إنشاء التقرير تلقائياً</p>
  </div>
  <script>window.onload = () => window.print()</script>
</body>
</html>`
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${type}-report.html"`,
      },
    })
  }

  return Response.json({ type, total: data.length, data })
}
