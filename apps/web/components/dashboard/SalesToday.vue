<script setup lang="ts">
interface Prospect {
  id: string
  name: string
  phone?: string | null
  city?: string | null
  priority?: string | null
  location?: unknown
}
interface TaskItem {
  id: string
  title: string
  status: string
  priority?: string | null
  dueDate?: string | null
}
interface TodayPayload {
  todayVisitsCount: number
  myProspects: Prospect[]
  availableProspectsCount: number
  availableProspects: Prospect[]
  myTasksCount: number
  myTasks: TaskItem[]
}

const api = useApi()
const data = ref<TodayPayload | null>(null)
const loading = ref(true)

async function load() {
  try {
    data.value = await api.get<TodayPayload>('/sales-today')
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)

const priorityColor: Record<string, string> = {
  A: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  C: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-white/5 dark:bg-white/5">
        <div class="h-3 w-24 rounded bg-gray-200 dark:bg-white/10" />
        <div class="mt-3 h-8 w-16 rounded bg-gray-200 dark:bg-white/10" />
      </div>
    </div>

    <template v-else-if="data">
      <!-- Stat cards -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/5 dark:bg-white/5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">زيارات اليوم</span>
            <svg class="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{{ data.todayVisitsCount }}</div>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/5 dark:bg-white/5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">شركاتي (لم تُزَر)</span>
            <svg class="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" /></svg>
          </div>
          <div class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{{ data.myProspects.length }}</div>
          <NuxtLink to="/companies?filter=mine-unvisited" class="mt-1 block text-xs text-primary-600 hover:underline">عرض كل الشركات ←</NuxtLink>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/5 dark:bg-white/5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">مهامي المفتوحة</span>
            <svg class="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /></svg>
          </div>
          <div class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{{ data.myTasksCount }}</div>
          <NuxtLink to="/tasks/my" class="mt-1 block text-xs text-primary-600 hover:underline">فتح قائمة المهام ←</NuxtLink>
        </div>
      </div>

      <!-- My prospects -->
      <div v-if="data.myProspects.length" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/5 dark:bg-white/5">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">خطوتك التالية</h3>
          <NuxtLink to="/prospects-map" class="text-xs text-primary-600 hover:underline">افتح الخريطة ←</NuxtLink>
        </div>
        <ul class="divide-y divide-gray-100 dark:divide-white/5">
          <li v-for="p in data.myProspects.slice(0, 5)" :key="p.id" class="flex items-center gap-3 py-2">
            <span v-if="p.priority" :class="priorityColor[p.priority] || priorityColor.C" class="rounded-full px-2 py-0.5 text-[10px] font-bold">{{ p.priority }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ p.name }}</p>
              <p v-if="p.city" class="text-xs text-gray-500">{{ p.city }}</p>
            </div>
            <a v-if="p.phone" :href="`tel:${p.phone}`" class="rounded-lg bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-100">📞</a>
            <NuxtLink :to="`/prospects-map?focus=${p.id}`" class="rounded-lg bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-white/10">الخريطة</NuxtLink>
          </li>
        </ul>
      </div>

      <!-- Available prospects -->
      <div v-if="data.availableProspectsCount > 0" class="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div class="mb-2 flex items-center gap-2">
          <span class="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">A</span>
          <h3 class="text-sm font-bold text-amber-900 dark:text-amber-100">
            {{ data.availableProspectsCount }} فرصة أولوية عليا متاحة
          </h3>
        </div>
        <p class="text-xs text-amber-800 dark:text-amber-200/80">
          شركات بأولوية A لم يسجّل عليها أي مندوب بعد — يمكنك اختيار أقربها.
        </p>
        <NuxtLink to="/prospects-map?owner=available&priority=A" class="mt-2 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">تصفّح القائمة</NuxtLink>
      </div>
    </template>
  </div>
</template>
