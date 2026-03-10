<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

definePageMeta({ middleware: 'auth', title: 'تقويم المهام' })

const api = useApi()
const loading = ref(true)

// Calendar state
const currentDate = ref(new Date())
const tasksByDate = ref<Record<string, any[]>>({})

const year = computed(() => currentDate.value.getFullYear())
const month = computed(() => currentDate.value.getMonth()) // 0-11
const monthName = computed(() => currentDate.value.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }))

// Computed grid
const calendarGrid = computed(() => {
  const days = []
  const firstDay = new Date(year.value, month.value, 1)
  const lastDay = new Date(year.value, month.value + 1, 0)
  
  // Get day of week for the 1st of month (0 = Sunday in system, but JS Date uses 0 = Sunday)
  // Let's standardise on week starting on Sunday (0) to Saturday (6).
  const startOffset = firstDay.getDay()
  
  // Pad previous month days
  const prevMonthLastDay = new Date(year.value, month.value, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({
      date: new Date(year.value, month.value - 1, prevMonthLastDay - i),
      isCurrentMonth: false
    })
  }
  
  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({
      date: new Date(year.value, month.value, i),
      isCurrentMonth: true
    })
  }
  
  // Pad next month days to complete the 7-col grid (up to 42 cells total for 6 rows)
  const totalCells = days.length <= 35 ? 35 : 42
  const remainingCells = totalCells - days.length
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(year.value, month.value + 1, i),
      isCurrentMonth: false
    })
  }
  
  return days
})

function prevMonth() {
  currentDate.value = new Date(year.value, month.value - 1, 1)
}

function nextMonth() {
  currentDate.value = new Date(year.value, month.value + 1, 1)
}

function setToToday() {
  currentDate.value = new Date()
}

// Convert Date to YYYY-MM-DD
function toDateString(d: Date) {
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

async function fetchCalendar() {
  loading.value = true
  try {
    // We want to fetch tasks that cover the visible grid. 
    // Start date is first cell, End date is last cell in the calendarGrid
    const grid = calendarGrid.value
    const start = toDateString(grid[0].date)
    const end = toDateString(grid[grid.length - 1].date)
    
    // API endpoint we found
    const res = await api.get(`/v1/task-calendar?start=${start}&end=${end}T23:59:59.999Z`)
    tasksByDate.value = res.calendar || {}
  } catch (err) {
    console.error('Failed to load calendar:', err)
  } finally {
    loading.value = false
  }
}

watch(currentDate, fetchCalendar, { immediate: true })

const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  high: 'border-l-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  medium: 'border-l-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  low: 'border-l-gray-400 bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-300',
}

function isToday(d: Date) {
  return toDateString(d) === toDateString(new Date())
}
</script>

<template>
  <div class="h-[calc(100vh-theme(spacing.24))] flex flex-col">
    <!-- Header -->
    <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">تقويم المهام</h1>
        
        <!-- View Toggle -->
        <div class="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <NuxtLink to="/tasks" class="rounded px-3 py-1 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm dark:text-gray-400 dark:hover:bg-gray-700 transition-all">القائمة</NuxtLink>
          <NuxtLink to="/tasks/kanban" class="rounded px-3 py-1 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm dark:text-gray-400 dark:hover:bg-gray-700 transition-all">كانبان</NuxtLink>
          <NuxtLink to="/tasks/calendar" class="rounded bg-white px-3 py-1 text-sm font-medium text-gray-900 shadow-sm dark:bg-primary-500/20 dark:text-primary-300 transition-all">التقويم</NuxtLink>
        </div>
      </div>
      
      <!-- Calendar Controls -->
      <div class="flex items-center gap-2">
        <button @click="setToToday" class="btn-secondary py-1.5 px-3 text-sm">اليوم</button>
        <div class="flex items-center rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-transparent">
          <button @click="prevMonth" class="p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="w-32 text-center text-sm font-semibold text-gray-900 dark:text-white">{{ monthName }}</span>
          <button @click="nextMonth" class="p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="card flex-1 flex flex-col p-0 overflow-hidden relative">
      
      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-[#0B0F19]/50 backdrop-blur-sm">
         <svg class="h-8 w-8 animate-spin text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>
      </div>

      <!-- Weekdays Header -->
      <div class="grid grid-cols-7 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
        <div v-for="day in weekdays" :key="day" class="p-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
          {{ day }}
        </div>
      </div>

      <!-- Days Grid -->
      <div class="grid flex-1 grid-cols-7 grid-rows-5 sm:grid-rows-6">
        <div
          v-for="(cell, i) in calendarGrid"
          :key="i"
          class="relative border-b border-l border-gray-100 p-1 sm:p-2 dark:border-white/5"
          :class="[
            !cell.isCurrentMonth && 'bg-gray-50/50 dark:bg-white/[0.02]',
            i % 7 === 6 && 'border-l-0' // remove right border on last item since RTL
          ]"
        >
          <!-- Date number -->
          <div class="flex items-start justify-between">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium"
              :class="[
                isToday(cell.date)
                  ? 'bg-primary-500 text-white'
                  : cell.isCurrentMonth
                    ? 'text-gray-900 dark:text-gray-200'
                    : 'text-gray-400 dark:text-gray-600'
              ]"
            >
              {{ cell.date.getDate() }}
            </span>
          </div>

          <!-- Tasks container -->
          <div class="mt-1 flex flex-col gap-1 overflow-y-auto max-h-[80px] sm:max-h-[120px] custom-scrollbar">
            <template v-if="tasksByDate[toDateString(cell.date)]">
              <NuxtLink
                v-for="task in tasksByDate[toDateString(cell.date)]"
                :key="task.id"
                :to="`/tasks/${task.id}`"
                target="_blank"
                class="group flex flex-col truncate rounded border-l-2 p-1 text-[10px] leading-tight transition-transform hover:scale-[1.02] sm:text-xs"
                :class="priorityColors[task.priority] || priorityColors.medium"
                :title="task.title"
              >
                <div class="font-semibold truncate">{{ task.title }}</div>
                <div class="flex items-center justify-between opacity-80 mt-0.5 hidden sm:flex">
                  <span class="truncate max-w-[60%]">{{ task.assignee || 'غير محدد' }}</span>
                  <span class="truncate max-w-[35%] font-medium" :class="task.status === 'completed' ? 'text-green-600 dark:text-green-400' : ''">
                    {{ task.status === 'completed' ? '✓' : '' }}
                  </span>
                </div>
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #334155;
}
</style>
