import type { PayloadHandler } from 'payload'
import { cacheGetOrSet } from '../lib/cache'
import { createLogger } from '../lib/logger'

const log = createLogger('kpi')

export const kpiStats: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  if (!['super-admin', 'supervisor', 'auditor'].includes(user.role as string)) {
    return Response.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const tab = (req as any).query?.tab || 'sales'
  const cacheKey = `kpi:${tab}`

  const result = await cacheGetOrSet(cacheKey, 5 * 60_000, async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    if (tab === 'sales') {
      return computeSalesKPI(payload, startOfMonth)
    }
    return computeProgrammerKPI(payload, startOfMonth)
  })

  return Response.json(result)
}

async function computeSalesKPI(payload: any, startOfMonth: Date) {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Batch: fetch all visits this month in one query
  const [allReps, monthVisits, clientCount, newClients] = await Promise.all([
    payload.find({ collection: 'users', where: { role: { equals: 'sales-rep' }, isActive: { equals: true } }, limit: 100 }),
    payload.find({
      collection: 'visits',
      where: { checkInTime: { greater_than: startOfMonth.toISOString() } },
      limit: 0,
      depth: 0,
    }),
    payload.count({ collection: 'clients' }),
    payload.find({ collection: 'clients', where: { createdAt: { greater_than: startOfMonth.toISOString() } }, limit: 0 }),
  ])

  // Group visits by representative in-memory (fixes N+1)
  const repVisitCounts: Record<string, number> = {}
  let todayCount = 0
  let weekCount = 0

  for (const visit of monthVisits.docs as any[]) {
    const repId = typeof visit.representative === 'object' ? visit.representative.id : visit.representative
    repVisitCounts[repId] = (repVisitCounts[repId] || 0) + 1

    const visitTime = new Date(visit.checkInTime)
    if (visitTime >= todayStart) todayCount++
    if (visitTime >= startOfWeek) weekCount++
  }

  // Build leaderboard from grouped data
  const leaderboard = allReps.docs
    .map((rep: any) => ({
      name: rep.name,
      count: repVisitCounts[rep.id] || 0,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)

  return {
    tab: 'sales',
    todayVisits: todayCount,
    weekVisits: weekCount,
    monthVisits: monthVisits.totalDocs,
    totalClients: clientCount.totalDocs,
    newClientsThisMonth: newClients.totalDocs,
    totalReps: allReps.totalDocs,
    leaderboard,
  }
}

async function computeProgrammerKPI(payload: any, startOfMonth: Date) {
  // Batch fetch: all programmers, completed tasks, and time entries
  const [allProgrammers, completedTasks, timeEntries] = await Promise.all([
    payload.find({ collection: 'users', where: { role: { equals: 'programmer' }, isActive: { equals: true } }, limit: 100 }),
    payload.find({
      collection: 'tasks',
      where: {
        type: { equals: 'programming' },
        status: { equals: 'completed' },
        completedAt: { greater_than: startOfMonth.toISOString() },
      },
      limit: 0,
      depth: 0,
    }),
    payload.find({
      collection: 'time-entries',
      where: { startTime: { greater_than: startOfMonth.toISOString() } },
      limit: 0,
      depth: 0,
    }),
  ])

  // Group tasks and hours by programmer in-memory (fixes N+1)
  const progData: Record<string, { tasks: number; minutes: number }> = {}
  for (const task of completedTasks.docs as any[]) {
    const id = typeof task.assignee === 'object' ? task.assignee?.id : task.assignee
    if (!id) continue
    if (!progData[id]) progData[id] = { tasks: 0, minutes: 0 }
    progData[id].tasks++
  }
  for (const entry of timeEntries.docs as any[]) {
    const id = typeof entry.user === 'object' ? entry.user?.id : entry.user
    if (!id) continue
    if (!progData[id]) progData[id] = { tasks: 0, minutes: 0 }
    progData[id].minutes += entry.duration || 0
  }

  const totalMinutes = timeEntries.docs.reduce((sum: number, e: any) => sum + (e.duration || 0), 0)

  const leaderboard = allProgrammers.docs
    .map((prog: any) => ({
      name: prog.name,
      tasks: progData[prog.id]?.tasks || 0,
      hours: Math.round((progData[prog.id]?.minutes || 0) / 60 * 10) / 10,
    }))
    .sort((a: any, b: any) => b.tasks - a.tasks)
    .slice(0, 10)

  return {
    tab: 'programmers',
    completedTasksThisMonth: completedTasks.totalDocs,
    totalHoursThisMonth: Math.round(totalMinutes / 60 * 10) / 10,
    totalProgrammers: allProgrammers.totalDocs,
    leaderboard,
  }
}
