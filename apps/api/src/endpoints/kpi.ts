import type { PayloadHandler } from 'payload'

export const kpiStats: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  if (!['super-admin', 'supervisor', 'auditor'].includes(user.role as string)) {
    return Response.json({ error: 'ليس لديك صلاحية' }, { status: 403 })
  }

  const tab = (req as any).query?.tab || 'sales'
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  if (tab === 'sales') {
    // Sales KPIs
    const [allReps, todayVisits, weekVisits, monthVisits, allClients, newClientsMonth] = await Promise.all([
      payload.find({ collection: 'users', where: { role: { equals: 'sales-rep' }, isActive: { equals: true } }, limit: 100 }),
      payload.find({ collection: 'visits', where: { checkInTime: { greater_than: new Date(now.setHours(0, 0, 0, 0)).toISOString() } }, limit: 0 }),
      payload.find({ collection: 'visits', where: { checkInTime: { greater_than: startOfWeek.toISOString() } }, limit: 0 }),
      payload.find({ collection: 'visits', where: { checkInTime: { greater_than: startOfMonth.toISOString() } }, limit: 0 }),
      payload.count({ collection: 'clients' }),
      payload.find({ collection: 'clients', where: { createdAt: { greater_than: startOfMonth.toISOString() } }, limit: 0 }),
    ])

    // Leaderboard - visits per rep this month
    const repVisitCounts: Record<string, { name: string; count: number }> = {}
    for (const rep of allReps.docs) {
      const repVisits = await payload.count({
        collection: 'visits',
        where: {
          representative: { equals: rep.id },
          checkInTime: { greater_than: startOfMonth.toISOString() },
        },
      })
      repVisitCounts[rep.id] = { name: (rep as any).name, count: repVisits.totalDocs }
    }

    const leaderboard = Object.values(repVisitCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return Response.json({
      tab: 'sales',
      todayVisits: todayVisits.totalDocs,
      weekVisits: weekVisits.totalDocs,
      monthVisits: monthVisits.totalDocs,
      totalClients: allClients.totalDocs,
      newClientsThisMonth: newClientsMonth.totalDocs,
      totalReps: allReps.totalDocs,
      leaderboard,
    })
  }

  // Programmer KPIs
  const [allProgrammers, completedTasksMonth, totalTimeMonth] = await Promise.all([
    payload.find({ collection: 'users', where: { role: { equals: 'programmer' }, isActive: { equals: true } }, limit: 100 }),
    payload.find({
      collection: 'tasks',
      where: {
        type: { equals: 'programming' },
        status: { equals: 'completed' },
        completedAt: { greater_than: startOfMonth.toISOString() },
      },
      limit: 0,
    }),
    payload.find({
      collection: 'time-entries',
      where: { startTime: { greater_than: startOfMonth.toISOString() } },
      limit: 0,
    }),
  ])

  // Leaderboard - completed tasks per programmer
  const progCounts: Record<string, { name: string; tasks: number; hours: number }> = {}
  for (const prog of allProgrammers.docs) {
    const progTasks = await payload.count({
      collection: 'tasks',
      where: {
        assignee: { equals: prog.id },
        type: { equals: 'programming' },
        status: { equals: 'completed' },
        completedAt: { greater_than: startOfMonth.toISOString() },
      },
    })
    const progTime = await payload.find({
      collection: 'time-entries',
      where: {
        user: { equals: prog.id },
        startTime: { greater_than: startOfMonth.toISOString() },
      },
      limit: 0,
    })
    const totalMinutes = progTime.docs.reduce((sum: number, entry: any) => sum + (entry.duration || 0), 0)
    progCounts[prog.id] = {
      name: (prog as any).name,
      tasks: progTasks.totalDocs,
      hours: Math.round(totalMinutes / 60 * 10) / 10,
    }
  }

  const leaderboard = Object.values(progCounts)
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 10)

  const totalMinutes = totalTimeMonth.docs.reduce((sum: number, e: any) => sum + (e.duration || 0), 0)

  return Response.json({
    tab: 'programmers',
    completedTasksThisMonth: completedTasksMonth.totalDocs,
    totalHoursThisMonth: Math.round(totalMinutes / 60 * 10) / 10,
    totalProgrammers: allProgrammers.totalDocs,
    leaderboard,
  })
}
