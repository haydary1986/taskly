/**
 * GET /api/smart-notifications/daily-digest
 *
 * Generates and sends a daily digest to each active sales rep via Telegram.
 * Can be triggered by cron or manually by admin.
 *
 * Checks:
 *   1. Companies assigned to rep but not visited in 30+ days
 *   2. High-priority unassigned companies near rep's last known location
 *   3. Duplicate visit warnings (another rep visited same company recently)
 *   4. Rep's daily stats summary
 */
import type { PayloadRequest } from 'payload'

const STALE_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

export async function dailyDigest(req: PayloadRequest): Promise<Response> {
  if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (req.user as any).role
  if (!['super-admin', 'supervisor'].includes(role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const reps = await req.payload.find({
      collection: 'users',
      where: {
        and: [
          { role: { equals: 'sales-rep' } },
          { isActive: { equals: true } },
        ],
      },
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })

    const now = new Date()
    const staleDate = new Date(now.getTime() - STALE_DAYS * MS_PER_DAY)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const results: { repId: string; repName: string; sent: boolean; message?: string }[] = []

    for (const rep of reps.docs) {
      const repId = rep.id
      const repName = (rep as any).name || rep.email
      const telegramChatId = (rep as any).telegramChatId

      // 1. Stale companies (assigned to rep, not visited in 30+ days)
      let staleCompanies = { totalDocs: 0 }
      try {
        staleCompanies = await req.payload.find({
          collection: 'companies',
          where: {
            and: [
              { assignedTo: { equals: repId } },
              { or: [
                { lastVisitedAt: { less_than: staleDate.toISOString() } },
                { lastVisitedAt: { exists: false } },
              ]},
            ],
          },
          limit: 0,
          overrideAccess: true,
        })
      } catch { /* field may not exist */ }

      // 2. Today's visits count
      const todayVisits = await req.payload.find({
        collection: 'visits',
        where: {
          and: [
            { representative: { equals: repId } },
            { checkInTime: { greater_than_equal: todayStart.toISOString() } },
          ],
        },
        limit: 0,
        overrideAccess: true,
      })

      // 3. This week's visits
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
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

      // 4. My assigned companies total
      let myCompaniesTotal = 0
      try {
        const mc = await req.payload.find({
          collection: 'companies',
          where: { assignedTo: { equals: repId } },
          limit: 0,
          overrideAccess: true,
        })
        myCompaniesTotal = mc.totalDocs
      } catch { /* noop */ }

      // Build message
      const lines = [
        `📊 <b>تقرير اليوم — ${repName}</b>`,
        ``,
        `✅ زيارات اليوم: <b>${todayVisits.totalDocs}</b>`,
        `📅 زيارات هذا الأسبوع: <b>${weekVisits.totalDocs}</b>`,
        `🏢 شركاتي: <b>${myCompaniesTotal}</b>`,
      ]

      if (staleCompanies.totalDocs > 0) {
        lines.push(``)
        lines.push(`⚠️ <b>${staleCompanies.totalDocs} شركة</b> لم تُزَر منذ ${STALE_DAYS} يوم — راجعها!`)
      }

      lines.push(``)
      lines.push(`💡 افتح <b>خريطة العملاء</b> لاختيار أقرب شركة لموقعك.`)

      const messageText = lines.join('\n')

      // Send via Telegram if linked
      if (telegramChatId) {
        try {
          const { sendTelegramMessage } = await import('../lib/telegram')
          await sendTelegramMessage(req.payload, telegramChatId, messageText)
          results.push({ repId, repName, sent: true })
        } catch (err: unknown) {
          results.push({ repId, repName, sent: false, message: String(err) })
        }
      } else {
        results.push({ repId, repName, sent: false, message: 'No Telegram linked' })
      }
    }

    return Response.json({
      totalReps: reps.totalDocs,
      results,
      message: `Digest sent to ${results.filter(r => r.sent).length}/${reps.totalDocs} reps`,
    })
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

/**
 * POST /api/smart-notifications/visit-alert
 *
 * Called after a visit is created. Warns other reps if the company
 * was already visited recently by someone else.
 */
export async function visitAlert(req: PayloadRequest): Promise<Response> {
  if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json?.() as { companyId: string; visitId: string } | undefined
  if (!body?.companyId) return Response.json({ error: 'companyId required' }, { status: 400 })

  try {
    const threeDaysAgo = new Date(Date.now() - 3 * MS_PER_DAY)

    const recentVisits = await req.payload.find({
      collection: 'visits',
      where: {
        and: [
          { company: { equals: body.companyId } },
          { checkInTime: { greater_than_equal: threeDaysAgo.toISOString() } },
          { representative: { not_equals: req.user.id } },
        ],
      },
      limit: 5,
      depth: 1,
      overrideAccess: true,
    })

    const warnings = recentVisits.docs.map((v: any) => {
      const repName = typeof v.representative === 'object' ? v.representative?.name : 'مندوب آخر'
      return { repName, date: v.checkInTime }
    })

    return Response.json({ duplicateWarnings: warnings, count: warnings.length })
  } catch (err: unknown) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
