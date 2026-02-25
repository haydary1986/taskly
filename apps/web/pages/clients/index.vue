<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'إدارة العملاء' })

const api = useApi()
const authStore = useAuthStore()

const clients = ref<any[]>([])
const recentVisits = ref<Map<string, any>>(new Map())
const loading = ref(true)
const search = ref('')
const cityFilter = ref('')
const showCreateModal = ref(false)
const savingClient = ref(false)
const gpsStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const gpsError = ref('')

const clientForm = reactive({
  name: '', phone: '', email: '', address: '', city: '', notes: '', tags: [] as string[],
  location: null as [number, number] | null,
})

const tagOptions = [
  { value: 'vip', label: 'VIP' },
  { value: 'new', label: 'جديد' },
  { value: 'regular', label: 'دائم' },
  { value: 'prospect', label: 'محتمل' },
  { value: 'inactive', label: 'متوقف' },
]

const tagLabels: Record<string, string> = {
  vip: 'VIP', new: 'جديد', regular: 'دائم', prospect: 'محتمل', inactive: 'متوقف',
}

const filteredClients = computed(() => {
  let result = clients.value
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter((c) =>
      c.name?.toLowerCase().includes(s) ||
      c.phone?.includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.address?.toLowerCase().includes(s),
    )
  }
  if (cityFilter.value) result = result.filter((c) => c.city === cityFilter.value)
  return result
})

const cities = computed(() => [...new Set(clients.value.map((c) => c.city).filter(Boolean))])

onMounted(async () => {
  await fetchClients()
  await fetchRecentVisits()
})

async function fetchClients() {
  loading.value = true
  try {
    const res = await api.get('/clients', { query: { limit: 500, sort: '-createdAt', depth: 1 } })
    clients.value = res.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

async function fetchRecentVisits() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const res = await api.get('/visits', {
      query: { limit: 1000, sort: '-checkInTime', depth: 1, where: { checkInTime: { greater_than: thirtyDaysAgo } } },
    })
    const map = new Map<string, any>()
    for (const v of res.docs) {
      const clientId = typeof v.client === 'object' ? v.client?.id : v.client
      if (clientId && !map.has(clientId)) {
        map.set(clientId, v)
      }
    }
    recentVisits.value = map
  } catch (err) { console.error(err) }
}

function getLastVisit(clientId: string) {
  return recentVisits.value.get(clientId)
}

function getVisitorName(visit: any) {
  if (!visit) return ''
  return typeof visit.representative === 'object' ? visit.representative?.name : ''
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

function captureGPS() {
  if (!navigator.geolocation) { gpsError.value = 'المتصفح لا يدعم تحديد الموقع'; gpsStatus.value = 'error'; return }
  gpsStatus.value = 'loading'
  gpsError.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      clientForm.location = [pos.coords.longitude, pos.coords.latitude]
      gpsStatus.value = 'success'
    },
    (err) => {
      gpsError.value = err.message
      gpsStatus.value = 'error'
    },
    { enableHighAccuracy: true, timeout: 15000 },
  )
}

function openCreateModal() {
  Object.assign(clientForm, { name: '', phone: '', email: '', address: '', city: '', notes: '', tags: ['new'], location: null })
  gpsStatus.value = 'idle'
  gpsError.value = ''
  showCreateModal.value = true
  captureGPS()
}

