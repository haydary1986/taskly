<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const api = useApi()
const authStore = useAuthStore()

const task = ref<any>(null)
const comments = ref<any[]>([])
const activities = ref<any[]>([])
const loading = ref(true)
const activeTab = ref<'comments' | 'activity'>('comments')

// Comment form
const newComment = ref('')
const commentFile = ref<File | null>(null)
const submittingComment = ref(false)

// Status update
const updatingStatus = ref(false)

const statusOptions = [
  { label: 'جديدة', value: 'new' },
  { label: 'قيد التنفيذ', value: 'in-progress' },
  { label: 'قيد المراجعة', value: 'in-review' },
  { label: 'مكتملة', value: 'completed' },
  { label: 'ملغاة', value: 'cancelled' },
]

const priorityLabels: Record<string, string> = {
  urgent: 'عاجل', high: 'عالي', medium: 'متوسط', low: 'منخفض',
}

const typeLabels: Record<string, string> = {
  programming: 'برمجة', 'field-visit': 'زيارة ميدانية', design: 'تصميم', general: 'عام',
}

const statusLabels: Record<string, string> = {
  new: 'جديدة', 'in-progress': 'قيد التنفيذ', 'in-review': 'مراجعة', completed: 'مكتملة', cancelled: 'ملغاة',
}

const activityLabels: Record<string, string> = {
  created: 'أنشأ المهمة',
  updated: 'عدّل المهمة',
  'status-changed': 'غيّر الحالة',
  'priority-changed': 'غيّر الأولوية',
  'assignee-changed': 'غيّر المسند إليه',
  commented: 'أضاف تعليق',
  'attachment-added': 'أرفق ملف',
}

async function fetchData() {
  loading.value = true
  try {
    const [taskData, commentsData, activitiesData] = await Promise.all([
      api.get(`/tasks/${route.params.id}?depth=2`),
      api.get(`/task-comments?where[task][equals]=${route.params.id}&sort=-createdAt&depth=1&limit=100`),
      api.get(`/task-activities?where[task][equals]=${route.params.id}&sort=-createdAt&depth=1&limit=100`),
    ])
    task.value = taskData
    comments.value = commentsData.docs || []
    activities.value = activitiesData.docs || []
  } catch (err) {
    console.error('Failed to fetch task:', err)
  } finally {
    loading.value = false
  }
}

async function updateStatus(newStatus: string) {
  if (!task.value || updatingStatus.value) return
  updatingStatus.value = true
  try {
    await api.patch(`/tasks/${task.value.id}`, { status: newStatus })
    task.value.status = newStatus
  } catch (err) {
    console.error('Failed to update status:', err)
  } finally {
    updatingStatus.value = false
  }
}

async function submitComment() {
  if (!newComment.value.trim() && !commentFile.value) return
  submittingComment.value = true
  try {
    let attachmentId: string | undefined
    if (commentFile.value) {
      const uploaded = await api.upload(commentFile.value)
      attachmentId = uploaded.doc?.id
    }

    const body: any = {
      task: route.params.id,
      content: newComment.value.trim(),
    }
    if (attachmentId) body.attachment = attachmentId

    await api.post('/task-comments', body)
    newComment.value = ''
    commentFile.value = null

    // Refresh comments
    const commentsData = await api.get(`/task-comments?where[task][equals]=${route.params.id}&sort=-createdAt&depth=1&limit=100`)
    comments.value = commentsData.docs || []
  } catch (err) {
    console.error('Failed to post comment:', err)
  } finally {
    submittingComment.value = false
  }
}

