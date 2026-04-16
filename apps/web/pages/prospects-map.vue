<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'خريطة العملاء المحتملين' })

interface Lead {
  id: string
  name: string
  phone?: string | null
  city?: string | null
  address?: string | null
  category?: string | null
  priority?: 'A' | 'B' | 'C'
  status?: string
  assignedTo?: string | { id: string; name?: string } | null
  location?: [number, number] | { coordinates: [number, number] }
  externalData?: {
    placeId?: string | null
    mapsUrl?: string | null
    website?: string | null
    rating?: number | null
    reviewCount?: number | null
  }
}

interface Visit {
  id: string
  lead?: string | { id: string }
  client?: string | { id: string }
  checkInTime?: string
  notes?: string
}

interface SalesUser {
  id: string
  name: string
  email: string
}

const api = useApi()
const authStore = useAuthStore()
const toast = useToast()
const leads = ref<Lead[]>([])
const visits = ref<Visit[]>([])
const salesUsers = ref<SalesUser[]>([])
const loading = ref(true)

// Visit modal state
const showVisitModal = ref(false)
const activeLead = ref<Lead | null>(null)
const visitForm = reactive({
  outcome: '' as '' | 'agreed' | 'interested' | 'pending' | 'callback' | 'no-answer' | 'rejected',
  notes: '',
})
const savingVisit = ref(false)

// Transfer modal state
const showTransferModal = ref(false)
const transferForm = reactive({ toUserId: '' })
const transferring = ref(false)

const outcomeLabels: Record<string, string> = {
  agreed: '✅ موافقة',
  interested: '👍 مهتم',
  pending: '⏳ انتظار / لاحقاً',
  callback: '📞 إعادة الاتصال',
  'no-answer': '🔇 لا يوجد رد',
  rejected: '❌ رفض',
}

const outcomeColors: Record<string, string> = {
  agreed: 'bg-green-50 border-green-300 text-green-800',
  interested: 'bg-blue-50 border-blue-300 text-blue-800',
  pending: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  callback: 'bg-purple-50 border-purple-300 text-purple-800',
  'no-answer': 'bg-gray-50 border-gray-300 text-gray-700',
  rejected: 'bg-red-50 border-red-300 text-red-800',
}
const priorityFilter = ref<'' | 'A' | 'B' | 'C'>('')
const statusFilter = ref<'' | 'new' | 'visited'>('')
const ownerFilter = ref<'' | 'mine' | 'available' | 'taken'>('')
const categoryFilter = ref('')
const nearestLimit = ref<0 | 10 | 20 | 50>(0)
const userLocation = ref<[number, number] | null>(null) // [lat, lng]
const locating = ref(false)
const locateError = ref('')
const mapContainer = ref<HTMLElement | null>(null)
let userMarker: any = null
let radiusCircle: any = null

let map: any = null
let markers: any[] = []
let L: any = null

function coords(lead: Lead): [number, number] | null {
  const loc = lead.location
  if (!loc) return null
  if (Array.isArray(loc) && loc.length === 2) return loc
  if (typeof loc === 'object' && 'coordinates' in loc) return loc.coordinates
  return null
}

const visitedIds = computed(() => {
  const ids = new Set<string>()
  visits.value.forEach((v) => {
    const leadId = typeof v.lead === 'object' ? v.lead?.id : v.lead
    if (leadId) ids.add(leadId)
  })
  return ids
})

const categories = computed(() => [...new Set(leads.value.map((l) => l.category).filter(Boolean))])

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const [lat1, lng1] = a
  const [lat2, lng2] = b
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

