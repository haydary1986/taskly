<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'إدارة طلبات التصميم' })

const api = useApi()
const authStore = useAuthStore()

const requests = ref<any[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const users = ref<any[]>([])

const statusLabels: Record<string, string> = {
  requested: 'مطلوب', 'in-progress': 'قيد التنفيذ', 'in-review': 'قيد المراجعة',
  approved: 'موافق', rejected: 'مرفوض', published: 'منشور',
}
const statusColors: Record<string, string> = {
  requested: 'bg-blue-100 text-blue-700', 'in-progress': 'bg-yellow-100 text-yellow-700',
  'in-review': 'bg-purple-100 text-purple-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', published: 'bg-gray-100 text-gray-700',
}
const platformLabels: Record<string, string> = {
  instagram: 'إنستغرام', twitter: 'تويتر', facebook: 'فيسبوك',
  tiktok: 'تيك توك', linkedin: 'لينكدإن', snapchat: 'سناب شات',
}

const form = reactive({
  title: '', description: '', platform: [] as string[], designer: '', dueDate: '',
})

// Designer sees only their requests
const isDesigner = computed(() => authStore.role === 'designer')

onMounted(async () => {
  const [reqRes, usersRes] = await Promise.all([
    api.get('/design-requests', { query: { sort: '-createdAt', limit: 100, depth: 1 } }),
    api.get('/users', { query: { limit: 100, where: { role: { equals: 'designer' }, isActive: { equals: true } } } }),
  ])
  requests.value = reqRes.docs
  users.value = usersRes.docs
  loading.value = false
})

async function handleCreate() {
  try {
    await api.post('/design-requests', {
      title: form.title, description: form.description,
      platform: form.platform, designer: form.designer || undefined,
      dueDate: form.dueDate || undefined,
    })
    showCreateModal.value = false
    Object.assign(form, { title: '', description: '', platform: [], designer: '', dueDate: '' })
    const res = await api.get('/design-requests', { query: { sort: '-createdAt', limit: 100, depth: 1 } })
    requests.value = res.docs
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ') }
}

async function updateStatus(id: string, status: string) {
  await api.patch(`/design-requests/${id}`, { status })
  const req = requests.value.find((r) => r.id === id)
  if (req) req.status = status
}

// Kanban columns for designer view
const kanbanColumns = computed(() => {
  const cols: Record<string, any[]> = {
    requested: [], 'in-progress': [], 'in-review': [], approved: [], published: [],
  }
  requests.value.forEach((r) => { if (cols[r.status]) cols[r.status].push(r) })
  return cols
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">{{ isDesigner ? 'تصاميمي' : 'إدارة طلبات التصميم' }}</h1>
      <button v-if="!isDesigner" @click="showCreateModal = true" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        طلب جديد
      </button>
    </div>

    <div v-if="loading" class="grid gap-4 grid-cols-5">
      <div v-for="i in 5" :key="i" class="card animate-pulse"><div class="h-20 rounded bg-gray-200" /></div>
    </div>

    <!-- Kanban view for designer -->
    <div v-else-if="isDesigner" class="flex gap-4 overflow-x-auto pb-4">
      <div v-for="(items, status) in kanbanColumns" :key="status" class="w-64 shrink-0">
        <div class="mb-3 flex items-center gap-2">
          <span class="badge" :class="statusColors[status]">{{ statusLabels[status] }}</span>
          <span class="text-xs text-gray-400">{{ items.length }}</span>
        </div>
        <div class="space-y-2">
          <div v-for="req in items" :key="req.id" class="card !p-3">
            <h4 class="text-sm font-medium">{{ req.title }}</h4>
            <div class="mt-1 flex flex-wrap gap-1">
              <span v-for="p in req.platform" :key="p" class="text-[10px] rounded bg-gray-100 px-1.5 py-0.5">{{ platformLabels[p] }}</span>
            </div>
            <select v-if="status !== 'published'" :value="status" @change="updateStatus(req.id, ($event.target as HTMLSelectElement).value)" class="input mt-2 !py-1 text-xs">
              <option v-for="(label, s) in statusLabels" :key="s" :value="s">{{ label }}</option>
            </select>
          </div>
          <p v-if="!items.length" class="rounded-lg bg-gray-50 p-3 text-center text-xs text-gray-400">فارغ</p>
        </div>
      </div>
    </div>

    <!-- List view for managers -->
    <div v-else class="space-y-3">
      <div v-for="req in requests" :key="req.id" class="card">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-medium">{{ req.title }}</h3>
              <span class="badge" :class="statusColors[req.status]">{{ statusLabels[req.status] }}</span>
            </div>
            <div class="mt-1 flex flex-wrap gap-1">
              <span v-for="p in req.platform" :key="p" class="badge bg-gray-100 text-gray-600">{{ platformLabels[p] }}</span>
            </div>
            <div class="mt-1 text-xs text-gray-500">
              <span v-if="req.designer?.name">المصمم: {{ req.designer.name }}</span>
              <span v-if="req.dueDate" class="mr-3">التسليم: {{ new Date(req.dueDate).toLocaleDateString('ar-SA') }}</span>
            </div>
          </div>
          <select :value="req.status" @change="updateStatus(req.id, ($event.target as HTMLSelectElement).value)" class="input !w-auto !py-1.5 text-xs">
            <option v-for="(label, s) in statusLabels" :key="s" :value="s">{{ label }}</option>
          </select>
        </div>
      </div>
      <div v-if="!requests.length" class="card py-12 text-center"><p class="text-gray-400">لا توجد طلبات تصميم</p></div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateModal = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold">طلب تصميم جديد</h2>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div><label class="label">العنوان</label><input v-model="form.title" class="input" required /></div>
            <div><label class="label">الوصف</label><textarea v-model="form.description" class="input" rows="3" /></div>
            <div>
              <label class="label">المنصات</label>
              <div class="flex flex-wrap gap-2">
                <label v-for="(label, value) in platformLabels" :key="value" class="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm">
                  <input type="checkbox" :value="value" v-model="form.platform" /> {{ label }}
                </label>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">المصمم</label><select v-model="form.designer" class="input"><option value="">-- اختر --</option><option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option></select></div>
              <div><label class="label">تاريخ التسليم</label><input v-model="form.dueDate" type="date" class="input" dir="ltr" /></div>
            </div>
            <div class="flex justify-end gap-3">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" class="btn-primary">إنشاء</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
