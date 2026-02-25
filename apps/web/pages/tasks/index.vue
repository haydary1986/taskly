<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'إدارة المهام' })

const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()
const api = useApi()

const showCreateModal = ref(false)
const editingTask = ref<any>(null)

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

const typeLabels: Record<string, string> = {
  programming: 'برمجة',
  'field-visit': 'زيارة ميدانية',
  design: 'تصميم',
  general: 'عام',
}

// Filter state
const filterStatus = ref('')
const filterPriority = ref('')
const filterType = ref('')

// Task form
const taskForm = reactive({
  title: '',
  type: 'general',
  priority: 'medium',
  status: 'new',
  assignee: '',
  project: '',
  dueDate: '',
  description: '',
})

// Users list for assignment
const users = ref<any[]>([])

onMounted(async () => {
  await Promise.all([
    tasksStore.fetchTasks(),
    projectsStore.fetchProjects(),
    fetchUsers(),
  ])
})

async function fetchUsers() {
  try {
    const res = await api.get('/users', { query: { limit: 100, where: { isActive: { equals: true } } } })
    users.value = res.docs
  } catch (err) {
    console.error('Failed to fetch users:', err)
  }
}

function applyFilters() {
  tasksStore.setFilters({
    status: filterStatus.value || undefined,
    priority: filterPriority.value || undefined,
    type: filterType.value || undefined,
  })
  tasksStore.fetchTasks()
}

function resetForm() {
  Object.assign(taskForm, {
    title: '',
    type: 'general',
    priority: 'medium',
    status: 'new',
    assignee: '',
    project: '',
    dueDate: '',
    description: '',
  })
  editingTask.value = null
}

function openEdit(task: any) {
  editingTask.value = task
  Object.assign(taskForm, {
    title: task.title,
    type: task.type,
    priority: task.priority,
    status: task.status,
    assignee: typeof task.assignee === 'object' ? task.assignee?.id : task.assignee || '',
    project: typeof task.project === 'object' ? task.project?.id : task.project || '',
    dueDate: task.dueDate?.split('T')[0] || '',
    description: '',
  })
  showCreateModal.value = true
}

async function handleSubmit() {
  const data: any = {
    title: taskForm.title,
    type: taskForm.type,
    priority: taskForm.priority,
    status: taskForm.status,
    assignee: taskForm.assignee || null,
    project: taskForm.project || null,
    dueDate: taskForm.dueDate || null,
  }

  if (editingTask.value) {
    await tasksStore.updateTask(editingTask.value.id, data)
  } else {
    await tasksStore.createTask(data)
  }

  showCreateModal.value = false
  resetForm()
  tasksStore.fetchTasks()
}

async function handleDelete(id: string) {
  if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
    await tasksStore.deleteTask(id)
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">إدارة المهام</h1>
      <button @click="showCreateModal = true; resetForm()" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        مهمة جديدة
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <select v-model="filterStatus" @change="applyFilters" class="input">
          <option value="">كل الحالات</option>
          <option v-for="(label, value) in statusLabels" :key="value" :value="value">{{ label }}</option>
        </select>
        <select v-model="filterPriority" @change="applyFilters" class="input">
          <option value="">كل الأولويات</option>
          <option v-for="(label, value) in priorityLabels" :key="value" :value="value">{{ label }}</option>
        </select>
        <select v-model="filterType" @change="applyFilters" class="input">
          <option value="">كل الأنواع</option>
          <option v-for="(label, value) in typeLabels" :key="value" :value="value">{{ label }}</option>
        </select>
        <button @click="filterStatus = ''; filterPriority = ''; filterType = ''; applyFilters()" class="btn-secondary">
          إعادة تعيين
        </button>
      </div>
    </div>

    <!-- Tasks list -->
    <div v-if="tasksStore.loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card animate-pulse">
        <div class="h-4 w-48 rounded bg-gray-200" />
        <div class="mt-2 h-3 w-32 rounded bg-gray-200" />
      </div>
    </div>

    <div v-else-if="tasksStore.tasks.length" class="space-y-3">
      <div
        v-for="task in tasksStore.tasks"
        :key="task.id"
        class="card cursor-pointer transition-shadow hover:shadow-md"
        @click="openEdit(task)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-medium text-gray-900">{{ task.title }}</h3>
              <span
                class="badge"
                :class="`badge-${task.status}`"
              >
                {{ statusLabels[task.status] }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span class="flex items-center gap-1">
                <span class="badge" :class="`badge-${task.priority}`">
                  {{ priorityLabels[task.priority] }}
                </span>
              </span>
              <span>{{ typeLabels[task.type] }}</span>
              <span v-if="task.assignee && typeof task.assignee === 'object'">
                {{ task.assignee.name }}
              </span>
              <span v-if="task.project && typeof task.project === 'object'">
                {{ task.project.name }}
              </span>
              <span v-if="task.dueDate">
                {{ new Date(task.dueDate).toLocaleDateString('ar-SA') }}
              </span>
            </div>
          </div>
          <button
            @click.stop="handleDelete(task.id)"
            class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-else class="card py-12 text-center">
      <p class="text-gray-400">لا توجد مهام</p>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showCreateModal = false"
      >
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold text-gray-900">
            {{ editingTask ? 'تعديل المهمة' : 'مهمة جديدة' }}
          </h2>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="label">عنوان المهمة</label>
              <input v-model="taskForm.title" type="text" class="input" required />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">النوع</label>
                <select v-model="taskForm.type" class="input">
                  <option v-for="(label, value) in typeLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="label">الأولوية</label>
                <select v-model="taskForm.priority" class="input">
                  <option v-for="(label, value) in priorityLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">الحالة</label>
                <select v-model="taskForm.status" class="input">
                  <option v-for="(label, value) in statusLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="label">تاريخ الاستحقاق</label>
                <input v-model="taskForm.dueDate" type="date" class="input" dir="ltr" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">تعيين إلى</label>
                <select v-model="taskForm.assignee" class="input">
                  <option value="">-- اختر موظف --</option>
                  <option v-for="user in users" :key="user.id" :value="user.id">
                    {{ user.name }}
                  </option>
                </select>
              </div>
              <div>
                <label class="label">المشروع</label>
                <select v-model="taskForm.project" class="input">
                  <option value="">-- بدون مشروع --</option>
                  <option v-for="project in projectsStore.projects" :key="project.id" :value="project.id">
                    {{ project.name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="flex justify-end gap-3">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" class="btn-primary">
                {{ editingTask ? 'حفظ التعديلات' : 'إنشاء المهمة' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
