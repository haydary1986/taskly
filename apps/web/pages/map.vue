<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'الخريطة التفاعلية' })

const api = useApi()

const clients = ref<any[]>([])
const visits = ref<any[]>([])
const loading = ref(true)
const cityFilter = ref('')
const showVisitPaths = ref(false)
const mapContainer = ref<HTMLElement | null>(null)

let map: any = null
let markers: any[] = []
let pathLines: any[] = []
let L: any = null

const cities = computed(() => [...new Set(clients.value.map((c: any) => c.city).filter(Boolean))])

const visitedClientIds = computed(() => {
  const ids = new Set<string>()
  visits.value.forEach((v: any) => {
    const clientId = typeof v.client === 'object' ? v.client?.id : v.client
    if (clientId) ids.add(clientId)
  })
  return ids
})

const filteredClients = computed(() => {
  let result = clients.value.filter((c: any) => c.location && Array.isArray(c.location) && c.location.length === 2)
  if (cityFilter.value) result = result.filter((c: any) => c.city === cityFilter.value)
  return result
})

const stats = computed(() => ({
  total: filteredClients.value.length,
  visited: filteredClients.value.filter(c => visitedClientIds.value.has(c.id)).length,
  notVisited: filteredClients.value.filter(c => !visitedClientIds.value.has(c.id)).length,
  totalVisits: visits.value.length,
}))

onMounted(async () => {
  try {
    const [clientsRes, visitsRes] = await Promise.all([
      api.get('/clients', { query: { limit: 1000, depth: 0 } }),
      api.get('/visits', { query: { limit: 1000, depth: 1, sort: '-checkInTime' } }),
    ])
    clients.value = clientsRes.docs
    visits.value = visitsRes.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }

  await nextTick()
  await initMap()
})

async function initMap() {
  if (!mapContainer.value) return

  L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  // Iraq center (Baghdad)
  map = L.map(mapContainer.value).setView([33.3152, 44.3661], 6)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(map)

  updateMarkers()
}

function updateMarkers() {
  if (!map || !L) return

  // Clear old markers
  markers.forEach(m => map.removeLayer(m))
  markers = []
  pathLines.forEach(p => map.removeLayer(p))
  pathLines = []

  const bounds: [number, number][] = []

  // Client markers
  filteredClients.value.forEach((client: any) => {
    const [lng, lat] = client.location
    const isVisited = visitedClientIds.value.has(client.id)

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 28px; height: 28px; border-radius: 50%;
        background: ${isVisited ? '#22c55e' : '#ef4444'};
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          ${isVisited
            ? '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>'
            : '<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/>'}
        </svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const marker = L.marker([lat, lng], { icon }).addTo(map)

    // Find last visit for this client
    const lastVisit = visits.value.find((v: any) => {
      const cid = typeof v.client === 'object' ? v.client?.id : v.client
      return cid === client.id
    })
    const visitInfo = lastVisit
      ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280">
          آخر زيارة: ${new Date(lastVisit.checkInTime).toLocaleDateString('ar-SA')}<br>
          ${lastVisit.notes ? `ملاحظات: ${lastVisit.notes}` : ''}
        </div>`
      : ''

    marker.bindPopup(`
      <div style="direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;min-width:180px">
        <strong style="font-size:14px">${client.name}</strong>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">
          ${client.city ? `<div>${client.city}</div>` : ''}
          ${client.phone ? `<div dir="ltr">${client.phone}</div>` : ''}
          ${client.address ? `<div>${client.address}</div>` : ''}
        </div>
        <div style="margin-top:6px">
          <span style="
            display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;
            background:${isVisited ? '#dcfce7' : '#fee2e2'};
            color:${isVisited ? '#166534' : '#991b1b'};
          ">${isVisited ? 'تمت الزيارة' : 'لم تتم الزيارة'}</span>
        </div>
        ${visitInfo}
      </div>
    `)

    markers.push(marker)
    bounds.push([lat, lng])
  })

  // Visit path lines
  if (showVisitPaths.value) {
    const visitPoints = visits.value
      .filter((v: any) => v.checkInLocation && Array.isArray(v.checkInLocation) && v.checkInLocation.length === 2)
      .sort((a: any, b: any) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime())
      .map((v: any) => [v.checkInLocation[1], v.checkInLocation[0]] as [number, number])

    if (visitPoints.length >= 2) {
      const polyline = L.polyline(visitPoints, {
        color: '#2563eb',
        weight: 2,
        opacity: 0.6,
        dashArray: '8, 8',
      }).addTo(map)
      pathLines.push(polyline)
    }

    // Visit point markers (small blue dots)
    visits.value.forEach((v: any) => {
      if (!v.checkInLocation || !Array.isArray(v.checkInLocation) || v.checkInLocation.length !== 2) return
      const [lng, lat] = v.checkInLocation
      const dot = L.circleMarker([lat, lng], {
        radius: 4,
        fillColor: '#2563eb',
        color: '#1d4ed8',
        weight: 1,
        fillOpacity: 0.8,
      }).addTo(map)

      const clientName = typeof v.client === 'object' ? v.client?.name : ''
      dot.bindPopup(`
        <div style="direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;font-size:12px">
          <strong>زيارة ${clientName}</strong><br>
          ${new Date(v.checkInTime).toLocaleString('ar-SA')}<br>
          ${v.notes || ''}
        </div>
      `)
      markers.push(dot)
      bounds.push([lat, lng])
    })
  }

  // Fit map to markers
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
  }
}

watch([cityFilter, showVisitPaths], () => {
  updateMarkers()
})
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-gray-900">الخريطة التفاعلية</h1>
      <div class="flex items-center gap-2">
        <select v-model="cityFilter" class="input !w-auto text-sm">
          <option value="">كل المدن</option>
          <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
        </select>
        <button @click="showVisitPaths = !showVisitPaths" class="text-sm" :class="showVisitPaths ? 'btn-primary' : 'btn-secondary'">
          مسار الزيارات
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="mb-4 grid grid-cols-4 gap-3">
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-gray-900">{{ stats.total }}</p>
        <p class="text-[11px] text-gray-500">عملاء على الخريطة</p>
      </div>
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-green-600">{{ stats.visited }}</p>
        <p class="text-[11px] text-gray-500">تمت زيارتهم</p>
      </div>
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-red-600">{{ stats.notVisited }}</p>
        <p class="text-[11px] text-gray-500">لم تتم زيارتهم</p>
      </div>
      <div class="card !py-3 text-center">
        <p class="text-xl font-bold text-blue-600">{{ stats.totalVisits }}</p>
        <p class="text-[11px] text-gray-500">إجمالي الزيارات</p>
      </div>
    </div>

    <!-- Map -->
    <div v-if="loading" class="card flex items-center justify-center" style="height: 500px">
      <p class="text-gray-400">جاري التحميل...</p>
    </div>
    <div v-else class="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <div ref="mapContainer" style="height: 500px; width: 100%"></div>
    </div>

    <!-- Legend -->
    <div class="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
      <div class="flex items-center gap-1.5">
        <span class="inline-block h-3 w-3 rounded-full bg-green-500 border-2 border-white shadow"></span>
        تمت الزيارة
      </div>
      <div class="flex items-center gap-1.5">
        <span class="inline-block h-3 w-3 rounded-full bg-red-500 border-2 border-white shadow"></span>
        لم تتم الزيارة
      </div>
      <div v-if="showVisitPaths" class="flex items-center gap-1.5">
        <span class="inline-block h-0.5 w-5" style="border-top: 2px dashed #2563eb"></span>
        مسار الزيارات
      </div>
    </div>
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
