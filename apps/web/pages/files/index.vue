<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const api = useApi()
const authStore = useAuthStore()

const files = ref<any[]>([])
const projects = ref<any[]>([])
const loading = ref(true)
const uploading = ref(false)

// Filters
const filterProject = ref('')
const filterCategory = ref('')
const searchQuery = ref('')

// Upload modal
const showUpload = ref(false)
const uploadForm = ref({
  name: '',
  description: '',
  project: '',
  category: 'general',
  file: null as File | null,
})

// Preview
const previewFile = ref<any>(null)

const categories = [
  { label: 'عام', value: 'general' },
  { label: 'مستند', value: 'document' },
  { label: 'تصميم', value: 'design' },
  { label: 'عقد', value: 'contract' },
  { label: 'تقرير', value: 'report' },
  { label: 'صورة', value: 'image' },
]

const categoryLabels: Record<string, string> = Object.fromEntries(categories.map(c => [c.value, c.label]))

const filteredFiles = computed(() => {
  return files.value.filter((f) => {
    if (filterProject.value && f.project?.id !== filterProject.value && f.project !== filterProject.value) return false
    if (filterCategory.value && f.category !== filterCategory.value) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return f.name?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q)
    }
    return true
  })
})

const storageUsed = computed(() => {
  let total = 0
  for (const f of files.value) {
    if (f.file?.filesize) total += f.file.filesize
  }
  return total
})

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function getFileIcon(mimeType: string) {
  if (!mimeType) return 'file'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'sheet'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slides'
  return 'file'
}

function getApiBase() {
  return useRuntimeConfig().public.apiBase as string
}

onMounted(async () => {
  try {
    const [filesRes, projectsRes] = await Promise.all([
      api.get('/project-files?limit=500&depth=2&sort=-createdAt'),
      api.get('/projects?limit=100&depth=0'),
    ])
    files.value = filesRes.docs || []
    projects.value = projectsRes.docs || []
  } catch (err) {
    console.error('Failed to load files:', err)
  } finally {
    loading.value = false
  }
})

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) {
    uploadForm.value.file = input.files[0]
    if (!uploadForm.value.name) {
      uploadForm.value.name = input.files[0].name
    }
  }
}

async function uploadFile() {
  if (!uploadForm.value.file || !uploadForm.value.name) return
  uploading.value = true
  try {
    // Upload the file first
    const mediaRes = await api.upload(uploadForm.value.file)
    const mediaId = mediaRes.doc?.id

    if (!mediaId) throw new Error('فشل رفع الملف')

    // Create project-file record
    const body: any = {
      name: uploadForm.value.name,
      file: mediaId,
      category: uploadForm.value.category,
    }
    if (uploadForm.value.description) body.description = uploadForm.value.description
    if (uploadForm.value.project) body.project = uploadForm.value.project

    await api.post('/project-files', body)

    // Refresh
    const filesRes = await api.get('/project-files?limit=500&depth=2&sort=-createdAt')
    files.value = filesRes.docs || []

    // Reset
    showUpload.value = false
    uploadForm.value = { name: '', description: '', project: '', category: 'general', file: null }
  } catch (err) {
    console.error('Failed to upload:', err)
    alert('فشل رفع الملف')
  } finally {
    uploading.value = false
  }
}

