/**
 * GET /api/sales-today
 *
 * Returns the "today" snapshot for a sales rep: tasks assigned, visits
 * logged today, companies assigned but not yet visited, and a teaser of
 * unclaimed prospects nearby (so the rep always has something to act on).
 */
import type { PayloadRequest } from 'payload'

export async function salesToday(req: PayloadRequest): Promise<Response> {
  if (!req.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = req.user.id
  const role = (req.user as { role?: string }).role
  const isSalesRole = role === 'sales-rep' || role === 'super-admin' || role === 'supervisor'
  if (!isSalesRole) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  try {
    // 1. Visits done today by this rep
    const todayVisits = await req.payload.find({
      collection: 'visits',
      where: {
        and: [
          { representative: { equals: userId } },
          { checkInTime: { greater_than_equal: startOfDay.toISOString() } },
        ],
      },
      limit: 20,
      depth: 1,
      sort: '-checkInTime',
      overrideAccess: true,
    })

    // 2. Companies assigned to me but not yet visited
    let myProspects = { docs: [] as any[], totalDocs: 0 }
    try {
      myProspects = await req.payload.find({
        collection: 'companies',
        where: {
          and: [
            { assignedTo: { equals: userId } },
            { visitStatus: { equals: 'not-visited' } },
          ],
        },
        limit: 10,
        sort: '-priority',
        depth: 0,
        overrideAccess: true,
      })
    } catch {
      // assignedTo field may not be indexed yet
    }

    // 3. Unclaimed high-priority prospects (available to pick up)
    let availableProspects = { docs: [] as any[], totalDocs: 0 }
    try {
      availableProspects = await req.payload.find({
        collection: 'companies',
        where: {
          and: [
            { assignedTo: { exists: false } },
            { visitStatus: { equals: 'not-visited' } },
            { priority: { equals: 'A' } },
          ],
        },
        limit: 5,
        depth: 0,
        overrideAccess: true,
      })
    } catch {
      // fallback: query without assignedTo filter
      try {
        availableProspects = await req.payload.find({
          collection: 'companies',
          where: {
            and: [
              { visitStatus: { equals: 'not-visited' } },
              { priority: { equals: 'A' } },
            ],
          },
          limit: 5,
          depth: 0,
          overrideAccess: true,
        })
      } catch { /* noop */ }
    }

    // 4. Tasks assigned to me, open
    let myTasks = { docs: [] as any[], totalDocs: 0 }
    try {
      myTasks = await req.payload.find({
        collection: 'tasks',
        where: {
          and: [
            { assignedTo: { equals: userId } },
            { status: { in: ['new', 'in-progress', 'in-review'] } },
          ],
        },
        limit: 10,
        sort: 'dueDate',
        depth: 0,
        overrideAccess: true,
      })
    } catch { /* noop */ }

    return Response.json({
      todayVisitsCount: todayVisits.totalDocs,
      todayVisits: todayVisits.docs.map((v) => ({
        id: v.id,
        outcome: (v as unknown as { outcome?: string }).outcome,
        checkInTime: (v as unknown as { checkInTime?: string }).checkInTime,
        company: (v as unknown as { company?: { id: string; name?: string } }).company ?? null,
      })),
      myProspects: myProspects.docs.map((c) => ({
        id: c.id,
        name: (c as unknown as { name: string }).name,
        phone: (c as unknown as { phone?: string }).phone ?? null,
        city: (c as unknown as { city?: string }).city ?? null,
        priority: (c as unknown as { priority?: string }).priority ?? null,
        location: (c as unknown as { location?: unknown }).location ?? null,
      })),
      availableProspectsCount: availableProspects.totalDocs,
      availableProspects: availableProspects.docs.map((c) => ({
        id: c.id,
        name: (c as unknown as { name: string }).name,
        city: (c as unknown as { city?: string }).city ?? null,
        priority: (c as unknown as { priority?: string }).priority ?? null,
      })),
      myTasksCount: myTasks.totalDocs,
      myTasks: myTasks.docs.map((t) => ({
        id: t.id,
        title: (t as unknown as { title: string }).title,
        status: (t as unknown as { status: string }).status,
        priority: (t as unknown as { priority?: string }).priority ?? null,
        dueDate: (t as unknown as { dueDate?: string }).dueDate ?? null,
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load today data'
    return Response.json({ error: message }, { status: 500 })
  }
}
