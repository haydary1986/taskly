/**
 * Migrate leads → companies, preserving priority / externalData / assignedTo / source / category.
 *
 * Rationale: Leads and Companies store overlapping business entities.
 * This consolidation makes Companies the single source of truth and
 * preserves all enrichment metadata (Google Maps placeId, priority tier, etc.).
 *
 * Usage:
 *   pnpm --filter @taskly/api exec tsx src/migrate-leads-to-companies.ts [--delete-leads]
 */
import { getPayload } from 'payload'
import configPromise from '@payload-config'

interface LeadDoc {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  location?: { type: 'Point'; coordinates: [number, number] } | [number, number] | null
  status?: string | null
  category?: string | null
  priority?: 'A' | 'B' | 'C' | null
  source?: string | null
  assignedTo?: string | { id: string } | null
  externalData?: Record<string, unknown> | null
  notes?: unknown
  createdBy?: string | { id: string } | null
}

function extractCoords(loc: unknown): [number, number] | null {
  if (!loc) return null
  if (Array.isArray(loc) && loc.length === 2) return loc as [number, number]
  if (typeof loc === 'object' && loc !== null && 'coordinates' in loc) {
    const c = (loc as { coordinates: [number, number] }).coordinates
    if (Array.isArray(c) && c.length === 2) return c
  }
  return null
}

function toId(ref: unknown): string | null {
  if (!ref) return null
  if (typeof ref === 'string') return ref
  if (typeof ref === 'object' && ref !== null && 'id' in ref) {
    return String((ref as { id: unknown }).id)
  }
  return null
}

async function run(): Promise<void> {
  const deleteLeads = process.argv.includes('--delete-leads')
  const payload = await getPayload({ config: configPromise })

  console.log('📊 Fetching leads…')
  const page1 = await payload.find({
    collection: 'leads',
    limit: 2000,
    depth: 0,
    overrideAccess: true,
  })
  const leads = page1.docs as unknown as LeadDoc[]
  console.log(`  Found: ${leads.length}`)

  let migrated = 0
  let skipped = 0
  let updated = 0
  let failed = 0

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const name = lead.name?.trim()
    if (!name) { skipped++; continue }

    const coords = extractCoords(lead.location)

    try {
      // Dedupe by placeId (strongest) then name+phone fallback
      const placeId =
        typeof lead.externalData === 'object' && lead.externalData !== null && 'placeId' in lead.externalData
          ? String((lead.externalData as { placeId: unknown }).placeId || '')
          : ''

      let existing = null
      if (placeId) {
        const match = await payload.find({
          collection: 'companies',
          where: { 'externalData.placeId': { equals: placeId } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        existing = match.docs[0] ?? null
      }
      if (!existing) {
        const match = await payload.find({
          collection: 'companies',
          where: {
            and: [
              { name: { equals: name } },
              ...(lead.phone ? [{ phone: { equals: lead.phone } }] : []),
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        existing = match.docs[0] ?? null
      }

      const data: Record<string, unknown> = {
        name,
        ...(lead.phone ? { phone: lead.phone } : {}),
        ...(lead.email ? { email: lead.email } : {}),
        ...(lead.address ? { address: lead.address } : {}),
        ...(lead.city ? { city: lead.city } : {}),
        ...(coords ? { location: coords } : {}),
        ...(lead.category ? { category: lead.category } : {}),
        ...(lead.priority ? { priority: lead.priority } : {}),
        ...(lead.source ? { source: lead.source } : { source: 'google-maps' }),
        ...(lead.externalData ? { externalData: lead.externalData } : {}),
        ...(lead.notes ? { notes: lead.notes } : {}),
        status: 'prospect',
        visitStatus: 'not-visited',
      }

      const assignedId = toId(lead.assignedTo)
      if (assignedId) data.assignedTo = assignedId

      const createdById = toId(lead.createdBy)
      if (createdById) data.createdBy = createdById

      if (existing) {
        await payload.update({
          collection: 'companies',
          id: existing.id,
          data,
          overrideAccess: true,
        })
        updated++
      } else {
        await payload.create({
          collection: 'companies',
          data,
          overrideAccess: true,
        })
        migrated++
      }

      if ((i + 1) % 100 === 0) {
        console.log(`  … ${i + 1}/${leads.length} (migrated=${migrated}, updated=${updated}, skipped=${skipped}, failed=${failed})`)
      }
    } catch (err: unknown) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ Lead ${lead.id} "${name}": ${msg}`)
    }
  }

  console.log('\n=== MIGRATION COMPLETE ===')
  console.log(`✅ Migrated: ${migrated}`)
  console.log(`🔄 Updated:  ${updated}`)
  console.log(`⏭️  Skipped:  ${skipped}`)
  console.log(`❌ Failed:   ${failed}`)

  // Re-point visits that reference a migrated lead to the corresponding company
  console.log('\n🔗 Re-pointing visits lead → company…')
  const visits = await payload.find({
    collection: 'visits',
    where: { lead: { exists: true } },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })
  let visitsRepointed = 0
  for (const visit of visits.docs) {
    const leadId = toId((visit as unknown as { lead?: unknown }).lead)
    if (!leadId) continue
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) continue
    const placeId =
      typeof lead.externalData === 'object' && lead.externalData !== null && 'placeId' in lead.externalData
        ? String((lead.externalData as { placeId: unknown }).placeId || '')
        : ''
    let companyId: string | null = null
    if (placeId) {
      const match = await payload.find({
        collection: 'companies',
        where: { 'externalData.placeId': { equals: placeId } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      companyId = match.docs[0]?.id ?? null
    }
    if (!companyId) {
      const match = await payload.find({
        collection: 'companies',
        where: { name: { equals: lead.name } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      companyId = match.docs[0]?.id ?? null
    }
    if (!companyId) continue
    try {
      await payload.update({
        collection: 'visits',
        id: visit.id,
        data: { company: companyId },
        overrideAccess: true,
      })
      visitsRepointed++
    } catch {
      // ignore — may fail if visit lacks required fields, next migration run will catch
    }
  }
  console.log(`  Re-pointed: ${visitsRepointed} visits`)

  if (deleteLeads) {
    console.log('\n🗑️  Deleting migrated leads…')
    let deleted = 0
    for (const lead of leads) {
      try {
        await payload.delete({ collection: 'leads', id: lead.id, overrideAccess: true })
        deleted++
      } catch { /* noop */ }
    }
    console.log(`  Deleted: ${deleted}`)
  } else {
    console.log('\nℹ️  Leads preserved. Pass --delete-leads to remove them.')
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
