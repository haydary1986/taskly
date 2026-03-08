import type { PayloadHandler } from 'payload'
import { cacheGetOrSet } from '../lib/cache'
import { createLogger } from '../lib/logger'

const log = createLogger('dashboard')

export const dashboardStats: PayloadHandler = async (req) => {
  const { payload, user } = req

  if (!user) {
    return Response.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const role = user.role as string
  const isAdmin = ['super-admin', 'supervisor', 'auditor'].includes(role)
  const cacheKey = isAdmin ? `dash:admin` : `dash:user:${user.id}`
  const cacheTtl = isAdmin ? 2 * 60_000 : 60_000

  const stats = await cacheGetOrSet(cacheKey, cacheTtl, async () => {
    return computeDashboardStats(payload, user, role, isAdmin)
  })

  return Response.json(stats)
}

async function computeDashboardStats(payload: any, user: any, role: string, isAdmin: boolean) {
  // Base stats everyone can see
  const [tasksResult, projectsResult] = await Promise.all([
    payload.count({ collection: 'tasks', where: { status: { not_equals: 'cancelled' } } }),
    payload.count({ collection: 'projects', where: { status: { not_equals: 'cancelled' } } }),
  ])

  const stats: Record<string, any> = {
    activeTasks: tasksResult.totalDocs,
    activeProjects: projectsResult.totalDocs,
  }

  if (isAdmin) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [usersResult, tasksByStatus, tasksByPriority, tasksByType, projectsByStatus, visitsToday] = await Promise.all([
      payload.count({ collection: 'users', where: { isActive: { equals: true } } }),
      Promise.all([
        payload.count({ collection: 'tasks', where: { status: { equals: 'new' } } }),
        payload.count({ collection: 'tasks', where: { status: { equals: 'in-progress' } } }),
        payload.count({ collection: 'tasks', where: { status: { equals: 'in-review' } } }),
        payload.count({ collection: 'tasks', where: { status: { equals: 'completed' } } }),
        payload.count({ collection: 'tasks', where: { status: { equals: 'cancelled' } } }),
      ]),
      Promise.all([
        payload.count({ collection: 'tasks', where: { priority: { equals: 'urgent' } } }),
        payload.count({ collection: 'tasks', where: { priority: { equals: 'high' } } }),
        payload.count({ collection: 'tasks', where: { priority: { equals: 'medium' } } }),
        payload.count({ collection: 'tasks', where: { priority: { equals: 'low' } } }),
      ]),
      Promise.all([
        payload.count({ collection: 'tasks', where: { type: { equals: 'programming' } } }),
        payload.count({ collection: 'tasks', where: { type: { equals: 'field-visit' } } }),
        payload.count({ collection: 'tasks', where: { type: { equals: 'design' } } }),
        payload.count({ collection: 'tasks', where: { type: { equals: 'general' } } }),
      ]),
      Promise.all([
        payload.count({ collection: 'projects', where: { status: { equals: 'planning' } } }),
        payload.count({ collection: 'projects', where: { status: { equals: 'active' } } }),
        payload.count({ collection: 'projects', where: { status: { equals: 'on-hold' } } }),
        payload.count({ collection: 'projects', where: { status: { equals: 'completed' } } }),
      ]),
      payload.count({
        collection: 'visits',
        where: { checkInTime: { greater_than: todayStart.toISOString() } },
      }),
    ])

    stats.activeEmployees = usersResult.totalDocs
    stats.tasksByStatus = { new: tasksByStatus[0].totalDocs, inProgress: tasksByStatus[1].totalDocs, inReview: tasksByStatus[2].totalDocs, completed: tasksByStatus[3].totalDocs, cancelled: tasksByStatus[4].totalDocs }
    stats.tasksByPriority = { urgent: tasksByPriority[0].totalDocs, high: tasksByPriority[1].totalDocs, medium: tasksByPriority[2].totalDocs, low: tasksByPriority[3].totalDocs }
    stats.tasksByType = { programming: tasksByType[0].totalDocs, fieldVisit: tasksByType[1].totalDocs, design: tasksByType[2].totalDocs, general: tasksByType[3].totalDocs }
    stats.projectsByStatus = { planning: projectsByStatus[0].totalDocs, active: projectsByStatus[1].totalDocs, onHold: projectsByStatus[2].totalDocs, completed: projectsByStatus[3].totalDocs }
    stats.visitsToday = visitsToday.totalDocs

    // Weekly trend — optimized with batch query
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    const [completedThisWeek, createdThisWeek] = await Promise.all([
      payload.find({ collection: 'tasks', where: { completedAt: { greater_than: weekStart.toISOString() } }, limit: 0, depth: 0 }),
      payload.find({ collection: 'tasks', where: { createdAt: { greater_than: weekStart.toISOString() } }, limit: 0, depth: 0 }),
    ])

    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    const weeklyTrend: { date: string; completed: number; created: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date()
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const completed = (completedThisWeek.docs as any[]).filter((t) => {
        const d = new Date(t.completedAt)
        return d >= dayStart && d <= dayEnd
      }).length

      const created = (createdThisWeek.docs as any[]).filter((t) => {
        const d = new Date(t.createdAt)
        return d >= dayStart && d <= dayEnd
      }).length

      weeklyTrend.push({ date: dayNames[dayStart.getDay()], completed, created })
    }
    stats.weeklyTrend = weeklyTrend

    // Top performers — batch query instead of 500-doc fetch
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const completedThisMonth = await payload.find({
      collection: 'tasks',
      where: { status: { equals: 'completed' }, completedAt: { greater_than: monthStart.toISOString() } },
      depth: 1,
      limit: 200,
    })

    const performerMap: Record<string, { name: string; count: number }> = {}
    for (const task of completedThisMonth.docs as any[]) {
      const assignee = task.assignee
      if (!assignee) continue
      const id = typeof assignee === 'object' ? assignee.id : assignee
      const name = typeof assignee === 'object' ? assignee.name : id
      if (!performerMap[id]) performerMap[id] = { name, count: 0 }
      performerMap[id].count++
    }
    stats.topPerformers = Object.values(performerMap).sort((a, b) => b.count - a.count).slice(0, 5)
  }

  // Employee-specific stats
  if (['programmer', 'sales-rep', 'designer', 'social-media-manager'].includes(role)) {
    const myTasks = await payload.find({
      collection: 'tasks',
      where: { assignee: { equals: user.id }, status: { not_equals: 'cancelled' } },
      limit: 0,
    })

    stats.myTasks = {
      total: myTasks.totalDocs,
      new: myTasks.docs.filter((t: any) => t.status === 'new').length,
      inProgress: myTasks.docs.filter((t: any) => t.status === 'in-progress').length,
      inReview: myTasks.docs.filter((t: any) => t.status === 'in-review').length,
      completed: myTasks.docs.filter((t: any) => t.status === 'completed').length,
    }

    const now = new Date().toISOString()
    stats.overdueTasks = myTasks.docs.filter(
      (t: any) => t.dueDate && t.dueDate < now && !['completed', 'cancelled'].includes(t.status),
    ).length
  }

  // Recent tasks
  const recentTasks = await payload.find({
    collection: 'tasks',
    limit: 10,
    sort: '-updatedAt',
    depth: 1,
    ...(!isAdmin ? { where: { assignee: { equals: user.id } } } : {}),
  })
  stats.recentTasks = recentTasks.docs

  return stats
}
