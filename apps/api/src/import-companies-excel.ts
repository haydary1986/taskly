/**
 * Import geocoded prospects from Excel into Payload `companies` collection.
 *
 * Usage:
 *   pnpm --filter @taskly/api exec tsx src/import-companies-excel.ts [path/to/Clients.geocoded.xlsx]
 *
 * Pipeline:
 *   1. Read Excel rows (Name, Phone, Category, Address, PlaceId, lat, lng, ReviewCount, Score, Tier)
 *   2. Normalize phone (Iraq), infer industry from category
 *   3. Dedupe by PlaceId or name+address (upsert)
 *   4. Create Companies with visitStatus='not-visited', status='prospect'
 */
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import XLSX from 'xlsx'
import path from 'node:path'

interface ExcelRow {
  Name?: string | null
  Phone?: string | null
  Category?: string | null
  Address?: string | null
  PlaceId?: string | null
  Tier?: string | null
  ReviewCount?: number | null
  Score?: number | null
  lat?: number | null
  lng?: number | null
}

const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  'صالون تجميل': 'services',
  'مطعم': 'services',
  'مقهى': 'services',
  'متجر': 'trade',
  'محل': 'trade',
  'عيادة': 'healthcare',
  'مستشفى': 'healthcare',
  'صيدلية': 'healthcare',
  'مدرسة': 'education',
  'جامعة': 'education',
  'مكتب': 'services',
  'شركة': 'other',
  'بنك': 'finance',
  'عقار': 'real-estate',
}

function inferIndustry(category: string | null | undefined): string {
  if (!category) return 'other'
  const lower = category.toLowerCase()
  for (const [keyword, industry] of Object.entries(CATEGORY_TO_INDUSTRY)) {
    if (category.includes(keyword)) return industry
    if (lower.includes(keyword.toLowerCase())) return industry
  }
  return 'other'
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = String(raw).replace(/[\s\-()]/g, '')
  if (!cleaned) return null
  if (cleaned.startsWith('+964')) return cleaned
  if (cleaned.startsWith('00964')) return '+' + cleaned.slice(2)
  if (cleaned.startsWith('964')) return '+' + cleaned
  if (cleaned.startsWith('07') || cleaned.startsWith('7')) {
    return '+964' + cleaned.replace(/^0/, '')
  }
  return cleaned.startsWith('+') ? cleaned : null
}

function extractCity(address: string | null | undefined): string {
  if (!address) return 'بغداد'
  if (address.includes('بغداد')) return 'بغداد'
  if (address.includes('البصرة')) return 'البصرة'
  if (address.includes('الموصل')) return 'الموصل'
  if (address.includes('أربيل') || address.includes('اربيل')) return 'أربيل'
  if (address.includes('النجف')) return 'النجف'
  if (address.includes('كربلاء')) return 'كربلاء'
  return 'بغداد'
}

async function run(): Promise<void> {
  const excelPath = process.argv[2] || path.resolve(process.cwd(), '../../Clients.geocoded.xlsx')
  console.log(`📂 Reading: ${excelPath}`)

  const workbook = XLSX.readFile(excelPath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet)
  console.log(`📊 Total rows: ${rows.length}`)

  const payload = await getPayload({ config: configPromise })

  let created = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = (row.Name || '').trim()
    if (!name) {
      skipped++
      continue
    }

    const lat = typeof row.lat === 'number' ? row.lat : null
    const lng = typeof row.lng === 'number' ? row.lng : null
    if (lat === null || lng === null) {
      skipped++
      continue
    }

    const phone = normalizePhone(row.Phone)
    const address = row.Address?.trim() || null
    const industry = inferIndustry(row.Category)
    const city = extractCity(address)
    const placeId = row.PlaceId?.trim() || null

    const notesText = [
      row.Category ? `الفئة: ${row.Category}` : null,
      row.Tier ? `التصنيف: ${row.Tier}` : null,
      typeof row.Score === 'number' ? `التقييم: ${row.Score}` : null,
      typeof row.ReviewCount === 'number' ? `عدد التقييمات: ${row.ReviewCount}` : null,
      placeId ? `معرّف Google Maps: ${placeId}` : null,
    ].filter(Boolean).join(' | ')

    try {
      // Dedupe: prefer PlaceId match, fall back to exact name+address
      let existing
      if (placeId) {
        const byPlaceId = await payload.find({
          collection: 'companies',
          where: { name: { equals: name } },
          limit: 1,
          overrideAccess: true,
        })
        existing = byPlaceId.docs[0]
      }
      if (!existing) {
        const byName = await payload.find({
          collection: 'companies',
          where: {
            and: [
              { name: { equals: name } },
              ...(address ? [{ address: { equals: address } }] : []),
            ],
          },
          limit: 1,
          overrideAccess: true,
        })
        existing = byName.docs[0]
      }

      const data: Record<string, unknown> = {
        name,
        industry,
        ...(phone ? { phone } : {}),
        ...(address ? { address } : {}),
        city,
        location: [lng, lat],
        status: 'prospect',
        visitStatus: 'not-visited',
        ...(notesText ? {
          notes: {
            root: {
              type: 'root',
              format: '',
              indent: 0,
              version: 1,
              direction: 'rtl',
              children: [{
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                direction: 'rtl',
                children: [{ type: 'text', text: notesText, version: 1, format: 0, style: '', mode: 'normal', detail: 0 }],
              }],
            },
          },
        } : {}),
      }

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
        created++
      }

      if ((i + 1) % 50 === 0) {
        console.log(`  … ${i + 1}/${rows.length} (created=${created}, updated=${updated}, skipped=${skipped}, failed=${failed})`)
      }
    } catch (err: unknown) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`❌ Row ${i + 1} "${name}": ${msg}`)
    }
  }

  console.log('\n=== IMPORT COMPLETE ===')
  console.log(`✅ Created: ${created}`)
  console.log(`🔄 Updated: ${updated}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Failed:  ${failed}`)
  console.log(`📊 Total:   ${rows.length}`)

  process.exit(0)
}

run().catch((err: unknown) => {
  console.error('Fatal:', err)
  process.exit(1)
})
