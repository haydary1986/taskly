import type { PayloadHandler } from 'payload'

/** GET /v1/crm/pipeline — Deal pipeline view */
export const dealsPipeline: PayloadHandler = async (req) => {
  if (!req.user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const payload = req.payload
  const role = (req.user as any).role as string
  const userId = req.user.id

  const where: Record<string, any> = {}
  if (role === 'sales-rep') {
    where.assignedTo = { equals: userId }
  }

  const { docs: deals } = await payload.find({
    collection: 'deals',
    where,
    sort: '-createdAt',
    limit: 10000,
    depth: 1,
  })

  const stages = ['qualification', 'proposal', 'negotiation', 'won', 'lost']
  const pipeline: Record<string, { deals: any[]; count: number; totalValue: number }> = {}

  for (const stage of stages) {
    const stageDeals = deals.filter((d: any) => d.stage === stage)
    pipeline[stage] = {
      deals: stageDeals,
      count: stageDeals.length,
      totalValue: stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
    }
  }

  return Response.json({ pipeline, totalDeals: deals.length })
}

/** GET /v1/crm/stats — CRM statistics */
export const crmStats: PayloadHandler = async (req) => {
  if (!req.user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const payload = req.payload
  const role = (req.user as any).role as string
  const userId = req.user.id

  const baseWhere: Record<string, any> = {}
  if (role === 'sales-rep') {
    baseWhere.assignedTo = { equals: userId }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

  const [
    totalDeals,
    wonDeals,
    lostDeals,
    openDeals,
    totalLeads,
    convertedLeads,
    monthlyDeals,
    totalCompanies,
  ] = await Promise.all([
    payload.count({ collection: 'deals', where: baseWhere, overrideAccess: false, req }),
    payload.count({ collection: 'deals', where: { ...baseWhere, stage: { equals: 'won' } }, overrideAccess: false, req }),
    payload.count({ collection: 'deals', where: { ...baseWhere, stage: { equals: 'lost' } }, overrideAccess: false, req }),
    payload.count({ collection: 'deals', where: { ...baseWhere, stage: { not_in: ['won', 'lost'] } }, overrideAccess: false, req }),
    payload.count({ collection: 'leads', where: role === 'sales-rep' ? { assignedTo: { equals: userId } } : {}, overrideAccess: false, req }),
    payload.count({ collection: 'leads', where: { ...(role === 'sales-rep' ? { assignedTo: { equals: userId } } : {}), status: { equals: 'converted' } }, overrideAccess: false, req }),
    payload.find({
      collection: 'deals',
      where: { ...baseWhere, stage: { equals: 'won' }, closedAt: { greater_than_equal: monthStart } },
      limit: 10000,
      depth: 0,
      overrideAccess: false,
      req,
    }),
    payload.count({ collection: 'companies', overrideAccess: false, req }),
  ])

  const monthlyRevenue = monthlyDeals.docs.reduce((sum: number, d: any) => sum + (d.value || 0), 0)

  // Won deals for yearly revenue
  const yearlyWon = await payload.find({
    collection: 'deals',
    where: { ...baseWhere, stage: { equals: 'won' }, closedAt: { greater_than_equal: yearStart } },
    limit: 10000,
    depth: 0,
    overrideAccess: false,
    req,
  })
  const yearlyRevenue = yearlyWon.docs.reduce((sum: number, d: any) => sum + (d.value || 0), 0)

  // Weighted pipeline value
  const openDealsDocs = await payload.find({
    collection: 'deals',
    where: { ...baseWhere, stage: { not_in: ['won', 'lost'] } },
    limit: 10000,
    depth: 0,
    overrideAccess: false,
    req,
  })
  const weightedPipeline = openDealsDocs.docs.reduce(
    (sum: number, d: any) => sum + (d.value || 0) * ((d.probability || 50) / 100),
    0,
  )

  const winRate = totalDeals.totalDocs > 0
    ? Math.round((wonDeals.totalDocs / (wonDeals.totalDocs + lostDeals.totalDocs)) * 100) || 0
    : 0

  const conversionRate = totalLeads.totalDocs > 0
    ? Math.round((convertedLeads.totalDocs / totalLeads.totalDocs) * 100)
    : 0

  return Response.json({
    deals: {
      total: totalDeals.totalDocs,
      won: wonDeals.totalDocs,
      lost: lostDeals.totalDocs,
      open: openDeals.totalDocs,
      winRate,
    },
    leads: {
      total: totalLeads.totalDocs,
      converted: convertedLeads.totalDocs,
      conversionRate,
    },
    revenue: {
      monthly: monthlyRevenue,
      yearly: yearlyRevenue,
      weightedPipeline,
    },
    companies: totalCompanies.totalDocs,
  })
}

/** GET /v1/crm/funnel — Sales funnel data */
export const crmFunnel: PayloadHandler = async (req) => {
  if (!req.user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const payload = req.payload
  const role = (req.user as any).role as string
  const userId = req.user.id

  // Leads funnel
  const leadWhere: Record<string, any> = role === 'sales-rep' ? { assignedTo: { equals: userId } } : {}
  const { docs: leads } = await payload.find({
    collection: 'leads',
    where: leadWhere,
    limit: 10000,
    depth: 0,
    overrideAccess: false,
    req,
  })

  const leadStatuses = ['new', 'contacted', 'qualified', 'converted', 'unqualified', 'lost']
  const leadFunnel = leadStatuses.map((status) => {
    const count = leads.filter((l: any) => l.status === status).length
    return { status, count }
  })

  // Deal funnel
  const dealWhere: Record<string, any> = role === 'sales-rep' ? { assignedTo: { equals: userId } } : {}
  const { docs: deals } = await payload.find({
    collection: 'deals',
    where: dealWhere,
    limit: 10000,
    depth: 0,
    overrideAccess: false,
    req,
  })

  const dealStages = ['qualification', 'proposal', 'negotiation', 'won', 'lost']
  const dealFunnel = dealStages.map((stage) => {
    const stageDeals = deals.filter((d: any) => d.stage === stage)
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
    }
  })

  return Response.json({ leadFunnel, dealFunnel })
}

/** POST /v1/crm/leads/convert — Convert lead to client + deal */
export const convertLead: PayloadHandler = async (req) => {
  if (!req.user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const payload = req.payload
  let body: any
  try {
    body = await req.json!()
  } catch {
    return Response.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  const { leadId, createDeal, dealTitle, dealValue } = body
  if (!leadId) return Response.json({ error: 'معرف العميل المحتمل مطلوب' }, { status: 400 })

  const lead = await payload.findByID({ collection: 'leads', id: leadId, depth: 0 })
  if (!lead) return Response.json({ error: 'العميل المحتمل غير موجود' }, { status: 404 })
  if ((lead as any).status === 'converted') {
    return Response.json({ error: 'تم تحويل هذا العميل المحتمل مسبقاً' }, { status: 400 })
  }

  // Create company if companyName exists
  let companyId: string | undefined
  if ((lead as any).companyName) {
    const company = await payload.create({
      collection: 'companies',
      data: {
        name: (lead as any).companyName,
        phone: (lead as any).phone,
        email: (lead as any).email,
        city: (lead as any).city,
        createdBy: req.user.id,
      } as any,
      req,
    })
    companyId = company.id
  }

  // Create client (contact)
  const client = await payload.create({
    collection: 'clients',
    data: {
      name: (lead as any).name,
      phone: (lead as any).phone,
      email: (lead as any).email,
      city: (lead as any).city,
      company: companyId,
      tags: ['new'],
      createdBy: req.user.id,
    } as any,
    req,
  })

  // Create deal if requested
  let deal: any = null
  if (createDeal) {
    deal = await payload.create({
      collection: 'deals',
      data: {
        title: dealTitle || `صفقة - ${(lead as any).name}`,
        company: companyId,
        contact: client.id,
        value: dealValue || (lead as any).estimatedValue || 0,
        stage: 'qualification',
        assignedTo: (lead as any).assignedTo || req.user.id,
        source: 'converted-lead',
        lead: leadId,
        createdBy: req.user.id,
      } as any,
      req,
    })
  }

  // Update lead status
  await payload.update({
    collection: 'leads',
    id: leadId,
    data: {
      status: 'converted',
      convertedTo: {
        client: client.id,
        deal: deal?.id,
        company: companyId,
      },
    } as any,
    req,
  })

  return Response.json({
    message: 'تم تحويل العميل المحتمل بنجاح',
    client,
    deal,
    companyId,
  })
}

/** GET /v1/crm/forecast — Revenue forecast */
export const crmForecast: PayloadHandler = async (req) => {
  if (!req.user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const payload = req.payload
  const role = (req.user as any).role as string
  const userId = req.user.id

  const where: Record<string, any> = { stage: { not_in: ['won', 'lost'] } }
  if (role === 'sales-rep') {
    where.assignedTo = { equals: userId }
  }

  const { docs: openDeals } = await payload.find({
    collection: 'deals',
    where,
    limit: 10000,
    depth: 1,
    overrideAccess: false,
    req,
  })

  const now = new Date()
  const months: { month: string; expected: number; weighted: number; count: number }[] = []

  for (let i = 0; i < 6; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`

    const monthDeals = openDeals.filter((d: any) => {
      if (!d.expectedCloseDate) return i === 0 // Deals with no close date go to current month
      const closeDate = new Date(d.expectedCloseDate)
      return closeDate >= monthDate && closeDate <= monthEnd
    })

    months.push({
      month: monthKey,
      expected: monthDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
      weighted: monthDeals.reduce((sum: number, d: any) => sum + (d.value || 0) * ((d.probability || 50) / 100), 0),
      count: monthDeals.length,
    })
  }

  return Response.json({ forecast: months })
}
