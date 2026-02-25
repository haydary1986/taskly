<script setup lang="ts">
import { Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Doughnut, Bar, Line } from 'vue-chartjs'

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler)

definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const api = useApi()

const stats = ref<any>(null)
const loading = ref(true)

const roleLabel = computed(() => {
  const labels: Record<string, string> = {
    'super-admin': 'مدير عام',
    'supervisor': 'مشرف',
    'auditor': 'مراقب',
    'sales-rep': 'مندوب مبيعات',
    'programmer': 'مبرمج',
    'designer': 'مصمم',
    'social-media-manager': 'مسؤول سوشيال ميديا',
  }
  return labels[authStore.role || ''] || authStore.role
})

onMounted(async () => {
  try {
    stats.value = await api.get('/dashboard-stats')
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err)
  } finally {
    loading.value = false
  }
})

// Chart configs
const taskStatusChart = computed(() => {
  if (!stats.value?.tasksByStatus) return null
  const s = stats.value.tasksByStatus
  return {
    data: {
      labels: ['جديدة', 'قيد التنفيذ', 'مراجعة', 'مكتملة', 'ملغاة'],
      datasets: [{
        data: [s.new, s.inProgress, s.inReview || 0, s.completed, s.cancelled || 0],
        backgroundColor: ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#6B7280'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, padding: 12 } } },
      cutout: '60%',
    },
  }
})

const taskPriorityChart = computed(() => {
  if (!stats.value?.tasksByPriority) return null
  const p = stats.value.tasksByPriority
  return {
    data: {
      labels: ['عاجل', 'عالي', 'متوسط', 'منخفض'],
      datasets: [{
        data: [p.urgent, p.high, p.medium, p.low],
        backgroundColor: ['#EF4444', '#F97316', '#3B82F6', '#9CA3AF'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, padding: 12 } } },
      cutout: '60%',
    },
  }
})

const weeklyTrendChart = computed(() => {
  if (!stats.value?.weeklyTrend) return null
  const trend = stats.value.weeklyTrend
  return {
    data: {
      labels: trend.map((d: any) => d.date),
      datasets: [
        {
          label: 'مهام مكتملة',
          data: trend.map((d: any) => d.completed),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'مهام جديدة',
          data: trend.map((d: any) => d.created),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' } } } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'IBM Plex Sans Arabic' } } },
        x: { ticks: { font: { family: 'IBM Plex Sans Arabic' } } },
      },
    },
  }
})

const taskTypeChart = computed(() => {
  if (!stats.value?.tasksByType) return null
  const t = stats.value.tasksByType
  return {
    data: {
      labels: ['برمجة', 'زيارة ميدانية', 'تصميم', 'عام'],
      datasets: [{
        label: 'المهام',
        data: [t.programming, t.fieldVisit, t.design, t.general],
        backgroundColor: ['#6366F1', '#F59E0B', '#EC4899', '#8B5CF6'],
        borderRadius: 6,
        barThickness: 32,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'IBM Plex Sans Arabic' } } },
        y: { ticks: { font: { family: 'IBM Plex Sans Arabic' } } },
      },
    },
  }
})

const projectStatusChart = computed(() => {
  if (!stats.value?.projectsByStatus) return null
  const p = stats.value.projectsByStatus
  return {
    data: {
      labels: ['تخطيط', 'نشط', 'معلق', 'مكتمل'],
      datasets: [{
        data: [p.planning, p.active, p.onHold, p.completed],
        backgroundColor: ['#6366F1', '#10B981', '#F59E0B', '#3B82F6'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, padding: 12 } } },
      cutout: '60%',
    },
  }
})

// My tasks chart for employees
const myTasksChart = computed(() => {
  if (!stats.value?.myTasks) return null
  const m = stats.value.myTasks
  return {
    data: {
      labels: ['جديدة', 'قيد التنفيذ', 'مراجعة', 'مكتملة'],
      datasets: [{
        data: [m.new, m.inProgress, m.inReview || 0, m.completed],
        backgroundColor: ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, padding: 12 } } },
      cutout: '60%',
    },
  }
})

