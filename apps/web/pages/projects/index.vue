<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'المشاريع' })

const projectsStore = useProjectsStore()
const authStore = useAuthStore()
const api = useApi()

const showCreateModal = ref(false)
const users = ref<any[]>([])

const statusLabels: Record<string, string> = {
  planning: 'تخطيط',
  active: 'نشط',
  'on-hold': 'معلق',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  'on-hold': 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

const projectForm = reactive({
  name: '',
  description: '',
  status: 'planning',
  estimatedHours: '',
  startDate: '',
  endDate: '',
  manager: '',
  members: [] as string[],
})

onMounted(async () => {
  await Promise.all([
    projectsStore.fetchProjects(),
    fetchUsers(),
  ])
})

async function fetchUsers() {
  try {
    const res = await api.get('/users', { query: { limit: 100, where: { isActive: { equals: true } } } })
    users.value = res.docs
  } catch (err) {
    console.error(err)
  }
}

function resetForm() {
  Object.assign(projectForm, {
    name: '',
    description: '',
    status: 'planning',
    estimatedHours: '',
    startDate: '',
    endDate: '',
    manager: '',
    members: [],
  })
}

async function handleSubmit() {
  await projectsStore.createProject({
    name: projectForm.name,
    description: projectForm.description,
    status: projectForm.status,
    estimatedHours: projectForm.estimatedHours ? Number(projectForm.estimatedHours) : undefined,
    startDate: projectForm.startDate || undefined,
    endDate: projectForm.endDate || undefined,
    manager: projectForm.manager || undefined,
    members: projectForm.members.length ? projectForm.members : undefined,
  } as any)

  showCreateModal.value = false
  resetForm()
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">المشاريع</h1>
      <button
        v-if="authStore.isAdmin"
        @click="showCreateModal = true; resetForm()"
        class="btn-primary"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        مشروع جديد
      </button>
    </div>

    <!-- Loading -->
    <div v-if="projectsStore.loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="card animate-pulse">
        <div class="h-5 w-32 rounded bg-gray-200" />
        <div class="mt-3 h-3 w-48 rounded bg-gray-200" />
      </div>
    </div>

    <!-- Project grid -->
    <div v-else-if="projectsStore.projects.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="project in projectsStore.projects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="card transition-shadow hover:shadow-md"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">{{ project.name }}</h3>
          <span class="badge" :class="statusColors[project.status]">
            {{ statusLabels[project.status] }}
          </span>
        </div>
        <p v-if="project.description" class="mb-3 line-clamp-2 text-sm text-gray-500">
          {{ project.description }}
        </p>
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span v-if="project.manager && typeof project.manager === 'object'">
            {{ project.manager.name }}
          </span>
          <span v-if="project.estimatedHours">{{ project.estimatedHours }} ساعة</span>
        </div>
        <div v-if="project.startDate || project.endDate" class="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <span v-if="project.startDate">{{ new Date(project.startDate).toLocaleDateString('ar-SA') }}</span>
          <span v-if="project.startDate && project.endDate">←</span>
          <span v-if="project.endDate">{{ new Date(project.endDate).toLocaleDateString('ar-SA') }}</span>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="card py-12 text-center">
      <p class="text-gray-400">لا توجد مشاريع</p>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showCreateModal = false"
      >
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold text-gray-900">مشروع جديد</h2>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="label">اسم المشروع</label>
              <input v-model="projectForm.name" type="text" class="input" required />
            </div>

            <div>
              <label class="label">الوصف</label>
              <textarea v-model="projectForm.description" class="input" rows="3" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">الحالة</label>
                <select v-model="projectForm.status" class="input">
                  <option v-for="(label, value) in statusLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="label">الساعات المقدرة</label>
                <input v-model="projectForm.estimatedHours" type="number" class="input" min="0" dir="ltr" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">تاريخ البداية</label>
                <input v-model="projectForm.startDate" type="date" class="input" dir="ltr" />
              </div>
              <div>
                <label class="label">تاريخ النهاية</label>
                <input v-model="projectForm.endDate" type="date" class="input" dir="ltr" />
              </div>
            </div>

            <div>
              <label class="label">مدير المشروع</label>
              <select v-model="projectForm.manager" class="input">
                <option value="">-- اختر --</option>
                <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
              </select>
            </div>

            <div class="flex justify-end gap-3">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" class="btn-primary">إنشاء المشروع</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
