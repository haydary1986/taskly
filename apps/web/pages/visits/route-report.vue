<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const api = useApi()
const authStore = useAuthStore()

const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedRep = ref(authStore.user?.id || '')
const reps = ref<any[]>([])
const routeData = ref<any>(null)
const loading = ref(false)
const mapContainer = ref<HTMLElement | null>(null)
let mapInstance: any = null
let L: any = null

const isAdmin = computed(() => authStore.isAdmin)

onMounted(async () => {
  if (isAdmin.value) {
    try {
      const res = await api.get('/users?where[role][in]=sales-rep&where[isActive][equals]=true&limit=100')
      reps.value = res.docs || []
    } catch { /* ignore */ }
  }
  await fetchRoute()
})

async function fetchRoute() {
  loading.value = true
  try {
    const params = new URLSearchParams({ date: selectedDate.value })
    if (isAdmin.value && selectedRep.value) params.set('rep', selectedRep.value)
    routeData.value = await api.get(`/daily-route?${params}`)
    await nextTick()
    renderMap()
  } catch (err) {
    console.error('Failed to fetch route:', err)
  } finally {
    loading.value = false
  }
}

async function renderMap() {
  if (!mapContainer.value || !routeData.value?.route?.length) return

  if (!L) {
    L = await import('leaflet')
  }

  if (mapInstance) {
    mapInstance.remove()
  }

  mapInstance = L.map(mapContainer.value).setView([24.7136, 46.6753], 10)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(mapInstance)

  const points: [number, number][] = []
  const route = routeData.value.route

  for (let i = 0; i < route.length; i++) {
    const visit = route[i]
    if (!visit.checkInLocation || !Array.isArray(visit.checkInLocation)) continue

    const [lng, lat] = visit.checkInLocation
    points.push([lat, lng])

    const color = visit.isValid ? '#10B981' : '#EF4444'
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${visit.order}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const marker = L.marker([lat, lng], { icon }).addTo(mapInstance)
    const duration = visit.durationMinutes ? `${visit.durationMinutes} دقيقة` : 'لم يسجل خروج'
    const distance = visit.distance != null ? `${visit.distance}م من العميل` : ''
    marker.bindPopup(`
      <div style="direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif">
        <strong>${visit.clientName || 'عميل'}</strong><br/>
        <small>${new Date(visit.checkInTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</small><br/>
        <small>المدة: ${duration}</small><br/>
        ${distance ? `<small>المسافة: ${distance}</small><br/>` : ''}
        <span style="color:${visit.isValid ? 'green' : 'red'}">${visit.isValid ? 'زيارة صالحة' : 'زيارة غير صالحة'}</span>
      </div>
    `)

    // Add checkout location if different
    if (visit.checkOutLocation && Array.isArray(visit.checkOutLocation)) {
      const [lng2, lat2] = visit.checkOutLocation
      if (Math.abs(lat2 - lat) > 0.0001 || Math.abs(lng2 - lng) > 0.0001) {
        points.push([lat2, lng2])
      }
    }
  }

  // Draw route line
  if (points.length > 1) {
    L.polyline(points, { color: '#3B82F6', weight: 3, opacity: 0.7, dashArray: '10, 5' }).addTo(mapInstance)
  }

  // Fit bounds
  if (points.length > 0) {
    mapInstance.fitBounds(points, { padding: [30, 30] })
  }
}

function formatTime(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

watch([selectedDate, selectedRep], () => fetchRoute())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">تقرير المسار اليومي</h1>
        <p class="text-sm text-gray-500">عرض مسار الزيارات على الخريطة مع التفاصيل</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card flex flex-wrap items-end gap-4">
      <div>
        <label class="label">التاريخ</label>
        <input type="date" v-model="selectedDate" class="input w-44" />
      </div>
      <div v-if="isAdmin && reps.length">
        <label class="label">المندوب</label>
        <select v-model="selectedRep" class="input w-48">
          <option v-for="rep in reps" :key="rep.id" :value="rep.id">{{ rep.name }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card animate-pulse">
      <div class="h-64 rounded bg-gray-200" />
    </div>

    <template v-else-if="routeData">
      <!-- Summary cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div class="card text-center">
          <p class="text-xs text-gray-500">إجمالي الزيارات</p>
          <p class="text-2xl font-bold text-gray-900">{{ routeData.summary.totalVisits }}</p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500">زيارات صالحة</p>
          <p class="text-2xl font-bold text-green-600">{{ routeData.summary.validVisits }}</p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500">زيارات غير صالحة</p>
          <p class="text-2xl font-bold text-red-600">{{ routeData.summary.invalidVisits }}</p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500">إجمالي المدة</p>
          <p class="text-2xl font-bold text-blue-600">{{ routeData.summary.totalDurationMinutes }} د</p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-gray-500">المسافة الكلية</p>
          <p class="text-2xl font-bold text-purple-600">{{ routeData.summary.totalDistanceKm }} كم</p>
        </div>
      </div>

      <!-- Map -->
      <div class="card p-0 overflow-hidden">
        <div ref="mapContainer" class="h-96 w-full" style="z-index: 1" />
      </div>

      <!-- Visit timeline -->
      <div class="card">
        <h3 class="mb-4 text-lg font-semibold text-gray-900">تفاصيل الزيارات</h3>
        <div v-if="routeData.route.length" class="space-y-3">
          <div
            v-for="visit in routeData.route"
            :key="visit.visitId"
            class="flex items-start gap-3 rounded-lg border p-3"
            :class="visit.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              :class="visit.isValid ? 'bg-green-500' : 'bg-red-500'"
            >
              {{ visit.order }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-gray-900">{{ visit.clientName }}</h4>
                <span class="text-xs text-gray-500">
                  {{ formatTime(visit.checkInTime) }}
                  <template v-if="visit.checkOutTime"> - {{ formatTime(visit.checkOutTime) }}</template>
                </span>
              </div>
              <div class="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                <span v-if="visit.durationMinutes">المدة: {{ visit.durationMinutes }} دقيقة</span>
                <span v-if="visit.distance != null">المسافة: {{ visit.distance }}م</span>
                <span v-if="visit.travelFromPreviousKm">السفر: {{ visit.travelFromPreviousKm }} كم</span>
                <span :class="visit.isValid ? 'text-green-600' : 'text-red-600'">
                  {{ visit.isValid ? 'صالحة' : 'غير صالحة' }}
                </span>
              </div>
              <p v-if="visit.notes" class="mt-1 text-xs text-gray-600">{{ visit.notes }}</p>
            </div>
          </div>
        </div>
        <p v-else class="py-8 text-center text-sm text-gray-400">لا توجد زيارات في هذا اليوم</p>
      </div>
    </template>
  </div>
</template>
