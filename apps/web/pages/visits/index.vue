<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'سجل الزيارات' })

const api = useApi()
const authStore = useAuthStore()

const visits = ref<any[]>([])
const loading = ref(true)
const dateFilter = ref('')
const repFilter = ref('')
const users = ref<any[]>([])

const statusLabels: Record<string, string> = { 'checked-in': 'تم الدخول', 'checked-out': 'تم الخروج', cancelled: 'ملغاة' }

// If sales-rep, show "my visits" view
const isMyVisits = computed(() => !authStore.isAdmin)

onMounted(async () => {
  await Promise.all([fetchVisits(), authStore.isAdmin ? fetchUsers() : Promise.resolve()])
})

async function fetchUsers() {
  const res = await api.get('/users', { query: { limit: 100, where: { role: { equals: 'sales-rep' } } } })
  users.value = res.docs
}

async function fetchVisits() {
  loading.value = true
  try {
    const where: Record<string, any> = {}
    if (dateFilter.value) {
      const start = new Date(dateFilter.value)
      const end = new Date(dateFilter.value)
      end.setDate(end.getDate() + 1)
      where.checkInTime = { greater_than: start.toISOString(), less_than: end.toISOString() }
    }
    if (repFilter.value) where.representative = { equals: repFilter.value }

    const res = await api.get('/visits', { query: { where, sort: '-checkInTime', limit: 100, depth: 1 } })
    visits.value = res.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

watch([dateFilter, repFilter], fetchVisits)
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-gray-900">{{ isMyVisits ? 'زياراتي' : 'سجل الزيارات' }}</h1>

    <div v-if="authStore.isAdmin" class="card mb-6">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <input v-model="dateFilter" type="date" class="input" dir="ltr" />
        <select v-model="repFilter" class="input">
          <option value="">كل المندوبين</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
        <div class="flex items-center text-sm text-gray-500">{{ visits.length }} زيارة</div>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card animate-pulse"><div class="h-4 w-48 rounded bg-gray-200" /></div>
    </div>

    <div v-else-if="visits.length" class="space-y-3">
      <div v-for="visit in visits" :key="visit.id" class="card">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-medium text-gray-900">{{ visit.client?.name || 'عميل غير معروف' }}</h3>
              <span class="badge" :class="{ 'bg-green-100 text-green-700': visit.status === 'checked-out', 'bg-blue-100 text-blue-700': visit.status === 'checked-in', 'bg-red-100 text-red-700': visit.status === 'cancelled' }">
                {{ statusLabels[visit.status] }}
              </span>
              <span v-if="!visit.isValid" class="badge bg-red-100 text-red-700">غير صالحة</span>
            </div>
            <div class="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
              <span v-if="visit.representative?.name">{{ visit.representative.name }}</span>
              <span>{{ new Date(visit.checkInTime).toLocaleString('ar-SA') }}</span>
              <span v-if="visit.checkOutTime">← {{ new Date(visit.checkOutTime).toLocaleString('ar-SA') }}</span>
              <span v-if="visit.distance">{{ visit.distance }}م</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="card py-12 text-center"><p class="text-gray-400">لا توجد زيارات</p></div>
  </div>
</template>
