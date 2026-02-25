<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const api = useApi()
const authStore = useAuthStore()

const tasks = ref<any[]>([])
const loading = ref(true)
const dragging = ref<string | null>(null)
const dragOverColumn = ref<string | null>(null)
const filterProject = ref('')
const filterAssignee = ref('')
const projects = ref<any[]>([])
const users = ref<any[]>([])

const columns = [
  { key: 'new', label: 'جديدة', color: 'bg-blue-500', bgLight: 'bg-blue-50 border-blue-200' },
  { key: 'in-progress', label: 'قيد التنفيذ', color: 'bg-yellow-500', bgLight: 'bg-yellow-50 border-yellow-200' },
  { key: 'in-review', label: 'مراجعة', color: 'bg-purple-500', bgLight: 'bg-purple-50 border-purple-200' },
  { key: 'completed', label: 'مكتملة', color: 'bg-green-500', bgLight: 'bg-green-50 border-green-200' },
]

const priorityColors: Record<string, string> = {
  urgent: 'border-r-red-500',
  high: 'border-r-orange-500',
  medium: 'border-r-blue-500',
  low: 'border-r-gray-300',
}

const priorityLabels: Record<string, string> = {
  urgent: 'عاجل', high: 'عالي', medium: 'متوسط', low: 'منخفض',
}

const typeLabels: Record<string, string> = {
  programming: 'برمجة', 'field-visit': 'زيارة', design: 'تصميم', general: 'عام',
}

const filteredTasks = computed(() => {
  return tasks.value.filter((t) => {
    if (filterProject.value) {
      const pid = typeof t.project === 'object' ? t.project?.id : t.project
      if (pid !== filterProject.value) return false
    }
    if (filterAssignee.value) {
      const aid = typeof t.assignee === 'object' ? t.assignee?.id : t.assignee
      if (aid !== filterAssignee.value) return false
    }
    return true
  })
})

function getColumnTasks(status: string) {
  return filteredTasks.value.filter((t) => t.status === status)
}

onMounted(async () => {
  try {
    const [tasksRes, projectsRes, usersRes] = await Promise.all([
      api.get('/tasks?limit=500&depth=1&sort=-updatedAt&where[status][not_equals]=cancelled'),
      api.get('/projects?limit=100&depth=0'),
      authStore.isAdmin ? api.get('/users?where[isActive][equals]=true&limit=100&depth=0') : Promise.resolve({ docs: [] }),
    ])
    tasks.value = tasksRes.docs || []
    projects.value = projectsRes.docs || []
    users.value = usersRes.docs || []
  } catch (err) {
    console.error('Failed to load kanban:', err)
  } finally {
    loading.value = false
  }
})

// Drag and drop
function onDragStart(e: DragEvent, taskId: string) {
  dragging.value = taskId
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }
}

function onDragOver(e: DragEvent, status: string) {
  e.preventDefault()
  dragOverColumn.value = status
}

function onDragLeave() {
  dragOverColumn.value = null
}

async function onDrop(e: DragEvent, newStatus: string) {
  e.preventDefault()
  dragOverColumn.value = null
  const taskId = dragging.value
  dragging.value = null
  if (!taskId) return

  const task = tasks.value.find((t) => t.id === taskId)
  if (!task || task.status === newStatus) return

  // Optimistic update
  task.status = newStatus

  try {
    await api.patch(`/tasks/${taskId}`, { status: newStatus })
  } catch (err) {
    console.error('Failed to update task status:', err)
    // Revert
    const res = await api.get(`/tasks/${taskId}?depth=1`)
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx >= 0) tasks.value[idx] = res
  }
}

function isOverdue(task: any) {
  return task.dueDate && new Date(task.dueDate) < new Date() && !['completed', 'cancelled'].includes(task.status)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-gray-900">لوحة كانبان</h1>
      <div class="flex gap-2">
        <select v-if="projects.length" v-model="filterProject" class="input w-40 text-xs">
          <option value="">كل المشاريع</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <select v-if="users.length" v-model="filterAssignee" class="input w-40 text-xs">
          <option value="">كل الموظفين</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-4 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="card animate-pulse h-96" />
    </div>

    <!-- Kanban board -->
    <div v-else class="grid gap-4 lg:grid-cols-4" style="min-height: 70vh">
      <div
        v-for="col in columns"
        :key="col.key"
        class="flex flex-col rounded-xl border-2 transition-colors"
        :class="dragOverColumn === col.key ? 'border-primary-400 bg-primary-50/50' : 'border-gray-200 bg-gray-50/50'"
        @dragover="onDragOver($event, col.key)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, col.key)"
      >
        <!-- Column header -->
        <div class="flex items-center gap-2 px-3 py-3">
          <div class="h-3 w-3 rounded-full" :class="col.color" />
          <h3 class="text-sm font-semibold text-gray-700">{{ col.label }}</h3>
          <span class="mr-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
            {{ getColumnTasks(col.key).length }}
          </span>
        </div>

        <!-- Tasks -->
        <div class="flex-1 space-y-2 overflow-y-auto px-2 pb-2" style="max-height: 65vh">
          <div
            v-for="task in getColumnTasks(col.key)"
            :key="task.id"
            draggable="true"
            @dragstart="onDragStart($event, task.id)"
            class="cursor-grab rounded-lg border-r-4 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
            :class="[priorityColors[task.priority] || 'border-r-gray-200', dragging === task.id ? 'opacity-50' : '']"
          >
            <NuxtLink :to="`/tasks/${task.id}`" class="block">
              <h4 class="text-sm font-medium text-gray-900 leading-snug">{{ task.title }}</h4>
              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{{ typeLabels[task.type] || task.type }}</span>
                <span
                  class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                  :class="{
                    'bg-red-100 text-red-700': task.priority === 'urgent',
                    'bg-orange-100 text-orange-700': task.priority === 'high',
                    'bg-blue-100 text-blue-700': task.priority === 'medium',
                    'bg-gray-100 text-gray-600': task.priority === 'low',
                  }"
                >{{ priorityLabels[task.priority] }}</span>
                <span v-if="isOverdue(task)" class="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600 font-medium">متأخرة</span>
              </div>
              <div class="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                <span v-if="task.assignee?.name">{{ task.assignee.name }}</span>
                <span v-if="task.dueDate">{{ new Date(task.dueDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) }}</span>
              </div>
              <div v-if="task.project" class="mt-1.5">
                <span class="text-[10px] text-primary-600">{{ typeof task.project === 'object' ? task.project.name : '' }}</span>
              </div>
            </NuxtLink>
          </div>

          <!-- Empty state -->
          <div v-if="getColumnTasks(col.key).length === 0" class="flex items-center justify-center py-8 text-xs text-gray-400">
            لا توجد مهام
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
