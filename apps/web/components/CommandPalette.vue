<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const isOpen = useState('commandPaletteOpen', () => false)
const searchQuery = ref('')
const queryInput = ref<HTMLInputElement | null>(null)
const router = useRouter()
const api = useApi()

// Search results state
const loading = ref(false)
const results = ref<{
  tasks: any[]
  projects: any[]
  users: any[]
  pages: any[]
}>({ tasks: [], projects: [], users: [], pages: [] })

// Static pages
const appPages = [
  { title: 'لوحة التحكم', path: '/', icon: 'home' },
  { title: 'إدارة المهام', path: '/tasks', icon: 'tasks' },
  { title: 'كانبان', path: '/tasks/kanban', icon: 'kanban' },
  { title: 'المشاريع', path: '/projects', icon: 'projects' },
  { title: 'الملفات', path: '/files', icon: 'files' },
  { title: 'مؤشرات الأداء', path: '/kpi', icon: 'kpi' },
  { title: 'سجل الزيارات', path: '/visits', icon: 'visits' },
  { title: 'المحادثات', path: '/chat', icon: 'chat' },
  { title: 'الإعدادات', path: '/settings', icon: 'settings' },
]

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    isOpen.value = !isOpen.value
  }
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  
  if (!newVal.trim()) {
    results.value = { tasks: [], projects: [], users: [], pages: [] }
    return
  }

  // Filter static pages immediately
  results.value.pages = appPages.filter(p => p.title.includes(newVal))

  // Debounce API calls
  loading.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const q = newVal.trim()
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        api.get('/tasks', { query: { where: { title: { like: q } }, limit: 5 } }),
        api.get('/projects', { query: { where: { name: { like: q } }, limit: 5 } }),
        api.get('/users', { query: { where: { name: { like: q } }, limit: 5 } }),
      ])

      results.value = {
        ...results.value,
        tasks: tasksRes.docs || [],
        projects: projectsRes.docs || [],
        users: usersRes.docs || []
      }
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      loading.value = false
    }
  }, 400)
})

watch(isOpen, (val) => {
  if (val) {
    searchQuery.value = ''
    setTimeout(() => queryInput.value?.focus(), 100)
  }
})

function navigateToDynamic(path: string) {
  isOpen.value = false
  router.push(path)
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop overlay -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" @click="isOpen = false" />
    </Transition>

    <!-- Command Palette Modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-4"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-4"
    >
      <div
        v-if="isOpen"
        class="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#151B2B] dark:border dark:border-white/10 md:inset-x-auto"
      >
        <!-- Search Input -->
        <div class="relative border-b border-gray-200 dark:border-white/10">
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
            </svg>
          </div>
          <input
            ref="queryInput"
            v-model="searchQuery"
            type="text"
            class="h-14 w-full bg-transparent pl-4 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none dark:text-gray-100 dark:placeholder-gray-400 text-lg"
            placeholder="ابحث عن المهام، المشاريع، الموظفين، أو الصفحات..."
          />
          <div v-if="loading" class="absolute inset-y-0 left-0 flex items-center pl-4">
            <svg class="h-5 w-5 animate-spin text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>

        <!-- Results Grid -->
        <div class="max-h-[60vh] overflow-y-auto p-2" v-auto-animate>
          <div v-if="!searchQuery" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            ابدأ الكتابة للبحث الشامل في النظام
          </div>

          <div v-else-if="!loading && !results.pages.length && !results.tasks.length && !results.projects.length && !results.users.length" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            لا توجد نتائج مطابقة لبحثك
          </div>

          <template v-else>
            <!-- Pages -->
            <div v-if="results.pages.length" class="mb-4">
              <h3 class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">الصفحات</h3>
              <ul class="space-y-1">
                <li v-for="page in results.pages" :key="page.path">
                  <button @click="navigateToDynamic(page.path)" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5 transition-colors focus:bg-gray-100 dark:focus:bg-white/5 focus:outline-none">
                    <span>{{ page.title }}</span>
                    <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Tasks -->
            <div v-if="results.tasks.length" class="mb-4">
              <h3 class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">المهام</h3>
              <ul class="space-y-1">
                <li v-for="task in results.tasks" :key="task.id">
                  <button @click="navigateToDynamic(`/tasks/${task.id}`)" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5 transition-colors focus:bg-gray-100 dark:focus:bg-white/5 focus:outline-none text-right">
                    <div class="flex flex-col">
                      <span class="font-medium">{{ task.title }}</span>
                      <span class="text-xs text-gray-400 truncate">{{ task.description || 'بدون وصف' }}</span>
                    </div>
                    <span class="badge" :class="`badge-${task.status}`">{{ task.status }}</span>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Projects -->
            <div v-if="results.projects.length" class="mb-4">
              <h3 class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">المشاريع</h3>
              <ul class="space-y-1">
                <li v-for="project in results.projects" :key="project.id">
                  <button @click="navigateToDynamic(`/projects/${project.id}`)" class="flex w-full flex-col rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5 transition-colors focus:bg-gray-100 dark:focus:bg-white/5 focus:outline-none text-right">
                    <span class="font-medium">{{ project.name }}</span>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Users -->
            <div v-if="results.users.length" class="mb-4">
              <h3 class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">الموظفين</h3>
              <ul class="space-y-1">
                <li v-for="user in results.users" :key="user.id">
                  <!-- Non-clickable for now, just informative or route to chat via /chat -->
                  <div class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 text-right">
                    <div class="flex items-center gap-2">
                       <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                          {{ user.name?.charAt(0) || '?' }}
                       </div>
                       <span>{{ user.name }}</span>
                    </div>
                    <span class="text-xs text-gray-400">{{ user.role }}</span>
                  </div>
                </li>
              </ul>
            </div>
          </template>
        </div>
        
        <!-- Footer / Keyboard help -->
        <div class="border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400 flex justify-between items-center bg-gray-50 dark:bg-[#0B0F19]">
           <span>استخدم الأسهم للتنقل (قريباً)، واضغط <kbd class="font-sans font-semibold border rounded px-1.5 py-0.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300">Esc</kbd> للإغلاق</span>
           <span class="hidden sm:inline">نظام البحث الشامل - Taskly</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