const filtered = computed(() => {
  const base = leads.value.filter((l) => {
    if (!coords(l)) return false
    if (priorityFilter.value && l.priority !== priorityFilter.value) return false
    if (categoryFilter.value && l.category !== categoryFilter.value) return false
    const isVisited = visitedIds.value.has(l.id)
    if (statusFilter.value === 'visited' && !isVisited) return false
    if (statusFilter.value === 'new' && isVisited) return false
    if (ownerFilter.value === 'mine' && !isMine(l)) return false
    if (ownerFilter.value === 'taken' && !isTakenByOther(l)) return false
    if (ownerFilter.value === 'available' && ownerId(l)) return false
    return true
  })

  if (!userLocation.value || !nearestLimit.value) return base

  const origin = userLocation.value
  const withDist = base.map((l) => {
    const c = coords(l)!
    return { lead: l, distKm: haversineKm(origin, [c[1], c[0]]) }
  })
  withDist.sort((a, b) => a.distKm - b.distKm)
  return withDist.slice(0, nearestLimit.value).map((x) => x.lead)
})

function distanceLabel(lead: Lead): string | null {
  if (!userLocation.value) return null
  const c = coords(lead)
  if (!c) return null
  const km = haversineKm(userLocation.value, [c[1], c[0]])
  return km < 1 ? `${Math.round(km * 1000)} م` : `${km.toFixed(1)} كم`
}

async function locateMe(): Promise<void> {
  if (!navigator.geolocation) {
    locateError.value = 'المتصفح لا يدعم تحديد الموقع'
    return
  }
  locating.value = true
  locateError.value = ''
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      })
    })
    userLocation.value = [pos.coords.latitude, pos.coords.longitude]
    if (!nearestLimit.value) nearestLimit.value = 20
    updateMarkers()
    if (map) map.setView(userLocation.value, 14)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل تحديد الموقع'
    locateError.value =
      (err as GeolocationPositionError)?.code === 1
        ? 'تم رفض إذن الموقع — فعّله من إعدادات المتصفح'
        : msg
  } finally {
    locating.value = false
  }
}

const stats = computed(() => ({
  total: filtered.value.length,
  tierA: filtered.value.filter((l) => l.priority === 'A').length,
  tierB: filtered.value.filter((l) => l.priority === 'B').length,
  tierC: filtered.value.filter((l) => l.priority === 'C').length,
  visited: filtered.value.filter((l) => visitedIds.value.has(l.id)).length,
}))

async function load(): Promise<void> {
  try {
    const [leadsRes, visitsRes, usersRes] = await Promise.all([
      api.get('/leads', {
        query: { limit: 2000, depth: 1, 'where[source][equals]': 'google-maps' },
      }),
      api.get('/visits', { query: { limit: 2000, depth: 0 } }),
      api.get('/users', {
        query: { limit: 200, depth: 0, 'where[role][equals]': 'sales-rep' },
      }),
    ])
    leads.value = leadsRes.docs
    visits.value = visitsRes.docs
    salesUsers.value = usersRes.docs
  } catch (err: unknown) {
    if (err instanceof Error) useToast?.().error?.(err.message)
  } finally {
    loading.value = false
  }
}

const currentUserId = computed(() => authStore.user?.id ?? null)

function ownerId(lead: Lead): string | null {
  const a = lead.assignedTo
  if (!a) return null
  return typeof a === 'object' ? a.id : a
}

function ownerName(lead: Lead): string | null {
  const a = lead.assignedTo
  if (!a || typeof a !== 'object') return null
  return a.name ?? null
}

function isMine(lead: Lead): boolean {
  const o = ownerId(lead)
  return !!o && o === currentUserId.value
}

function isTakenByOther(lead: Lead): boolean {
  const o = ownerId(lead)
  return !!o && o !== currentUserId.value
}

function colorFor(lead: Lead, visited: boolean): string {
  if (visited) return '#22c55e'
  if (isTakenByOther(lead)) return '#9ca3af' // gray — handled by another rep
  if (lead.priority === 'A') return '#ef4444'
  if (lead.priority === 'B') return '#f59e0b'
  return '#3b82f6'
}

