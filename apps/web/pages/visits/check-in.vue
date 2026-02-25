<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'تسجيل زيارة' })

const api = useApi()
const authStore = useAuthStore()

const clients = ref<any[]>([])
const recentVisits = ref<Map<string, any[]>>(new Map())
const loading = ref(true)
const search = ref('')
const cityFilter = ref('')
const selectedClient = ref<any>(null)
const showConfirm = ref(false)
const checkingIn = ref(false)
const visitNotes = ref('')
const result = ref<any>(null)

// GPS state
const gpsStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const gpsError = ref('')
const location = ref<[number, number] | null>(null)

// Create client inline
const showCreateClient = ref(false)
const savingClient = ref(false)
const clientGpsStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const clientForm = reactive({
  name: '', phone: '', city: '', address: '', notes: '',
  location: null as [number, number] | null,
})

const filteredClients = computed(() => {
  let result = clients.value
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter((c) =>
      c.name?.toLowerCase().includes(s) ||
      c.phone?.includes(s) ||
      c.city?.toLowerCase().includes(s) ||
      c.address?.toLowerCase().includes(s),
    )
  }
  if (cityFilter.value) result = result.filter((c) => c.city === cityFilter.value)
  return result
})

const cities = computed(() => [...new Set(clients.value.map((c) => c.city).filter(Boolean))])