async function handleCreate() {
  savingClient.value = true
  try {
    await api.post('/clients', {
      ...clientForm,
      tags: clientForm.tags.length ? clientForm.tags : undefined,
      location: clientForm.location || undefined,
    })
    showCreateModal.value = false
    fetchClients()
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ') }
  finally { savingClient.value = false }
}

async function deleteClient(id: string) {
  if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return
  try {
    await api.del(`/clients/${id}`)
    clients.value = clients.value.filter((c) => c.id !== id)
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ') }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">إدارة العملاء</h1>
      <button @click="openCreateModal" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        تسجيل عميل جديد
      </button>
    </div>

    <!-- Search & Filters -->
    <div class="card mb-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <input v-model="search" type="text" class="input" placeholder="بحث بالاسم، الهاتف، البريد، العنوان..." />
        </div>
        <select v-model="cityFilter" class="input">
          <option value="">كل المدن</option>
          <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
        </select>
      </div>
      <p class="mt-2 text-xs text-gray-400">{{ filteredClients.length }} عميل — يظهر آخر زيارة ومن قام بها لمنع التكرار</p>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card animate-pulse"><div class="h-12 rounded bg-gray-200" /></div>
    </div>

    <div v-else class="space-y-2">
      <p v-if="!filteredClients.length" class="card py-8 text-center text-gray-400">لا يوجد عملاء مطابقين للبحث</p>
      <div
        v-for="client in filteredClients"
        :key="client.id"
        class="card flex items-center justify-between !py-3"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900">{{ client.name }}</span>
            <span v-for="tag in (client.tags || [])" :key="tag" class="badge bg-primary-100 text-primary-700 text-[10px]">{{ tagLabels[tag] || tag }}</span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500">
            <span v-if="client.phone" dir="ltr">{{ client.phone }}</span>
            <span v-if="client.city">{{ client.city }}</span>
            <span v-if="client.address" class="truncate max-w-[200px]">{{ client.address }}</span>
            <span v-if="client.location" class="text-green-600 flex items-center gap-0.5">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/></svg>
              GPS
            </span>
            <span v-else class="text-gray-300">بدون موقع</span>
          </div>
        </div>

        <!-- Last visit info -->
        <div class="flex items-center gap-3 mr-4 shrink-0">
          <div v-if="getLastVisit(client.id)" class="text-left min-w-[100px]">
            <p class="text-xs text-orange-600 font-medium">تمت زيارته</p>
            <p class="text-[10px] text-gray-400">{{ getVisitorName(getLastVisit(client.id)) }} — {{ timeAgo(getLastVisit(client.id).checkInTime) }}</p>
          </div>
          <div v-else class="text-left min-w-[100px]">
            <p class="text-xs text-green-600 font-medium">لم يُزَر</p>
            <p class="text-[10px] text-gray-400">متاح للزيارة</p>
          </div>
          <button
            v-if="authStore.isAdmin"
            @click="deleteClient(client.id)"
            class="text-xs text-red-500 hover:text-red-700"
          >حذف</button>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateModal = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <h2 class="mb-4 text-lg font-bold">تسجيل عميل جديد (جولة ميدانية)</h2>

          <form @submit.prevent="handleCreate" class="space-y-4">
            <div>
              <label class="label">اسم الشركة / العميل *</label>
              <input v-model="clientForm.name" class="input" required placeholder="مثال: شركة الأمل للتجارة" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">رقم الهاتف</label><input v-model="clientForm.phone" class="input" dir="ltr" placeholder="07XXXXXXXXX" /></div>
              <div><label class="label">البريد الإلكتروني</label><input v-model="clientForm.email" type="email" class="input" dir="ltr" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">المدينة</label><input v-model="clientForm.city" class="input" placeholder="بغداد" /></div>
              <div><label class="label">العنوان</label><input v-model="clientForm.address" class="input" placeholder="المنطقة، الشارع" /></div>
            </div>

            <!-- Live GPS -->
            <div>
              <label class="label">الموقع الجغرافي (تلقائي)</label>
              <div class="flex items-center gap-3 rounded-lg border p-3" :class="{
                'border-gray-200 bg-gray-50': gpsStatus === 'idle',
                'border-blue-200 bg-blue-50': gpsStatus === 'loading',
                'border-green-200 bg-green-50': gpsStatus === 'success',
                'border-red-200 bg-red-50': gpsStatus === 'error',
              }">
                <div class="h-3 w-3 rounded-full shrink-0" :class="{
                  'bg-gray-400': gpsStatus === 'idle',
                  'bg-blue-500 animate-pulse': gpsStatus === 'loading',
                  'bg-green-500': gpsStatus === 'success',
                  'bg-red-500': gpsStatus === 'error',
                }" />
                <div class="flex-1 text-sm">
                  <span v-if="gpsStatus === 'idle'" class="text-gray-500">لم يتم تحديد الموقع</span>
                  <span v-else-if="gpsStatus === 'loading'" class="text-blue-700">جاري تحديد الموقع...</span>
                  <span v-else-if="gpsStatus === 'success'" class="text-green-700">
                    تم التقاط الموقع
                    <span class="text-[10px] text-green-500 font-mono mr-1" dir="ltr">{{ clientForm.location?.[1]?.toFixed(5) }}, {{ clientForm.location?.[0]?.toFixed(5) }}</span>
                  </span>
                  <span v-else class="text-red-700">{{ gpsError || 'فشل تحديد الموقع' }}</span>
                </div>
                <button type="button" @click="captureGPS" class="btn-secondary !py-1 !px-2 text-xs">
                  {{ gpsStatus === 'success' ? 'تحديث' : 'تحديد' }}
                </button>
              </div>
            </div>

            <!-- Tags -->
            <div>
              <label class="label">التصنيف</label>
              <div class="flex flex-wrap gap-2">
                <label v-for="tag in tagOptions" :key="tag.value" class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm cursor-pointer transition-colors"
                  :class="clientForm.tags.includes(tag.value) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600'">
                  <input type="checkbox" :value="tag.value" v-model="clientForm.tags" class="hidden" />
                  {{ tag.label }}
                </label>
              </div>
            </div>

            <div><label class="label">ملاحظات</label><textarea v-model="clientForm.notes" class="input" rows="2" placeholder="ملاحظات عن العميل..." /></div>

            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="savingClient" class="btn-primary">
                {{ savingClient ? 'جاري الحفظ...' : 'تسجيل العميل' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