function popupHtml(lead: Lead, lat: number, lng: number, visited: boolean): string {
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  const dist = distanceLabel(lead)
  const distHtml = dist ? `<div style="font-size:11px;color:#2563eb;margin-top:2px;font-weight:600">📍 ${dist}</div>` : ''
  const googleUrl = lead.externalData?.placeId
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${lead.externalData.placeId}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

  const rating = lead.externalData?.rating
  const reviews = lead.externalData?.reviewCount
  const rateHtml = rating
    ? `<div style="font-size:12px;color:#f59e0b">★ ${rating} <span style="color:#6b7280">(${reviews ?? 0})</span></div>`
    : ''

  const phoneHtml = lead.phone
    ? `<a href="tel:${lead.phone}" style="display:block;padding:6px;background:#2563eb;color:white;border-radius:6px;text-align:center;text-decoration:none;font-size:12px;font-weight:600">📞 اتصال</a>`
    : `<div style="padding:6px;background:#f3f4f6;color:#9ca3af;border-radius:6px;text-align:center;font-size:12px">لا يوجد هاتف</div>`

  const visitBtnHtml = takenByOther
    ? `<div style="width:100%;margin-top:6px;padding:6px;background:#e5e7eb;color:#6b7280;border-radius:6px;font-size:12px;text-align:center">محجوز — لا يمكنك تسجيل زيارة</div>`
    : `<button data-lead-id="${lead.id}" data-action="visit" class="prospect-action-btn" style="width:100%;margin-top:6px;padding:8px;background:#16a34a;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">${visited ? '🔁 تسجيل زيارة جديدة' : '✅ تسجيل زيارة'}</button>`

  const transferBtnHtml = mine
    ? `<button data-lead-id="${lead.id}" data-action="transfer" class="prospect-action-btn" style="width:100%;margin-top:4px;padding:6px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer">🔄 نقل إلى مندوب آخر</button>`
    : ''

  const priorityBadge = lead.priority
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:${lead.priority === 'A' ? '#fee2e2' : lead.priority === 'B' ? '#fef3c7' : '#dbeafe'};color:${lead.priority === 'A' ? '#991b1b' : lead.priority === 'B' ? '#92400e' : '#1e40af'}">${lead.priority}</span>`
    : ''

  const takenByOther = isTakenByOther(lead)
  const mine = isMine(lead)
  const owner = ownerName(lead)

  const statusBadge = visited
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:#dcfce7;color:#166534">تمت الزيارة</span>`
    : `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:#fee2e2;color:#991b1b">لم تتم</span>`

  const ownerBanner = takenByOther
    ? `<div style="margin-top:6px;padding:6px;background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;font-size:11px;color:#92400e">⚠️ محجوز للمندوب: <strong>${owner ?? 'آخر'}</strong></div>`
    : mine
    ? `<div style="margin-top:6px;padding:4px 8px;background:#dbeafe;border-radius:6px;font-size:10px;color:#1e40af;font-weight:600">✓ مُعيَّن لك</div>`
    : ''

  return `
    <div style="direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;min-width:220px">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:6px">
        <strong style="font-size:14px;line-height:1.3">${lead.name}</strong>
        <div style="display:flex;gap:4px">${priorityBadge}${statusBadge}</div>
      </div>
      ${lead.category ? `<div style="font-size:11px;color:#6b7280;margin-top:4px">${lead.category}</div>` : ''}
      ${distHtml}
      ${rateHtml}
      ${lead.address ? `<div style="font-size:11px;color:#6b7280;margin-top:4px">${lead.address}</div>` : ''}
      ${lead.phone ? `<div dir="ltr" style="font-size:12px;color:#374151;margin-top:4px;font-family:monospace">${lead.phone}</div>` : ''}
      ${ownerBanner}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
        <a href="${wazeUrl}" target="_blank" rel="noopener" style="padding:6px;background:#33ccff;color:white;border-radius:6px;text-align:center;text-decoration:none;font-size:12px;font-weight:600">🧭 Waze</a>
        <a href="${googleUrl}" target="_blank" rel="noopener" style="padding:6px;background:#4285f4;color:white;border-radius:6px;text-align:center;text-decoration:none;font-size:12px;font-weight:600">🗺️ Google</a>
      </div>
      <div style="margin-top:6px">${phoneHtml}</div>
      ${visitBtnHtml}
      ${transferBtnHtml}
    </div>
  `
}

