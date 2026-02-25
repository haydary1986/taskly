<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'مراجعة الكود' })

const api = useApi()
const authStore = useAuthStore()

const reviews = ref<any[]>([])
const loading = ref(true)
const showCreateModal = ref(false)

const statusLabels: Record<string, string> = {
  pending: 'بانتظار المراجعة', 'in-review': 'قيد المراجعة', approved: 'تمت الموافقة',
  rejected: 'مرفوض', 'changes-requested': 'مطلوب تعديلات',
}
const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', 'in-review': 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  'changes-requested': 'bg-orange-100 text-orange-700',
}

const form = reactive({
  title: '', description: '', githubRepo: '', githubBranch: '', githubPR: '', task: '',
})
const tasks = ref<any[]>([])

onMounted(async () => {
  const [reviewsRes, tasksRes] = await Promise.all([
    api.get('/code-reviews', { query: { sort: '-createdAt', limit: 100, depth: 1 } }),
    api.get('/tasks', { query: { where: { type: { equals: 'programming' } }, limit: 100, depth: 0 } }),
  ])
  reviews.value = reviewsRes.docs
  tasks.value = tasksRes.docs
  loading.value = false
})

async function handleCreate() {
  try {
    await api.post('/code-reviews', {
      ...form, task: form.task || undefined,
    })
    showCreateModal.value = false
    Object.assign(form, { title: '', description: '', githubRepo: '', githubBranch: '', githubPR: '', task: '' })
    const res = await api.get('/code-reviews', { query: { sort: '-createdAt', limit: 100, depth: 1 } })
    reviews.value = res.docs
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ') }
}

async function updateStatus(id: string, status: string, reviewNotes?: string) {
  await api.patch(`/code-reviews/${id}`, { status, ...(reviewNotes ? { reviewNotes } : {}) })
  const review = reviews.value.find((r) => r.id === id)
  if (review) review.status = status
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">مراجعة الكود</h1>
      <button v-if="authStore.role === 'programmer'" @click="showCreateModal = true" class="btn-primary">تقديم للمراجعة</button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card animate-pulse"><div class="h-16 rounded bg-gray-200" /></div>
    </div>

    <div v-else class="space-y-3">
      <div v-for="review in reviews" :key="review.id" class="card">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-medium">{{ review.title }}</h3>
              <span class="badge" :class="statusColors[review.status]">{{ statusLabels[review.status] }}</span>
            </div>
            <p v-if="review.description" class="mt-1 text-sm text-gray-500">{{ review.description }}</p>
            <div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
              <span v-if="review.submittedBy?.name">من: {{ review.submittedBy.name }}</span>
              <span v-if="review.reviewer?.name">مراجع: {{ review.reviewer.name }}</span>
              <a v-if="review.githubPR" :href="review.githubPR" target="_blank" class="text-primary-600 hover:underline" dir="ltr">{{ review.githubPR }}</a>
              <span v-if="review.githubRepo" dir="ltr">{{ review.githubRepo }}/{{ review.githubBranch }}</span>
            </div>
            <p v-if="review.reviewNotes" class="mt-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600">{{ review.reviewNotes }}</p>
          </div>
          <div v-if="authStore.isAdmin" class="flex gap-1">
            <button @click="updateStatus(review.id, 'approved')" class="btn-success text-xs !px-2 !py-1">موافقة</button>
            <button @click="updateStatus(review.id, 'changes-requested')" class="btn-secondary text-xs !px-2 !py-1">تعديلات</button>
            <button @click="updateStatus(review.id, 'rejected')" class="btn-danger text-xs !px-2 !py-1">رفض</button>
          </div>
        </div>
      </div>
      <div v-if="!reviews.length" class="card py-12 text-center"><p class="text-gray-400">لا توجد مراجعات</p></div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateModal = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold">تقديم كود للمراجعة</h2>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div><label class="label">العنوان</label><input v-model="form.title" class="input" required /></div>
            <div><label class="label">وصف التغييرات</label><textarea v-model="form.description" class="input" rows="3" /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">المستودع</label><input v-model="form.githubRepo" class="input" dir="ltr" placeholder="user/repo" /></div>
              <div><label class="label">الفرع</label><input v-model="form.githubBranch" class="input" dir="ltr" placeholder="feature/xyz" /></div>
            </div>
            <div><label class="label">رابط PR</label><input v-model="form.githubPR" class="input" dir="ltr" type="url" placeholder="https://github.com/..." /></div>
            <div><label class="label">المهمة المرتبطة</label><select v-model="form.task" class="input"><option value="">-- اختياري --</option><option v-for="t in tasks" :key="t.id" :value="t.id">{{ t.title }}</option></select></div>
            <div class="flex justify-end gap-3">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" class="btn-primary">تقديم</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
