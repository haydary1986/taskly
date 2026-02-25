<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'مؤشرات الأداء' })

const api = useApi()
const activeTab = ref('sales')
const stats = ref<any>(null)
const loading = ref(true)

onMounted(() => fetchKPI())

async function fetchKPI() {
  loading.value = true
  try {
    stats.value = await api.get('/kpi', { query: { tab: activeTab.value } })
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

watch(activeTab, fetchKPI)
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-gray-900">مؤشرات الأداء (KPI)</h1>

    <!-- Tabs -->
    <div class="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      <button @click="activeTab = 'sales'" class="rounded-md px-6 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'sales' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'">مؤشرات المبيعات</button>
      <button @click="activeTab = 'programmers'" class="rounded-md px-6 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'programmers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'">مؤشرات المبرمجين</button>
    </div>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-3">
      <div v-for="i in 3" :key="i" class="card animate-pulse"><div class="h-16 rounded bg-gray-200" /></div>
    </div>

    <div v-else-if="stats" class="space-y-6">
      <!-- Sales KPIs -->
      <template v-if="activeTab === 'sales'">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="card text-center"><p class="text-3xl font-bold text-primary-600">{{ stats.todayVisits }}</p><p class="text-sm text-gray-500">زيارات اليوم</p></div>
          <div class="card text-center"><p class="text-3xl font-bold text-accent-600">{{ stats.weekVisits }}</p><p class="text-sm text-gray-500">زيارات الأسبوع</p></div>
          <div class="card text-center"><p class="text-3xl font-bold text-yellow-600">{{ stats.monthVisits }}</p><p class="text-sm text-gray-500">زيارات الشهر</p></div>
          <div class="card text-center"><p class="text-3xl font-bold text-gray-900">{{ stats.totalClients }}</p><p class="text-sm text-gray-500">إجمالي العملاء</p></div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="card text-center"><p class="text-2xl font-bold text-green-600">{{ stats.newClientsThisMonth }}</p><p class="text-sm text-gray-500">عملاء جدد هذا الشهر</p></div>
          <div class="card text-center"><p class="text-2xl font-bold text-blue-600">{{ stats.totalReps }}</p><p class="text-sm text-gray-500">عدد المندوبين</p></div>
        </div>
      </template>

      <!-- Programmer KPIs -->
      <template v-else>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="card text-center"><p class="text-3xl font-bold text-primary-600">{{ stats.completedTasksThisMonth }}</p><p class="text-sm text-gray-500">مهام مكتملة هذا الشهر</p></div>
          <div class="card text-center"><p class="text-3xl font-bold text-accent-600">{{ stats.totalHoursThisMonth }}</p><p class="text-sm text-gray-500">ساعات عمل هذا الشهر</p></div>
          <div class="card text-center"><p class="text-3xl font-bold text-gray-900">{{ stats.totalProgrammers }}</p><p class="text-sm text-gray-500">عدد المبرمجين</p></div>
        </div>
      </template>

      <!-- Leaderboard -->
      <div class="card">
        <h3 class="mb-4 text-lg font-semibold">ترتيب الأداء</h3>
        <div v-if="stats.leaderboard?.length" class="divide-y divide-gray-100">
          <div v-for="(entry, index) in (stats.leaderboard as any[])" :key="index" class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <span class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                :class="(index as number) < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'">{{ (index as number) + 1 }}</span>
              <span class="font-medium">{{ entry.name }}</span>
            </div>
            <div class="text-left">
              <span v-if="activeTab === 'sales'" class="font-bold text-primary-600">{{ entry.count }} زيارة</span>
              <span v-else class="text-sm"><span class="font-bold text-primary-600">{{ entry.tasks }} مهمة</span> <span class="text-gray-400">| {{ entry.hours }}س</span></span>
            </div>
          </div>
        </div>
        <p v-else class="py-8 text-center text-gray-400">لا توجد بيانات</p>
      </div>
    </div>
  </div>
</template>