function openVisitModal(leadId: string): void {
  const lead = leads.value.find((l) => l.id === leadId)
  if (!lead) return
  if (isTakenByOther(lead)) {
    toast.error(`محجوز لـ ${ownerName(lead) ?? 'مندوب آخر'}`)
    return
  }
  activeLead.value = lead
  visitForm.outcome = ''
  visitForm.notes = ''
  showVisitModal.value = true
}

function openTransferModal(leadId: string): void {
  const lead = leads.value.find((l) => l.id === leadId)
  if (!lead) return
  if (!isMine(lead)) {
    toast.error('يمكنك فقط نقل العملاء المُعيَّنين لك')
    return
  }
  activeLead.value = lead
  transferForm.toUserId = ''
  showTransferModal.value = true
}

async function submitVisit(): Promise<void> {
  if (!activeLead.value) return
  if (!visitForm.outcome) {
    toast.error('اختر نتيجة الزيارة أولاً')
    return
  }
  savingVisit.value = true
  const c = coords(activeLead.value)
  try {
    await api.post('/visits', {
      lead: activeLead.value.id,
      checkInTime: new Date().toISOString(),
      checkInLocation: c ? [c[0], c[1]] : undefined,
      outcome: visitForm.outcome,
      notes: visitForm.notes || undefined,
    })
    toast.success('تم تسجيل الزيارة')
    showVisitModal.value = false
    await load()
    await nextTick()
    updateMarkers()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل التسجيل'
    toast.error(msg)
  } finally {
    savingVisit.value = false
  }
}

async function submitTransfer(): Promise<void> {
  if (!activeLead.value || !transferForm.toUserId) {
    toast.error('اختر المندوب الجديد')
    return
  }
  transferring.value = true
  try {
    await api.patch(`/leads/${activeLead.value.id}`, { assignedTo: transferForm.toUserId })
    const newOwner = salesUsers.value.find((u) => u.id === transferForm.toUserId)
    toast.success(`تم نقل العميل إلى ${newOwner?.name ?? ''}`)
    showTransferModal.value = false
    await load()
    await nextTick()
    updateMarkers()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل النقل'
    toast.error(msg)
  } finally {
    transferring.value = false
  }
}

async function initMap(): Promise<void> {
  if (!mapContainer.value) return
  L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  map = L.map(mapContainer.value).setView([33.3152, 44.3661], 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(map)

  // Delegate clicks from popup action buttons
  map.getContainer().addEventListener('click', (e: Event) => {
    const t = e.target as HTMLElement
    if (!t?.classList?.contains('prospect-action-btn')) return
    const id = t.getAttribute('data-lead-id')
    const action = t.getAttribute('data-action')
    if (!id) return
    if (action === 'visit') openVisitModal(id)
    else if (action === 'transfer') openTransferModal(id)
  })

  updateMarkers()
}

function updateMarkers(): void {
  if (!map || !L) return
  markers.forEach((m) => map.removeLayer(m))
  markers = []
  if (userMarker) { map.removeLayer(userMarker); userMarker = null }
  if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null }
  const bounds: [number, number][] = []

  if (userLocation.value) {
    const [ulat, ulng] = userLocation.value
    const uIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.25)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
    userMarker = L.marker([ulat, ulng], { icon: uIcon, zIndexOffset: 1000 }).addTo(map)
    userMarker.bindPopup('<div style="direction:rtl;font-family:\'IBM Plex Sans Arabic\',sans-serif"><strong>موقعك الحالي</strong></div>')
    bounds.push([ulat, ulng])

    if (nearestLimit.value && filtered.value.length > 0) {
      const last = filtered.value[filtered.value.length - 1]
      const c = coords(last)
      if (c) {
        const radiusKm = haversineKm(userLocation.value, [c[1], c[0]])
        radiusCircle = L.circle([ulat, ulng], {
          radius: radiusKm * 1000,
          color: '#2563eb',
          weight: 1,
          opacity: 0.4,
          fillColor: '#2563eb',
          fillOpacity: 0.05,
        }).addTo(map)
      }
    }
  }

  filtered.value.forEach((lead) => {
    const c = coords(lead)
    if (!c) return
    const [lng, lat] = c
    const visited = visitedIds.value.has(lead.id)
    const color = colorFor(lead, visited)

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })

    const marker = L.marker([lat, lng], { icon }).addTo(map)
    marker.bindPopup(popupHtml(lead, lat, lng, visited), { maxWidth: 260 })
    markers.push(marker)
    bounds.push([lat, lng])
  })

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }
}

