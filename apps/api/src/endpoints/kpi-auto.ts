/**
 * GET /api/kpi/rep-performance
 *
 * Auto-computed KPI per sales rep:
 *   - Total visits (this week / this month)
 *   - Conversion rate: visits → deals → quotes → invoices
 *   - Revenue generated (won deals)
 *   - Ranking among reps
 */
import type { PayloadRequest } from 'payload'

const MS_PER_DAY = 24 * 60 * 60 * 1000

interface RepStats {
  repId: string
  repName: string
  visitsThisWeek: number
  visitsThisMonth: number
  dealsCreated: number
  dealsWon: number
  quotesCreated: number
  invoicesCreated: number
  revenue: number
  conversionRate: number
  rank?: number
}

export async function repPerformance(req: PayloadRequest): Promise<Response> {
  if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (req.user as any).role
  const isAdmin = ['super-admin', 'supervisor', 'auditor'].includes(role)
  const isSalesRep = role === 'sales-rep'

  if (!isAdmin && !isSalesRep) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all active sales reps (or just current user)
    const repsQuery = isSalesRep
      ? { id: { equals: req.user.id } }
      : { and: [{ role: { equals: 'sales-rep' } }, { isActive: { equals: true } }] }

    const reps = await req.payload.find({
      collection: 'users',
      where: repsQuery as any,
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })

    const allStats: RepStats[] = []

    for (const rep of reps.docs) {
      const repId = rep.id
      const repName = (rep as any).name || rep.email

      // Visits this week
      const weekVisits = await req.payload.find({
        collection: 'visits',
        where: {
          and: [
            { representative: { equals: repId } },
            { checkInTime: { greater_than_equal: weekStart.toISOString() } },
          ],
        },
        limit: 0,
        overrideAccess: true,
      })

      // Visits this month
      const monthVisits = await req.payload.find({
        collection: 'visits',
        where: {
          and: [
            { representative: { equals: repId } },
            { checkInTime: { greater_than_equal: monthStart.toISOString() } },
          ],
        },
        limit: 0,
        overrideAccess: true,
      })

      // Deals created by this rep
      const deals = await req.payload.find({
        collection: 'deals',
        where: { assignedTo: { equals: repId } },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })

      const dealsWon = deals.docs.filter((d: any) => d.stage === 'won')
      const revenue = dealsWon.reduce((sum: number, d: any) => sum + (d.value || 0), 0)

      // Quotes by this rep
      const quotes = await req.payload.find({
        collection: 'quotes',
        where: { createdBy: { equals: repId } },
        limit: 0,
        overrideAccess: true,
      })

      // Invoices by this rep
      const invoices = await req.payload.find({
        collection: 'invoices',
        where: { createdBy: { equals: repId } },
        limit: 0,
        overrideAccess: true,
      })

      const totalVisits = monthVisits.totalDocs || 1
      const conversionRate = totalVisits > 0 ? Math.round((dealsWon.length / totalVisits) * 100) : 0

      allStats.push({
        repId,
        repName,
        visitsThisWeek: weekVisits.totalDocs,
        visitsThisMonth: monthVisits.totalDocs,
        dealsCreated: deals.totalDocs,
        dealsWon: dealsWon.length,
        quotesCreated: quotes.totalDocs,
        invoicesCreated: invoices.totalDocs,
        revenue,
        conversionRate,
      })
    }

    // Rank by revenue descending
    allStats.sort((a, b) => b.revenue - a.revenue)
    allStats.forEach((s, i) => { s.rank = i + 1 })

    // Team summary
    const teamSummary = {
      totalVisitsThisWeek: allStats.reduce((s, r) => s + r.visitsThisWeek, 0),
      totalVisitsThisMonth: allStats.reduce((s, r) => s + r.visitsThisMonth, 0),
      totalRevenue: allStats.reduce((s, r) => s + r.revenue, 0),
      totalDealsWon: allStats.reduce((s, r) => s + r.dealsWon, 0),
      avgConversionRate: allStats.length > 0
        ? Math.round(allStats.reduce((s, r) => s + r.conversionRate, 0) / allStats.length)
        : 0,
      topPerformer: allStats[0] || null,
    }

    return Response.json({
      reps: isSalesRep ? allStats : allStats,
      team: isAdmin ? teamSummary : undefined,
    })
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