async function deleteFile(id: string) {
  if (!confirm('حذف هذا الملف؟')) return
  try {
    await api.del(`/project-files/${id}`)
    files.value = files.value.filter((f) => f.id !== id)
  } catch (err) {
    console.error('Failed to delete file:', err)
  }
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">إدارة الملفات</h1>
        <p class="text-sm text-gray-500">{{ files.length }} ملف - {{ formatSize(storageUsed) }} مستخدم</p>
      </div>
      <button @click="showUpload = true" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        رفع ملف
      </button>
    </div>

    <!-- Filters -->
    <div class="card flex flex-wrap items-end gap-3 p-4">
      <div class="flex-1 min-w-[200px]">
        <input v-model="searchQuery" class="input" placeholder="بحث في الملفات..." />
      </div>
      <select v-model="filterProject" class="input w-44">
        <option value="">كل المشاريع</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select v-model="filterCategory" class="input w-36">
        <option value="">كل التصنيفات</option>
        <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="card animate-pulse h-32" />
    </div>

    <!-- Files grid -->
    <div v-else-if="filteredFiles.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="file in filteredFiles"
        :key="file.id"
        class="card p-4 transition-shadow hover:shadow-md"
      >
        <div class="flex items-start gap-3">
          <!-- File icon -->
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            :class="{
              'bg-blue-100 text-blue-600': getFileIcon(file.file?.mimeType) === 'file',
              'bg-green-100 text-green-600': getFileIcon(file.file?.mimeType) === 'image',
              'bg-red-100 text-red-600': getFileIcon(file.file?.mimeType) === 'pdf',
              'bg-indigo-100 text-indigo-600': getFileIcon(file.file?.mimeType) === 'doc',
              'bg-emerald-100 text-emerald-600': getFileIcon(file.file?.mimeType) === 'sheet',
              'bg-orange-100 text-orange-600': getFileIcon(file.file?.mimeType) === 'slides',
            }"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path v-if="getFileIcon(file.file?.mimeType) === 'image'" stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-medium text-gray-900 truncate">{{ file.name }}</h3>
            <p v-if="file.description" class="text-xs text-gray-500 truncate mt-0.5">{{ file.description }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
              <span class="badge bg-gray-100 text-gray-600">{{ categoryLabels[file.category] || file.category }}</span>
              <span v-if="file.file?.filesize">{{ formatSize(file.file.filesize) }}</span>
              <span>{{ formatDate(file.createdAt) }}</span>
            </div>
            <div class="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
              <span v-if="file.uploadedBy?.name">{{ file.uploadedBy.name }}</span>
              <span v-if="file.project?.name" class="text-primary-500">{{ file.project.name }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2">
          <!-- Preview (images) -->
          <button
            v-if="file.file?.mimeType?.startsWith('image/')"
            @click="previewFile = file"
            class="text-xs text-gray-500 hover:text-primary-600"
          >معاينة</button>

          <!-- Download -->
          <a
            :href="`${getApiBase()}${file.file?.url}`"
            target="_blank"
            class="text-xs text-gray-500 hover:text-primary-600"
          >تحميل</a>

          <!-- Delete -->
          <button
            v-if="file.uploadedBy?.id === authStore.user?.id || authStore.isManagement"
            @click="deleteFile(file.id)"
            class="text-xs text-gray-500 hover:text-red-600 mr-auto"
          >حذف</button>
        </div>
      </div>
    </div>

    <p v-else class="card py-12 text-center text-sm text-gray-400">لا توجد ملفات</p>

    <!-- Upload Modal -->
    <Teleport to="body">
      <div v-if="showUpload" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showUpload = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 class="text-lg font-bold text-gray-900 mb-4">رفع ملف جديد</h2>

          <div class="space-y-3">
            <div>
              <label class="label">الملف</label>
              <input type="file" @change="handleFileSelect" class="input text-sm" />
            </div>
            <div>
              <label class="label">اسم الملف</label>
              <input v-model="uploadForm.name" class="input" placeholder="اسم الملف" />
            </div>
            <div>
              <label class="label">الوصف</label>
              <textarea v-model="uploadForm.description" class="input" rows="2" placeholder="وصف اختياري" />
            </div>
            <div>
              <label class="label">المشروع</label>
              <select v-model="uploadForm.project" class="input">
                <option value="">بدون مشروع</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label class="label">التصنيف</label>
              <select v-model="uploadForm.category" class="input">
                <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
          </div>

          <div class="mt-4 flex gap-2 justify-end">
            <button @click="showUpload = false" class="btn-secondary text-sm">إلغاء</button>
            <button @click="uploadFile" :disabled="uploading || !uploadForm.file || !uploadForm.name" class="btn-primary text-sm">
              {{ uploading ? 'جاري الرفع...' : 'رفع' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Image Preview -->
    <Teleport to="body">
      <div v-if="previewFile" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" @click.self="previewFile = null">
        <div class="relative max-w-3xl">
          <button @click="previewFile = null" class="absolute -top-10 left-0 text-white hover:text-gray-300">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img :src="`${getApiBase()}${previewFile.file?.url}`" class="max-h-[80vh] rounded-lg" />
          <p class="mt-2 text-center text-sm text-white">{{ previewFile.name }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>