async function deleteComment(id: string) {
  if (!confirm('حذف هذا التعليق؟')) return
  try {
    await api.del(`/task-comments/${id}`)
    comments.value = comments.value.filter((c) => c.id !== id)
  } catch (err) {
    console.error('Failed to delete comment:', err)
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) commentFile.value = input.files[0]
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getApiBase() {
  const config = useRuntimeConfig()
  return config.public.apiBase as string
}

onMounted(fetchData)
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="card animate-pulse"><div class="h-6 w-48 rounded bg-gray-200" /><div class="mt-3 h-4 w-full rounded bg-gray-200" /></div>
    </div>

    <div v-else-if="task" class="space-y-6">
      <!-- Back button + Title -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <NuxtLink to="/tasks" class="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <svg class="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
            العودة للمهام
          </NuxtLink>
          <h1 class="text-2xl font-bold text-gray-900">{{ task.title }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge" :class="{
            'badge-urgent': task.priority === 'urgent',
            'badge-high': task.priority === 'high',
            'badge-medium': task.priority === 'medium',
            'badge-low': task.priority === 'low',
          }">{{ priorityLabels[task.priority] }}</span>
          <span class="badge bg-gray-100 text-gray-700">{{ typeLabels[task.type] }}</span>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main content -->
        <div class="space-y-6 lg:col-span-2">
          <!-- Description -->
          <div v-if="task.description" class="card">
            <h3 class="mb-3 text-sm font-semibold text-gray-500">الوصف</h3>
            <div class="prose prose-sm max-w-none text-gray-700" v-html="typeof task.description === 'object' ? (task.description?.root?.children?.map((c: any) => c.children?.map((t: any) => t.text).join('')).join('<br>') || '') : task.description" />
          </div>

          <!-- Status changer -->
          <div class="card">
            <h3 class="mb-3 text-sm font-semibold text-gray-500">الحالة</h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                :disabled="updatingStatus"
                @click="updateStatus(opt.value)"
                class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
                :class="task.status === opt.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Tabs: Comments / Activity -->
          <div class="card p-0">
            <div class="flex border-b border-gray-200">
              <button
                @click="activeTab = 'comments'"
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                :class="activeTab === 'comments' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'"
              >
                التعليقات ({{ comments.length }})
              </button>
              <button
                @click="activeTab = 'activity'"
                class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                :class="activeTab === 'activity' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'"
              >
                سجل النشاط ({{ activities.length }})
              </button>
            </div>

            <!-- Comments tab -->
            <div v-if="activeTab === 'comments'" class="p-4">
              <!-- Comment form -->
              <div class="mb-4 space-y-3">
                <textarea
                  v-model="newComment"
                  rows="3"
                  class="input"
                  placeholder="اكتب تعليقاً..."
                />
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <label class="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                      <input type="file" class="hidden" @change="handleFileSelect" />
                      <span class="flex items-center gap-1">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        مرفق
                      </span>
                    </label>
                    <span v-if="commentFile" class="text-xs text-gray-500">{{ commentFile.name }}</span>
                  </div>
                  <button
                    @click="submitComment"
                    :disabled="submittingComment || (!newComment.trim() && !commentFile)"
                    class="btn-primary text-xs"
                  >
                    {{ submittingComment ? 'جاري الإرسال...' : 'إرسال' }}
                  </button>
                </div>
              </div>

              <!-- Comments list -->
              <div v-if="comments.length" class="space-y-4">
                <div v-for="comment in comments" :key="comment.id" class="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                        {{ comment.author?.name?.charAt(0) || '?' }}
                      </div>
                      <span class="text-sm font-medium text-gray-900">{{ comment.author?.name || 'مجهول' }}</span>
                      <span class="text-xs text-gray-400">{{ formatDate(comment.createdAt) }}</span>
                    </div>
                    <button
                      v-if="comment.author?.id === authStore.user?.id || authStore.isManagement"
                      @click="deleteComment(comment.id)"
                      class="text-gray-400 hover:text-red-500"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ comment.content }}</p>
                  <div v-if="comment.attachment" class="mt-2">
                    <a
                      :href="`${getApiBase()}${comment.attachment.url}`"
                      target="_blank"
                      class="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      {{ comment.attachment.filename || 'مرفق' }}
                    </a>
                    <img
                      v-if="comment.attachment.mimeType?.startsWith('image/')"
                      :src="`${getApiBase()}${comment.attachment.url}`"
                      class="mt-2 max-h-48 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <p v-else class="py-6 text-center text-sm text-gray-400">لا توجد تعليقات بعد</p>
            </div>

            <!-- Activity tab -->
            <div v-if="activeTab === 'activity'" class="p-4">
              <div v-if="activities.length" class="relative space-y-0">
                <!-- Timeline line -->
                <div class="absolute right-3.5 top-2 bottom-2 w-px bg-gray-200" />

                <div v-for="activity in activities" :key="activity.id" class="relative flex gap-3 pb-4">
                  <div class="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white"
                    :class="{
                      'bg-green-100 text-green-600': activity.action === 'created',
                      'bg-blue-100 text-blue-600': activity.action === 'status-changed',
                      'bg-orange-100 text-orange-600': activity.action === 'priority-changed',
                      'bg-purple-100 text-purple-600': activity.action === 'assignee-changed',
                      'bg-gray-100 text-gray-600': !['created', 'status-changed', 'priority-changed', 'assignee-changed'].includes(activity.action),
                    }"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path v-if="activity.action === 'created'" stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      <path v-else-if="activity.action === 'status-changed'" stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      <path v-else stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-700">
                      <span class="font-medium">{{ activity.user?.name || 'مستخدم' }}</span>
                      {{ activityLabels[activity.action] || activity.action }}
                      <template v-if="activity.action === 'status-changed' && activity.details">
                        من <span class="font-medium">{{ statusLabels[activity.details.from] || activity.details.from }}</span>
                        إلى <span class="font-medium">{{ statusLabels[activity.details.to] || activity.details.to }}</span>
                      </template>
                      <template v-if="activity.action === 'priority-changed' && activity.details">
                        من <span class="font-medium">{{ priorityLabels[activity.details.from] || activity.details.from }}</span>
                        إلى <span class="font-medium">{{ priorityLabels[activity.details.to] || activity.details.to }}</span>
                      </template>
                    </p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ formatDate(activity.createdAt) }}</p>
                  </div>
                </div>
              </div>
              <p v-else class="py-6 text-center text-sm text-gray-400">لا يوجد نشاط بعد</p>
            </div>
          </div>
        </div>

        <!-- Sidebar info -->
        <div class="space-y-4">
          <div class="card space-y-4">
            <div>
              <p class="text-xs font-semibold text-gray-400 mb-1">المسند إليه</p>
              <p class="text-sm font-medium text-gray-900">{{ task.assignee?.name || 'غير محدد' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-400 mb-1">المسند من</p>
              <p class="text-sm font-medium text-gray-900">{{ task.assignedBy?.name || 'غير محدد' }}</p>
            </div>
            <div v-if="task.project">
              <p class="text-xs font-semibold text-gray-400 mb-1">المشروع</p>
              <NuxtLink :to="`/projects/${typeof task.project === 'object' ? task.project.id : task.project}`" class="text-sm font-medium text-primary-600 hover:underline">
                {{ typeof task.project === 'object' ? task.project.name : task.project }}
              </NuxtLink>
            </div>
            <div v-if="task.dueDate">
              <p class="text-xs font-semibold text-gray-400 mb-1">تاريخ الاستحقاق</p>
              <p class="text-sm font-medium" :class="new Date(task.dueDate) < new Date() && !['completed', 'cancelled'].includes(task.status) ? 'text-red-600' : 'text-gray-900'">
                {{ new Date(task.dueDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) }}
              </p>
            </div>
            <div v-if="task.completedAt">
              <p class="text-xs font-semibold text-gray-400 mb-1">تاريخ الإنجاز</p>
              <p class="text-sm font-medium text-green-600">{{ formatDate(task.completedAt) }}</p>
            </div>
            <div v-if="task.recurrence && task.recurrence !== 'none'">
              <p class="text-xs font-semibold text-gray-400 mb-1">التكرار</p>
              <p class="text-sm font-medium text-gray-900">{{ { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' }[task.recurrence] }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-400 mb-1">تاريخ الإنشاء</p>
              <p class="text-sm text-gray-600">{{ formatDate(task.createdAt) }}</p>
            </div>
          </div>

          <!-- GitHub info for programming tasks -->
          <div v-if="task.type === 'programming' && (task.githubRepo || task.githubBranch)" class="card space-y-3">
            <h3 class="text-sm font-semibold text-gray-500">GitHub</h3>
            <div v-if="task.githubRepo">
              <p class="text-xs font-semibold text-gray-400 mb-1">المستودع</p>
              <p class="text-sm font-medium text-gray-900 break-all">{{ task.githubRepo }}</p>
            </div>
            <div v-if="task.githubBranch">
              <p class="text-xs font-semibold text-gray-400 mb-1">الفرع</p>
              <p class="text-sm font-mono text-gray-900">{{ task.githubBranch }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not found -->
    <div v-else class="py-12 text-center">
      <p class="text-gray-500">المهمة غير موجودة</p>
      <NuxtLink to="/tasks" class="mt-2 inline-block text-sm text-primary-600 hover:underline">العودة للمهام</NuxtLink>
    </div>
  </div>
</template>
