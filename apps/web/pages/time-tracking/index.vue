<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'تتبع الوقت' })

const api = useApi()
const authStore = useAuthStore()

const entries = ref<any[]>([])
const tasks = ref<any[]>([])
const loading = ref(true)
const activeTimer = ref<any>(null)
const elapsedSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

const selectedTask = ref('')

onMounted(async () => {
  const [entriesRes, tasksRes] = await Promise.all([
    api.get('/time-entries', { query: { sort: '-startTime', limit: 50, depth: 1 } }),
    api.get('/tasks', { query: { where: { assignee: { equals: authStore.user?.id }, status: { not_equals: 'completed' } }, limit: 100 } }),
  ])
  entries.value = entriesRes.docs
  tasks.value = tasksRes.docs
  loading.value = false

  // Check for running timer
  const running = entries.value.find((e) => e.isRunning)
  if (running) {
    activeTimer.value = running
    const start = new Date(running.startTime).getTime()
    elapsedSeconds.value = Math.floor((Date.now() - start) / 1000)
    startInterval()
  }
})

onUnmounted(() => { if (timerInterval) clearInterval(timerInterval) })

function startInterval() {
  timerInterval = setInterval(() => { elapsedSeconds.value++ }, 1000)
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}س ${m}د` : `${m}د`
}

async function startTimer() {
  if (!selectedTask.value) { alert('اختر مهمة أولاً'); return }
  try {
    const res = await api.post('/time-entries', {
      task: selectedTask.value,
      startTime: new Date().toISOString(),
      isRunning: true,
    })
    activeTimer.value = res.doc
    entries.value.unshift(res.doc)
    elapsedSeconds.value = 0
    startInterval()
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ') }
}

async function stopTimer() {
  if (!activeTimer.value) return
  try {
    const res = await api.patch(`/time-entries/${activeTimer.value.id}`, {
      endTime: new Date().toISOString(),
      isRunning: false,
    })
    const idx = entries.value.findIndex((e) => e.id === activeTimer.value.id)
    if (idx !== -1) entries.value[idx] = res.doc
    activeTimer.value = null
    elapsedSeconds.value = 0
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ') }
}

const totalToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return entries.value
    .filter((e) => e.startTime?.startsWith(today) && e.duration)
    .reduce((sum, e) => sum + e.duration, 0)
})
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-900">تتبع الوقت</h1>

    <!-- Active timer -->
    <div class="card mb-6">
      <div v-if="activeTimer" class="text-center">
        <p class="text-sm text-gray-500">جاري تسجيل الوقت على: {{ typeof activeTimer.task === 'object' ? activeTimer.task.title : activeTimer.task }}</p>
        <p class="my-4 font-mono text-5xl font-bold text-primary-600" dir="ltr">{{ formatTime(elapsedSeconds) }}</p>
        <button @click="stopTimer" class="btn-danger">إيقاف</button>
      </div>
      <div v-else>
        <div class="flex gap-3">
          <select v-model="selectedTask" class="input flex-1">
            <option value="">-- اختر مهمة --</option>
            <option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.title }}</option>
          </select>
          <button @click="startTimer" class="btn-primary">بدء التسجيل</button>
        </div>
      </div>
    </div>

    <!-- Today summary -->
    <div class="card mb-6">
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-500">إجمالي اليوم</span>
        <span class="text-lg font-bold text-primary-600">{{ formatDuration(totalToday) }}</span>
      </div>
    </div>

    <!-- Entries list -->
    <div class="card !p-0">
      <h3 class="border-b px-4 py-3 font-semibold">سجل الأوقات</h3>
      <div class="divide-y divide-gray-100">
        <div v-if="loading" class="px-4 py-8 text-center text-gray-400">جاري التحميل...</div>
        <div v-else-if="!entries.length" class="px-4 py-8 text-center text-gray-400">لا توجد سجلات</div>
        <div v-for="entry in entries" :key="entry.id" class="flex items-center justify-between px-4 py-3">
          <div>
            <p class="text-sm font-medium">{{ typeof entry.task === 'object' ? entry.task.title : 'مهمة' }}</p>
            <p class="text-xs text-gray-400">{{ new Date(entry.startTime).toLocaleString('ar-SA') }}</p>
          </div>
          <div class="text-left">
            <span v-if="entry.isRunning" class="badge bg-green-100 text-green-700 animate-pulse">قيد التسجيل</span>
            <span v-else-if="entry.duration" class="font-mono text-sm font-medium" dir="ltr">{{ formatDuration(entry.duration) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
