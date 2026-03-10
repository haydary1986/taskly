import type { PayloadHandler } from 'payload'

/** GET /v1/task-calendar — Tasks grouped by due date for calendar view */
export const taskCalendar: PayloadHandler = async (req) => {
    const { payload, user } = req
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

    const url = new URL(req.url || '', 'http://localhost')
    const start = url.searchParams.get('start') || new Date().toISOString().slice(0, 7) + '-01'
    const end = url.searchParams.get('end') || (() => {
        const d = new Date(start)
        d.setMonth(d.getMonth() + 1)
        return d.toISOString()
    })()

    const role = user.role as string
    const isAdmin = ['super-admin', 'supervisor', 'auditor'].includes(role)

    const where: Record<string, any> = {
        dueDate: {
            greater_than_equal: start,
            less_than: end,
        },
        status: { not_equals: 'cancelled' },
    }

    if (!isAdmin) {
        where.assignee = { equals: user.id }
    }

    const tasks = await payload.find({
        collection: 'tasks',
        where,
        sort: 'dueDate',
        limit: 200,
        depth: 1,
    })

    // Group by date
    const grouped: Record<string, any[]> = {}
    for (const task of tasks.docs as any[]) {
        if (!task.dueDate) continue
        const dateKey = task.dueDate.slice(0, 10) // YYYY-MM-DD
        if (!grouped[dateKey]) grouped[dateKey] = []
        grouped[dateKey].push({
            id: task.id,
            title: task.title,
            type: task.type,
            priority: task.priority,
            status: task.status,
            assignee: task.assignee?.name || null,
            project: task.project?.name || null,
        })
    }

    return Response.json({
        start,
        end,
        totalTasks: tasks.totalDocs,
        calendar: grouped,
    })
}