const socket = useSocket()

type LeadUpdateEvent = {
  id: string
  assignedTo?: string | null
  status?: string
}

function handleLeadUpdated(event: LeadUpdateEvent): void {
  const idx = leads.value.findIndex((l) => l.id === event.id)
  if (idx === -1) return
  const current = leads.value[idx]
  const updated: Lead = {
    ...current,
    status: event.status ?? current.status,
    assignedTo: event.assignedTo
      ? salesUsers.value.find((u) => u.id === event.assignedTo) ?? event.assignedTo
      : null,
  }
  leads.value = [...leads.value.slice(0, idx), updated, ...leads.value.slice(idx + 1)]
  updateMarkers()
}

onMounted(async () => {
  await load()
  await nextTick()
  await initMap()
  socket.on('lead:updated', handleLeadUpdated)
})

onUnmounted(() => {
  socket.off('lead:updated', handleLeadUpdated)
})

watch([priorityFilter, statusFilter, categoryFilter, nearestLimit, ownerFilter], () => {
  updateMarkers()
})
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-gray-900">خريطة العملاء المحتملين</h1>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="priorityFilter" class="input !w-auto text-sm">
          <option value="">كل الأولويات</option>
          <option value="A">A - عالية</option>
          <option value="B">B - متوسطة</option>
          <option value="C">C - منخفضة</option>
        </select>
        <select v-model="statusFilter" class="input !w-auto text-sm">
          <option value="">كل الحالات</option>
          <option value="new">لم تتم</option>
          <option value="visited">تمت</option>
        </select>
        <select v-model="ownerFilter" class="input !w-auto text-sm">
          <option value="">الكل</option>
          <option value="available">🆓 متاحة</option>
          <option value="mine">✓ لي</option>
          <option value="taken">⚠️ محجوزة لآخرين</option>
        </select>
        <select v-model="categoryFilter" class="input !w-auto text-sm">
          <option value="">كل التصنيفات</option>
          <option v-for="cat in categories" :key="cat!" :value="cat">{{ cat }}</option>
        </select>
        <select v-model.number="nearestLimit" class="input !w-auto text-sm" :disabled="!userLocation">
          <option :value="0">الكل</option>
          <option :value="10">أقرب 10</option>
          <option :value="20">أقرب 20</option>
          <option :value="50">أقرب 50</option>
        </select>
        <button
          type="button"
          class="text-sm"
          :class="userLocation ? 'btn-primary' : 'btn-secondary'"
          :disabled="locating"
          @click="locateMe"
        >
          {{ locating ? 'جاري التحديد...' : userLocation ? '📍 تحديث موقعي' : '📍 الأقرب إليّ' }}
        </button>
      </div>
    </div>
    <p v-if="locateError" class="mb-3 text-xs text-red-600">{{ locateError }}</p>

    <div class="mb-4 grid grid-cols-5 gap-3">
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-gray-900">{{ stats.total }}</p>
        <p class="text-[11px] text-gray-500">المعروض</p>
      </div>
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-red-600">{{ stats.tierA }}</p>
        <p class="text-[11px] text-gray-500">أولوية A</p>
      </div>
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-amber-500">{{ stats.tierB }}</p>
        <p class="text-[11px] text-gray-500">أولوية B</p>
      </div>
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-blue-600">{{ stats.tierC }}</p>
        <p class="text-[11px] text-gray-500">أولوية C</p>
      </div>
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-green-600">{{ stats.visited }}</p>
        <p class="text-[11px] text-gray-500">تمت زيارتهم</p>
      </div>
    </div>

    <div v-if="loading" class="card flex items-center justify-center" style="height: 500px">
      <p class="text-gray-400">جاري التحميل...</p>
    </div>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <div ref="mapContainer" style="height: 600px; width: 100%"></div>
    </div>

    <div class="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-gray-500">
      <div class="flex items-center gap-1.5">
        <span class="inline-block h-3 w-3 rounded-full border-2 border-white shadow" style="background:#ef4444"></span>
        أولوية A
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-block h-3 w-3 rounded-full border-2 border-white shadow" style="background:#f59e0b"></span>
        أولوية B
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-block h-3 w-3 rounded-full border-2 border-white shadow" style="background:#3b82f6"></span>
        أولوية C
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-block h-3 w-3 rounded-full border-2 border-white shadow" style="background:#22c55e"></span>
        تمت الزيارة
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-block h-3 w-3 rounded-full border-2 border-white shadow" style="background:#9ca3af"></span>
        محجوز لمندوب آخر
      </div>
    </div>

    <!-- Visit outcome modal -->
    <Teleport to="body">
      <div
        v-if="showVisitModal"
        class="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
        @click.self="showVisitModal = false"
      >
        <div class="w-full max-w-md rounded-t-2xl sm:rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h2 class="text-base font-bold text-gray-900">تسجيل زيارة</h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ activeLead?.name }}</p>
            </div>
            <button type="button" @click="showVisitModal = false" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <form @submit.prevent="submitVisit" class="space-y-4">
            <div>
              <label class="label">نتيجة الزيارة *</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="(label, key) in outcomeLabels"
                  :key="key"
                  type="button"
                  class="rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all"
                  :class="visitForm.outcome === key ? outcomeColors[key] + ' ring-2 ring-offset-1' : 'border-gray-200 text-gray-600 hover:border-gray-300'"
                  @click="visitForm.outcome = key as typeof visitForm.outcome"
                >{{ label }}</button>
              </div>
            </div>

            <div>
              <label class="label">ملاحظات / تفاصيل الحالة</label>
              <textarea
                v-model="visitForm.notes"
                class="input"
                rows="4"
                placeholder="اكتب تفاصيل المحادثة، ملاحظات مهمة، أو شروط العميل..."
              />
            </div>

            <div class="flex items-center gap-2 pt-2">
              <button type="button" class="btn-secondary flex-1" @click="showVisitModal = false">إلغاء</button>
              <button type="submit" class="btn-primary flex-1" :disabled="savingVisit || !visitForm.outcome">
                {{ savingVisit ? 'جاري الحفظ...' : 'حفظ الزيارة' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Transfer modal -->
    <Teleport to="body">
      <div
        v-if="showTransferModal"
        class="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
        @click.self="showTransferModal = false"
      >
        <div class="w-full max-w-sm rounded-t-2xl sm:rounded-xl bg-white p-5 shadow-xl">
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h2 class="text-base font-bold text-gray-900">نقل العميل</h2>
              <p class="text-xs text-gray-500 mt-0.5">{{ activeLead?.name }}</p>
            </div>
            <button type="button" @click="showTransferModal = false" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <form @submit.prevent="submitTransfer" class="space-y-4">
            <div>
              <label class="label">المندوب الجديد *</label>
              <select v-model="transferForm.toUserId" class="input">
                <option value="">اختر مندوب...</option>
                <option
                  v-for="u in salesUsers.filter((s) => s.id !== authStore.user?.id)"
                  :key="u.id"
                  :value="u.id"
                >{{ u.name }} ({{ u.email }})</option>
              </select>
              <p class="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded">
                ⚠️ بعد النقل، لن تستطيع تعديل هذا العميل — سيصبح المندوب الجديد مسؤولاً عنه.
              </p>
            </div>

            <div class="flex items-center gap-2 pt-2">
              <button type="button" class="btn-secondary flex-1" @click="showTransferModal = false">إلغاء</button>
              <button type="submit" class="btn-primary flex-1" :disabled="transferring || !transferForm.toUserId">
                {{ transferring ? 'جاري النقل...' : 'نقل' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.leaflet-container {
  font-family: 'IBM Plex Sans Arabic', sans-serif;
  z-index: 1;
}
.custom-marker {
  background: none !important;
  border: none !important;
}
</style>
