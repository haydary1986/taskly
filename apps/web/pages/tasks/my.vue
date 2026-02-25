<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'مهامي' })

const authStore = useAuthStore()
const api = useApi()

const tasks = ref<any[]>([])
const loading = ref(true)
const activeTab = ref('all')

const statusLabels: Record<string, string> = {
  new: 'جديدة',
  'in-progress': 'قيد التنفيذ',
  'in-review': 'قيد المراجعة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

const priorityLabels: Record<string, string> = {
  urgent: 'عاجل',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
}

const filteredTasks = computed(() => {
  if (activeTab.value === 'all') return tasks.value
  return tasks.value.filter((t) => t.status === activeTab.value)
})

const tabs = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديدة' },
  { key: 'in-progress', label: 'قيد التنفيذ' },
  { key: 'in-review', label: 'مراجعة' },
  { key: 'completed', label: 'مكتملة' },
]

onMounted(fetchMyTasks)

async function fetchMyTasks() {
  loading.value = true
  try {
    const res = await api.get('/tasks', {
      query: {
        where: { assignee: { equals: authStore.user?.id } },
        sort: '-createdAt',
        limit: 50,
        depth: 1,
      },
    })
    tasks.value = res.docs
  } catch (err) {
    console.error('Failed to fetch my tasks:', err)
  } finally {
    loading.value = false
  }
}

async function updateStatus(taskId: string, newStatus: string) {
  try {
    await api.patch(`/tasks/${taskId}`, { status: newStatus })
    const task = tasks.value.find((t) => t.id === taskId)
    if (task) task.status = newStatus
  } catch (err) {
    console.error('Failed to update task status:', err)
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-gray-900">مهامي</h1>

    <!-- Tabs -->
    <div class="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activeTab === tab.key
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        "
      >
        {{ tab.label }}
        <span
          v-if="tab.key !== 'all'"
          class="mr-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs"
        >
          {{ tasks.filter((t) => t.status === tab.key).length }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card animate-pulse">
        <div class="h-4 w-48 rounded bg-gray-200" />
        <div class="mt-2 h-3 w-32 rounded bg-gray-200" />
      </div>
    </div>

    <!-- Tasks list -->
    <div v-else-if="filteredTasks.length" class="space-y-3">
      <div v-for="task in filteredTasks" :key="task.id" class="card">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-medium text-gray-900">{{ task.title }}</h3>
              <span class="badge" :class="`badge-${task.priority}`">
                {{ priorityLabels[task.priority] }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span v-if="task.project && typeof task.project === 'object'">
                {{ task.project.name }}
              </span>
              <span v-if="task.dueDate">
                {{ new Date(task.dueDate).toLocaleDateString('ar-SA') }}
              </span>
            </div>
          </div>

          <!-- Status actions -->
          <div class="flex gap-2">
            <select
              :value="task.status"
              @change="updateStatus(task.id, ($event.target as HTMLSelectElement).value)"
              class="input !w-auto !py-1.5 text-xs"
            >
              <option v-for="(label, value) in statusLabels" :key="value" :value="value">
                {{ label }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card py-12 text-center">
      <p class="text-gray-400">
        {{ activeTab === 'all' ? 'لا توجد مهام مسندة إليك' : 'لا توجد مهام في هذه الحالة' }}
      </p>
    </div>
  </div>
</template>
