/**
 * Pipeline conversion endpoints:
 *   POST /api/pipeline/visit-to-deal   — create deal from a successful visit
 *   POST /api/pipeline/deal-to-quote   — create quote pre-filled from deal
 *   POST /api/pipeline/quote-to-invoice — create invoice from accepted quote
 */
import type { PayloadRequest } from 'payload'

export async function visitToDeal(req: PayloadRequest): Promise<Response> {
  if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json?.() as { visitId: string } | undefined
  if (!body?.visitId) return Response.json({ error: 'visitId required' }, { status: 400 })

  try {
    const visit = await req.payload.findByID({
      collection: 'visits',
      id: body.visitId,
      depth: 1,
      overrideAccess: true,
    }) as any

    const company = visit.company
    const companyId = typeof company === 'object' ? company?.id : company
    const companyName = typeof company === 'object' ? company?.name : ''

    const deal = await req.payload.create({
      collection: 'deals',
      data: {
        title: `صفقة — ${companyName || 'شركة'}`,
        company: companyId || undefined,
        stage: 'qualification',
        assignedTo: req.user.id,
        source: 'converted-lead',
        createdBy: req.user.id,
      },
      overrideAccess: true,
    })

    // Update company visitStatus
    if (companyId) {
      await req.payload.update({
        collection: 'companies',
        id: companyId,
        data: { visitStatus: 'in-progress' },
        overrideAccess: true,
      }).catch(() => {})
    }

    return Response.json({ doc: deal, message: 'تم إنشاء الصفقة بنجاح' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل إنشاء الصفقة'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function dealToQuote(req: PayloadRequest): Promise<Response> {
  if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json?.() as { dealId: string } | undefined
  if (!body?.dealId) return Response.json({ error: 'dealId required' }, { status: 400 })

  try {
    const deal = await req.payload.findByID({
      collection: 'deals',
      id: body.dealId,
      depth: 1,
      overrideAccess: true,
    }) as any

    const companyId = typeof deal.company === 'object' ? deal.company?.id : deal.company
    const contactId = typeof deal.contact === 'object' ? deal.contact?.id : deal.contact

    // Auto-generate quote number
    const count = await req.payload.find({
      collection: 'quotes',
      limit: 0,
      overrideAccess: true,
    })
    const quoteNumber = `Q-${String(count.totalDocs + 1).padStart(4, '0')}`

    // Copy products from deal to quote items
    const items = (deal.products || []).map((p: any) => ({
      description: p.name || p.description || '',
      quantity: p.quantity || 1,
      unitPrice: p.unitPrice || p.price || 0,
      total: (p.quantity || 1) * (p.unitPrice || p.price || 0),
    }))

    const subtotal = items.reduce((sum: number, item: any) => sum + (item.total || 0), 0)

    const quote = await req.payload.create({
      collection: 'quotes',
      data: {
        quoteNumber,
        deal: body.dealId,
        company: companyId || undefined,
        contact: contactId || undefined,
        status: 'draft',
        currency: deal.currency || 'USD',
        items: items.length > 0 ? items : [{ description: 'خدمة', quantity: 1, unitPrice: deal.value || 0, total: deal.value || 0 }],
        subtotal: subtotal || deal.value || 0,
        total: subtotal || deal.value || 0,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: req.user.id,
      },
      overrideAccess: true,
    })

    // Advance deal stage
    if (deal.stage === 'qualification') {
      await req.payload.update({
        collection: 'deals',
        id: body.dealId,
        data: { stage: 'proposal' },
        overrideAccess: true,
      }).catch(() => {})
    }

    return Response.json({ doc: quote, message: 'تم إنشاء عرض السعر بنجاح' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل إنشاء عرض السعر'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function quoteToInvoice(req: PayloadRequest): Promise<Response> {
  if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json?.() as { quoteId: string } | undefined
  if (!body?.quoteId) return Response.json({ error: 'quoteId required' }, { status: 400 })

  try {
    const quote = await req.payload.findByID({
      collection: 'quotes',
      id: body.quoteId,
      depth: 1,
      overrideAccess: true,
    }) as any

    const dealId = typeof quote.deal === 'object' ? quote.deal?.id : quote.deal
    const companyId = typeof quote.company === 'object' ? quote.company?.id : quote.company
    const contactId = typeof quote.contact === 'object' ? quote.contact?.id : quote.contact

    // Auto-generate invoice number
    const count = await req.payload.find({
      collection: 'invoices',
      limit: 0,
      overrideAccess: true,
    })
    const invoiceNumber = `INV-${String(count.totalDocs + 1).padStart(4, '0')}`

    const invoice = await req.payload.create({
      collection: 'invoices',
      data: {
        invoiceNumber,
        quote: body.quoteId,
        deal: dealId || undefined,
        company: companyId || undefined,
        client: contactId || undefined,
        status: 'draft',
        issuedAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: quote.items || [],
        subtotal: quote.subtotal || 0,
        taxRate: quote.taxRate || 0,
        total: quote.total || 0,
        currency: quote.currency || 'USD',
        createdBy: req.user.id,
      },
      overrideAccess: true,
    })

    // Mark quote as accepted + deal as won
    await req.payload.update({
      collection: 'quotes',
      id: body.quoteId,
      data: { status: 'accepted' },
      overrideAccess: true,
    }).catch(() => {})

    if (dealId) {
      await req.payload.update({
        collection: 'deals',
        id: dealId,
        data: { stage: 'won', closedAt: new Date().toISOString() },
        overrideAccess: true,
      }).catch(() => {})

      // Update company status to active (customer now)
      if (companyId) {
        await req.payload.update({
          collection: 'companies',
          id: companyId,
          data: { status: 'active', visitStatus: 'visited' },
          overrideAccess: true,
        }).catch(() => {})
      }
    }

    return Response.json({ doc: invoice, message: 'تم إنشاء الفاتورة بنجاح' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل إنشاء الفاتورة'
    return Response.json({ error: msg }, { status: 500 })
  }
}