onMounted(async () => {
  captureGPS()
  await fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const [clientsRes, visitsRes] = await Promise.all([
      api.get('/clients', { query: { limit: 500, sort: '-createdAt', depth: 0 } }),
      api.get('/visits', { query: { limit: 1000, sort: '-checkInTime', depth: 1, where: { checkInTime: { greater_than: sevenDaysAgo } } } }),
    ])
    clients.value = clientsRes.docs

    // Group visits by client
    const map = new Map<string, any[]>()
    for (const v of visitsRes.docs) {
      const clientId = typeof v.client === 'object' ? v.client?.id : v.client
      if (clientId) {
        if (!map.has(clientId)) map.set(clientId, [])
        map.get(clientId)!.push(v)
      }
    }
    recentVisits.value = map
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

function captureGPS() {
  if (!navigator.geolocation) { gpsError.value = 'المتصفح لا يدعم تحديد الموقع'; gpsStatus.value = 'error'; return }
  gpsStatus.value = 'loading'
  gpsError.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => { location.value = [pos.coords.longitude, pos.coords.latitude]; gpsStatus.value = 'success' },
    (err) => { gpsError.value = err.message; gpsStatus.value = 'error' },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

function getClientVisits(clientId: string) {
  return recentVisits.value.get(clientId) || []
}

function getLastVisit(clientId: string) {
  const visits = getClientVisits(clientId)
  return visits.length > 0 ? visits[0] : null
}

function getVisitorName(visit: any) {
  if (!visit) return ''
  return typeof visit.representative === 'object' ? visit.representative?.name : ''
}

function isVisitedByOther(clientId: string) {
  const visits = getClientVisits(clientId)
  return visits.some((v) => {
    const repId = typeof v.representative === 'object' ? v.representative?.id : v.representative
    return repId !== authStore.user?.id
  })
}

function isVisitedByMe(clientId: string) {
  const visits = getClientVisits(clientId)
  return visits.some((v) => {
    const repId = typeof v.representative === 'object' ? v.representative?.id : v.representative
    return repId === authStore.user?.id
  })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'أقل من ساعة'
  if (hours < 24) return `${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'أمس'
  return `${days} يوم`
}

function selectClient(client: any) {
  selectedClient.value = client
  visitNotes.value = ''
  showConfirm.value = true
}

async function handleCheckIn() {
  if (!selectedClient.value || !location.value) return
  checkingIn.value = true
  try {
    const res = await api.post('/check-in', {
      clientId: selectedClient.value.id,
      location: location.value,
    })
    result.value = res
    showConfirm.value = false

    // If we have notes, update the visit
    if (visitNotes.value.trim() && res.visit?.id) {
      await api.patch(`/visits/${res.visit.id}`, { notes: visitNotes.value.trim() })
    }
  } catch (err: any) { alert(err?.data?.error || 'حدث خطأ') }
  finally { checkingIn.value = false }
}

function resetAndNew() {
  result.value = null
  selectedClient.value = null
  search.value = ''
  visitNotes.value = ''
  captureGPS()
  fetchData()
}

// Inline create client
function openCreateClient() {
  Object.assign(clientForm, { name: search.value || '', phone: '', city: '', address: '', notes: '', location: null })
  clientGpsStatus.value = 'idle'
  showCreateClient.value = true
  // Auto-use current GPS for the new client
  if (location.value) {
    clientForm.location = [...location.value] as [number, number]
    clientGpsStatus.value = 'success'
  } else {
    captureClientGPS()
  }
}

function captureClientGPS() {
  if (!navigator.geolocation) { clientGpsStatus.value = 'error'; return }
  clientGpsStatus.value = 'loading'
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      clientForm.location = [pos.coords.longitude, pos.coords.latitude]
      clientGpsStatus.value = 'success'
    },
    () => { clientGpsStatus.value = 'error' },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

async function handleCreateClient() {
  savingClient.value = true
  try {
    const res = await api.post('/clients', {
      name: clientForm.name,
      phone: clientForm.phone || undefined,
      city: clientForm.city || undefined,
      address: clientForm.address || undefined,
      notes: clientForm.notes || undefined,
      location: clientForm.location || undefined,
      tags: ['new'],
    })
    showCreateClient.value = false
    // Refresh and auto-select the new client
    await fetchData()
    const newClient = clients.value.find((c) => c.id === res.doc?.id || c.id === res.id)
    if (newClient) selectClient(newClient)
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ في حفظ العميل') }
  finally { savingClient.value = false }
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">تسجيل زيارة</h1>
      <button @click="openCreateClient" class="btn-primary text-sm">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        عميل جديد
      </button>
    </div>

    <!-- Success Result -->
    <div v-if="result" class="card mb-6">
      <div class="text-center">
        <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full" :class="result.isValid ? 'bg-green-100' : 'bg-yellow-100'">
          <svg class="h-8 w-8" :class="result.isValid ? 'text-green-600' : 'text-yellow-600'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="result.isValid" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-lg font-bold text-gray-900">{{ result.message }}</p>
        <p class="mt-1 text-sm text-gray-500">{{ selectedClient?.name }}</p>
        <p v-if="result.distance" class="text-xs text-gray-400">المسافة: {{ result.distance }} متر</p>
        <p v-if="result.impossibleTravel" class="mt-2 text-sm font-medium text-red-600">تحذير: تم اكتشاف انتقال غير طبيعي!</p>
        <button @click="resetAndNew" class="btn-primary mt-4">تسجيل زيارة أخرى</button>
      </div>
    </div>

    <template v-else>
      <!-- GPS Status -->
      <div class="card mb-4 !py-3">
        <div class="flex items-center gap-3">
          <div class="h-3 w-3 rounded-full shrink-0" :class="{
            'bg-gray-400': gpsStatus === 'idle',
            'bg-blue-500 animate-pulse': gpsStatus === 'loading',
            'bg-green-500': gpsStatus === 'success',
            'bg-red-500': gpsStatus === 'error',
          }" />
          <div class="flex-1 text-sm">
            <span v-if="gpsStatus === 'idle'" class="text-gray-500">لم يتم تحديد الموقع</span>
            <span v-else-if="gpsStatus === 'loading'" class="text-blue-700">جاري تحديد موقعك...</span>
            <span v-else-if="gpsStatus === 'success'" class="text-green-700">
              تم تحديد موقعك
              <span class="text-[10px] text-green-500 font-mono mr-1" dir="ltr">{{ location?.[1]?.toFixed(5) }}, {{ location?.[0]?.toFixed(5) }}</span>
            </span>
            <span v-else class="text-red-700">{{ gpsError || 'فشل تحديد الموقع' }}</span>
          </div>
          <button v-if="gpsStatus !== 'loading'" @click="captureGPS" class="btn-secondary !py-1 !px-2 text-xs">
            {{ gpsStatus === 'success' ? 'تحديث' : 'تحديد' }}
          </button>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="card mb-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div class="sm:col-span-3">
            <input v-model="search" type="text" class="input" placeholder="ابحث عن العميل بالاسم، الهاتف، المدينة، العنوان..." />
          </div>
          <select v-model="cityFilter" class="input">
            <option value="">كل المدن</option>
            <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
          </select>
        </div>
        <p class="mt-2 text-xs text-gray-400">
          {{ filteredClients.length }} عميل — ابحث أولاً للتأكد من عدم تكرار الزيارة
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="card animate-pulse"><div class="h-16 rounded bg-gray-200" /></div>
      </div>

      <!-- Client List -->
      <div v-else class="space-y-2">
        <p v-if="!filteredClients.length" class="card py-8 text-center text-gray-400">
          لا يوجد عملاء مطابقين
          <button @click="openCreateClient" class="mt-2 block mx-auto text-sm text-primary-600 hover:text-primary-700">
            + تسجيل عميل جديد
          </button>
        </p>

        <div
          v-for="client in filteredClients"
          :key="client.id"
          class="card cursor-pointer transition-all hover:shadow-md !py-3"
          :class="{
            'border-orange-200 bg-orange-50/50': isVisitedByOther(client.id),
            'border-green-200 bg-green-50/50': isVisitedByMe(client.id),
          }"
          @click="selectClient(client)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900">{{ client.name }}</span>
                <span v-if="client.location" class="text-green-600">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/></svg>
                </span>
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                <span v-if="client.phone" dir="ltr">{{ client.phone }}</span>
                <span v-if="client.city">{{ client.city }}</span>
                <span v-if="client.address" class="truncate max-w-[180px]">{{ client.address }}</span>
              </div>
            </div>

            <!-- Visit status -->
            <div class="text-left shrink-0 min-w-[120px]">
              <template v-if="getLastVisit(client.id)">
                <div v-if="isVisitedByOther(client.id)" class="text-right">
                  <p class="text-xs font-bold text-orange-600">زاره موظف آخر</p>
                  <p class="text-[10px] text-gray-400">{{ getVisitorName(getLastVisit(client.id)) }} — {{ timeAgo(getLastVisit(client.id).checkInTime) }}</p>
                </div>
                <div v-else class="text-right">
                  <p class="text-xs font-medium text-green-600">زرته أنت</p>
                  <p class="text-[10px] text-gray-400">{{ timeAgo(getLastVisit(client.id).checkInTime) }}</p>
                </div>
              </template>
              <div v-else class="text-right">
                <p class="text-xs font-medium text-blue-600">لم يُزَر</p>
                <p class="text-[10px] text-gray-400">متاح للزيارة</p>
              </div>
            </div>

            <svg class="h-5 w-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </div>
        </div>
      </div>
    </template>

    <!-- Confirm Check-in Modal -->
    <Teleport to="body">
      <div v-if="showConfirm && selectedClient" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showConfirm = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold">تأكيد الزيارة</h2>

          <!-- Warning if visited by other -->
          <div v-if="isVisitedByOther(selectedClient.id)" class="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
            <div class="flex items-start gap-2">
              <svg class="h-5 w-5 text-orange-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p class="text-sm font-bold text-orange-800">تنبيه: هذا العميل زاره موظف آخر مؤخراً</p>
                <p class="mt-1 text-xs text-orange-600">
                  {{ getVisitorName(getLastVisit(selectedClient.id)) }} — {{ timeAgo(getLastVisit(selectedClient.id).checkInTime) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Already visited by me -->
          <div v-else-if="isVisitedByMe(selectedClient.id)" class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p class="text-sm text-blue-800">لقد زرت هذا العميل مسبقاً ({{ timeAgo(getLastVisit(selectedClient.id)?.checkInTime) }})</p>
          </div>

          <!-- Client info -->
          <div class="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p class="font-medium text-gray-900">{{ selectedClient.name }}</p>
            <div class="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
              <span v-if="selectedClient.phone" dir="ltr">{{ selectedClient.phone }}</span>
              <span v-if="selectedClient.city">{{ selectedClient.city }}</span>
              <span v-if="selectedClient.address">{{ selectedClient.address }}</span>
            </div>
          </div>

          <!-- GPS warning -->
          <div v-if="!location" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p class="text-sm text-red-700">يجب تحديد موقعك أولاً قبل تسجيل الزيارة</p>
            <button @click="captureGPS" class="mt-2 text-xs text-red-800 underline">إعادة تحديد الموقع</button>
          </div>

          <!-- Notes -->
          <div class="mb-4">
            <label class="label">ملاحظات الزيارة (اختياري)</label>
            <textarea v-model="visitNotes" class="input" rows="2" placeholder="ملاحظات عن الزيارة..." />
          </div>

          <div class="flex justify-end gap-3">
            <button @click="showConfirm = false" class="btn-secondary">إلغاء</button>
            <button @click="handleCheckIn" :disabled="checkingIn || !location" class="btn-primary">
              {{ checkingIn ? 'جاري التسجيل...' : 'تأكيد تسجيل الزيارة' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Client Modal -->
    <Teleport to="body">
      <div v-if="showCreateClient" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateClient = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <h2 class="mb-4 text-lg font-bold">تسجيل عميل جديد</h2>

          <form @submit.prevent="handleCreateClient" class="space-y-4">
            <div>
              <label class="label">اسم الشركة / العميل *</label>
              <input v-model="clientForm.name" class="input" required placeholder="مثال: شركة الأمل للتجارة" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">رقم الهاتف</label><input v-model="clientForm.phone" class="input" dir="ltr" placeholder="07XXXXXXXXX" /></div>
              <div><label class="label">المدينة</label><input v-model="clientForm.city" class="input" placeholder="بغداد" /></div>
            </div>
            <div>
              <label class="label">العنوان</label>
              <input v-model="clientForm.address" class="input" placeholder="المنطقة، الشارع" />
            </div>

            <!-- GPS -->
            <div>
              <label class="label">الموقع الجغرافي</label>
              <div class="flex items-center gap-3 rounded-lg border p-3" :class="{
                'border-gray-200 bg-gray-50': clientGpsStatus === 'idle',
                'border-blue-200 bg-blue-50': clientGpsStatus === 'loading',
                'border-green-200 bg-green-50': clientGpsStatus === 'success',
                'border-red-200 bg-red-50': clientGpsStatus === 'error',
              }">
                <div class="h-3 w-3 rounded-full shrink-0" :class="{
                  'bg-gray-400': clientGpsStatus === 'idle',
                  'bg-blue-500 animate-pulse': clientGpsStatus === 'loading',
                  'bg-green-500': clientGpsStatus === 'success',
                  'bg-red-500': clientGpsStatus === 'error',
                }" />
                <div class="flex-1 text-sm">
                  <span v-if="clientGpsStatus === 'success'" class="text-green-700">
                    تم التقاط الموقع
                    <span class="text-[10px] font-mono mr-1" dir="ltr">{{ clientForm.location?.[1]?.toFixed(5) }}, {{ clientForm.location?.[0]?.toFixed(5) }}</span>
                  </span>
                  <span v-else-if="clientGpsStatus === 'loading'" class="text-blue-700">جاري تحديد الموقع...</span>
                  <span v-else class="text-gray-500">سيتم استخدام موقعك الحالي</span>
                </div>
              </div>
            </div>

            <div><label class="label">ملاحظات</label><textarea v-model="clientForm.notes" class="input" rows="2" placeholder="ملاحظات..." /></div>

            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showCreateClient = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="savingClient" class="btn-primary">
                {{ savingClient ? 'جاري الحفظ...' : 'حفظ وتسجيل زيارة' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