const statusLabel: Record<string, string> = {
  new: 'جديدة',
  'in-progress': 'قيد التنفيذ',
  'in-review': 'مراجعة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

const priorityLabel: Record<string, string> = {
  urgent: 'عاجل',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
}
</script>

<template>
  <div>
    <!-- Welcome header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">
        مرحباً، {{ authStore.user?.name }}
      </h1>
      <p class="mt-1 text-gray-500">{{ roleLabel }} - لوحة التحكم</p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="card animate-pulse">
        <div class="h-4 w-24 rounded bg-gray-200" />
        <div class="mt-3 h-8 w-16 rounded bg-gray-200" />
      </div>
    </div>

    <!-- Dashboard content -->
    <div v-else-if="stats" class="space-y-6">

      <!-- ===== ADMIN DASHBOARD ===== -->
      <template v-if="authStore.isAdmin">
        <!-- Summary cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">الموظفون النشطون</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.activeEmployees || 0 }}</p>
            </div>
          </div>

          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100">
              <svg class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">المهام النشطة</p>
              <p class="text-2xl font-bold text-primary-600">{{ stats.activeTasks || 0 }}</p>
            </div>
          </div>

          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-100">
              <svg class="h-6 w-6 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">المشاريع النشطة</p>
              <p class="text-2xl font-bold text-accent-600">{{ stats.activeProjects || 0 }}</p>
            </div>
          </div>

          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100">
              <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">مكتملة</p>
              <p class="text-2xl font-bold text-green-600">{{ stats.tasksByStatus?.completed || 0 }}</p>
            </div>
          </div>

          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100">
              <svg class="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">زيارات اليوم</p>
              <p class="text-2xl font-bold text-orange-600">{{ stats.visitsToday || 0 }}</p>
            </div>
          </div>
        </div>

        <!-- Charts row 1 -->
        <div class="grid gap-4 lg:grid-cols-3">
          <!-- Task status doughnut -->
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">توزيع المهام حسب الحالة</h3>
            <div v-if="taskStatusChart" class="h-64">
              <Doughnut :data="taskStatusChart.data" :options="taskStatusChart.options" />
            </div>
          </div>

          <!-- Priority doughnut -->
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">المهام حسب الأولوية</h3>
            <div v-if="taskPriorityChart" class="h-64">
              <Doughnut :data="taskPriorityChart.data" :options="taskPriorityChart.options" />
            </div>
          </div>

          <!-- Project status -->
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">حالة المشاريع</h3>
            <div v-if="projectStatusChart" class="h-64">
              <Doughnut :data="projectStatusChart.data" :options="projectStatusChart.options" />
            </div>
          </div>
        </div>

        <!-- Charts row 2 -->
        <div class="grid gap-4 lg:grid-cols-2">
          <!-- Weekly trend line chart -->
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">الأداء الأسبوعي</h3>
            <div v-if="weeklyTrendChart" class="h-64">
              <Line :data="weeklyTrendChart.data" :options="weeklyTrendChart.options" />
            </div>
          </div>

          <!-- Task type bar chart -->
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">المهام حسب النوع</h3>
            <div v-if="taskTypeChart" class="h-64">
              <Bar :data="taskTypeChart.data" :options="taskTypeChart.options" />
            </div>
          </div>
        </div>

        <!-- Top performers + Recent tasks -->
        <div class="grid gap-4 lg:grid-cols-2">
          <!-- Top performers -->
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">أفضل الموظفين هذا الشهر</h3>
            <div v-if="stats.topPerformers?.length" class="space-y-3">
              <div
                v-for="(p, idx) in stats.topPerformers"
                :key="idx"
                class="flex items-center gap-3"
              >
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  :class="idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-gray-300'"
                >
                  {{ Number(idx) + 1 }}
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-gray-900">{{ p.name }}</p>
                </div>
                <span class="text-sm font-bold text-green-600">{{ p.count }} مهمة</span>
              </div>
            </div>
            <p v-else class="py-6 text-center text-sm text-gray-400">لا توجد بيانات</p>
          </div>

          <!-- Recent tasks -->
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">آخر المهام</h3>
            <div v-if="stats.recentTasks?.length" class="divide-y divide-gray-100">
              <div
                v-for="task in stats.recentTasks.slice(0, 7)"
                :key="task.id"
                class="flex items-center justify-between py-2.5"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="badge"
                    :class="{
                      'badge-new': task.status === 'new',
                      'badge-in-progress': task.status === 'in-progress',
                      'badge-in-review': task.status === 'in-review',
                      'badge-completed': task.status === 'completed',
                      'badge-cancelled': task.status === 'cancelled',
                    }"
                  >
                    {{ statusLabel[task.status] || task.status }}
                  </span>
                  <NuxtLink :to="`/tasks/${task.id}`" class="truncate text-sm font-medium text-gray-900 hover:text-primary-600">
                    {{ task.title }}
                  </NuxtLink>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500 shrink-0 mr-2">
                  <span v-if="task.assignee?.name">{{ task.assignee.name }}</span>
                  <span
                    class="badge"
                    :class="{
                      'badge-urgent': task.priority === 'urgent',
                      'badge-high': task.priority === 'high',
                      'badge-medium': task.priority === 'medium',
                      'badge-low': task.priority === 'low',
                    }"
                  >
                    {{ priorityLabel[task.priority] || task.priority }}
                  </span>
                </div>
              </div>
            </div>
            <p v-else class="py-8 text-center text-sm text-gray-400">لا توجد مهام حتى الآن</p>
          </div>
        </div>
      </template>

      <!-- ===== EMPLOYEE DASHBOARD ===== -->
      <template v-else-if="stats.myTasks">
        <!-- Summary cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <svg class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">إجمالي مهامي</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.myTasks.total || 0 }}</p>
            </div>
          </div>
          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">مهام جديدة</p>
              <p class="text-2xl font-bold text-blue-600">{{ stats.myTasks.new || 0 }}</p>
            </div>
          </div>
          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-yellow-100">
              <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">قيد التنفيذ</p>
              <p class="text-2xl font-bold text-yellow-600">{{ stats.myTasks.inProgress || 0 }}</p>
            </div>
          </div>
          <div class="card flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100">
              <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">مكتملة</p>
              <p class="text-2xl font-bold text-green-600">{{ stats.myTasks.completed || 0 }}</p>
            </div>
          </div>
        </div>

        <!-- Overdue warning -->
        <div v-if="stats.overdueTasks > 0" class="rounded-lg border border-red-200 bg-red-50 p-4">
          <div class="flex items-center gap-2">
            <svg class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span class="text-sm font-medium text-red-700">لديك {{ stats.overdueTasks }} مهام متأخرة!</span>
          </div>
        </div>

        <!-- Charts -->
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">توزيع مهامي</h3>
            <div v-if="myTasksChart" class="h-64">
              <Doughnut :data="myTasksChart.data" :options="myTasksChart.options" />
            </div>
          </div>

          <!-- Recent tasks -->
          <div class="card">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">آخر المهام</h3>
            <div v-if="stats.recentTasks?.length" class="divide-y divide-gray-100">
              <div
                v-for="task in stats.recentTasks.slice(0, 7)"
                :key="task.id"
                class="flex items-center justify-between py-2.5"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span
                    class="badge"
                    :class="{
                      'badge-new': task.status === 'new',
                      'badge-in-progress': task.status === 'in-progress',
                      'badge-in-review': task.status === 'in-review',
                      'badge-completed': task.status === 'completed',
                      'badge-cancelled': task.status === 'cancelled',
                    }"
                  >
                    {{ statusLabel[task.status] || task.status }}
                  </span>
                  <NuxtLink :to="`/tasks/${task.id}`" class="truncate text-sm font-medium text-gray-900 hover:text-primary-600">
                    {{ task.title }}
                  </NuxtLink>
                </div>
                <span
                  class="badge shrink-0 mr-2"
                  :class="{
                    'badge-urgent': task.priority === 'urgent',
                    'badge-high': task.priority === 'high',
                    'badge-medium': task.priority === 'medium',
                    'badge-low': task.priority === 'low',
                  }"
                >
                  {{ priorityLabel[task.priority] || task.priority }}
                </span>
              </div>
            </div>
            <p v-else class="py-8 text-center text-sm text-gray-400">لا توجد مهام حتى الآن</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
