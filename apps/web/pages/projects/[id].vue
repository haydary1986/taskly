<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'تفاصيل المشروع' })

const route = useRoute()
const projectsStore = useProjectsStore()

const project = ref<any>(null)
const loading = ref(true)

const statusLabels: Record<string, string> = {
  planning: 'تخطيط',
  active: 'نشط',
  'on-hold': 'معلق',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const taskStatusLabels: Record<string, string> = {
  new: 'جديدة',
  'in-progress': 'قيد التنفيذ',
  'in-review': 'مراجعة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
}

onMounted(async () => {
  try {
    project.value = await projectsStore.fetchProject(route.params.id as string)
  } catch (err) {
    console.error('Failed to fetch project:', err)
  } finally {
    loading.value = false
  }
})

const taskStats = computed(() => {
  if (!project.value?.tasks?.docs) return null
  const docs = project.value.tasks.docs
  return {
    total: docs.length,
    completed: docs.filter((t: any) => t.status === 'completed').length,
    inProgress: docs.filter((t: any) => t.status === 'in-progress').length,
    new: docs.filter((t: any) => t.status === 'new').length,
  }
})

const progress = computed(() => {
  if (!taskStats.value || taskStats.value.total === 0) return 0
  return Math.round((taskStats.value.completed / taskStats.value.total) * 100)
})
</script>

<template>
  <div>
    <NuxtLink to="/projects" class="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
      <svg class="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
      العودة للمشاريع
    </NuxtLink>

    <div v-if="loading" class="card animate-pulse">
      <div class="h-6 w-48 rounded bg-gray-200" />
      <div class="mt-4 h-4 w-64 rounded bg-gray-200" />
    </div>

    <div v-else-if="project" class="space-y-6">
      <!-- Project header -->
      <div class="card">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ project.name }}</h1>
            <p v-if="project.description" class="mt-2 text-gray-500">{{ project.description }}</p>
          </div>
          <span
            class="badge text-sm"
            :class="{
              'bg-blue-100 text-blue-700': project.status === 'planning',
              'bg-green-100 text-green-700': project.status === 'active',
              'bg-yellow-100 text-yellow-700': project.status === 'on-hold',
              'bg-gray-100 text-gray-700': project.status === 'completed',
              'bg-red-100 text-red-700': project.status === 'cancelled',
            }"
          >
            {{ statusLabels[project.status] }}
          </span>
        </div>

        <!-- Progress bar -->
        <div class="mt-4">
          <div class="mb-1 flex items-center justify-between text-sm">
            <span class="text-gray-600">التقدم</span>
            <span class="font-medium">{{ progress }}%</span>
          </div>
          <div class="h-3 rounded-full bg-gray-100">
            <div
              class="h-3 rounded-full bg-primary-500 transition-all"
              :style="{ width: `${progress}%` }"
            />
          </div>
        </div>

        <!-- Meta info -->
        <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div v-if="project.manager && typeof project.manager === 'object'">
            <p class="text-xs text-gray-400">مدير المشروع</p>
            <p class="text-sm font-medium">{{ project.manager.name }}</p>
          </div>
          <div v-if="project.estimatedHours">
            <p class="text-xs text-gray-400">الساعات المقدرة</p>
            <p class="text-sm font-medium">{{ project.estimatedHours }}</p>
          </div>
          <div v-if="project.startDate">
            <p class="text-xs text-gray-400">تاريخ البداية</p>
            <p class="text-sm font-medium">{{ new Date(project.startDate).toLocaleDateString('ar-SA') }}</p>
          </div>
          <div v-if="project.endDate">
            <p class="text-xs text-gray-400">تاريخ النهاية</p>
            <p class="text-sm font-medium">{{ new Date(project.endDate).toLocaleDateString('ar-SA') }}</p>
          </div>
        </div>
      </div>

      <!-- Task stats -->
      <div v-if="taskStats" class="grid gap-4 sm:grid-cols-4">
        <div class="card text-center">
          <p class="text-2xl font-bold text-gray-900">{{ taskStats.total }}</p>
          <p class="text-sm text-gray-500">إجمالي المهام</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-blue-600">{{ taskStats.new }}</p>
          <p class="text-sm text-gray-500">جديدة</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-yellow-600">{{ taskStats.inProgress }}</p>
          <p class="text-sm text-gray-500">قيد التنفيذ</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-green-600">{{ taskStats.completed }}</p>
          <p class="text-sm text-gray-500">مكتملة</p>
        </div>
      </div>

      <!-- Project tasks -->
      <div class="card">
        <h2 class="mb-4 text-lg font-semibold text-gray-900">مهام المشروع</h2>
        <div v-if="project.tasks?.docs?.length" class="divide-y divide-gray-100">
          <div v-for="task in project.tasks.docs" :key="task.id" class="flex items-center justify-between py-3">
            <div class="flex items-center gap-2">
              <span class="badge" :class="`badge-${task.status}`">
                {{ taskStatusLabels[task.status] }}
              </span>
              <span class="text-sm font-medium text-gray-900">{{ task.title }}</span>
            </div>
            <span v-if="task.assignee && typeof task.assignee === 'object'" class="text-xs text-gray-500">
              {{ task.assignee.name }}
            </span>
          </div>
        </div>
        <p v-else class="py-8 text-center text-sm text-gray-400">لا توجد مهام مرتبطة بهذا المشروع</p>
      </div>
    </div>
  </div>
</template>
