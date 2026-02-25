<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()

interface MenuItem {
  label: string
  icon: string
  to: string
  section?: string
}

const menuItems = computed(() => {
  const role = authStore.role || ''
  const isAdmin = ['super-admin', 'supervisor', 'auditor'].includes(role)
  const isSecurity = ['super-admin', 'auditor'].includes(role)
  const isSales = role === 'sales-rep'
  const isProgrammer = role === 'programmer'
  const isDesigner = role === 'designer'
  const isSocialMedia = role === 'social-media-manager'

  const items: MenuItem[] = [
    { label: 'لوحة التحكم', icon: 'home', to: '/', section: 'رئيسي' },
  ]

  // KPI - admin only
  if (isAdmin) items.push({ label: 'مؤشرات الأداء', icon: 'kpi', to: '/kpi', section: 'رئيسي' })

  // Map - admin only
  if (isAdmin) items.push({ label: 'الخريطة التفاعلية', icon: 'map', to: '/map', section: 'رئيسي' })

  // Reports - admin only
  if (isAdmin) items.push({ label: 'التقارير', icon: 'reports', to: '/reports', section: 'رئيسي' })

  // Task management - admin
  if (isAdmin) {
    items.push({ label: 'إدارة المهام', icon: 'tasks', to: '/tasks', section: 'إدارة العمل' })
    items.push({ label: 'كانبان', icon: 'kanban', to: '/tasks/kanban', section: 'إدارة العمل' })
    items.push({ label: 'المشاريع', icon: 'projects', to: '/projects', section: 'إدارة العمل' })
  }

  // My Tasks - employees
  if (isProgrammer || isSales || isDesigner || isSocialMedia) {
    items.push({ label: 'مهامي', icon: 'my-tasks', to: '/tasks/my', section: 'إدارة العمل' })
  }

  // Time tracking - programmer
  if (isProgrammer) items.push({ label: 'تتبع الوقت', icon: 'clock', to: '/time-tracking', section: 'إدارة العمل' })

  // Check-in - sales rep
  if (isSales) items.push({ label: 'إثبات الحضور', icon: 'checkin', to: '/visits/check-in', section: 'المبيعات' })

  // Visits
  if (isAdmin) items.push({ label: 'سجل الزيارات', icon: 'visits', to: '/visits', section: 'المبيعات' })
  if (isSales) items.push({ label: 'زياراتي', icon: 'visits', to: '/visits', section: 'المبيعات' })

  // Daily route report
  if (isAdmin || isSales) items.push({ label: 'تقرير المسار', icon: 'map', to: '/visits/route-report', section: 'المبيعات' })

  // Clients
  if (isAdmin || isSales) items.push({ label: 'العملاء', icon: 'clients', to: '/clients', section: 'المبيعات' })

  // Code review
  if (isAdmin || isProgrammer) items.push({ label: 'مراجعة الكود', icon: 'code', to: '/code-reviews', section: 'البرمجة' })

  // Design requests
  if (isAdmin || isSocialMedia) items.push({ label: 'طلبات التصميم', icon: 'designs', to: '/designs', section: 'التصميم' })
  if (isDesigner) items.push({ label: 'تصاميمي', icon: 'designs', to: '/designs', section: 'التصميم' })

  // Files - all authenticated
  items.push({ label: 'إدارة الملفات', icon: 'files', to: '/files', section: 'إدارة العمل' })

  // Chat - all
  items.push({ label: 'المحادثات', icon: 'chat', to: '/chat', section: 'التواصل' })
  items.push({ label: 'الإشعارات', icon: 'notifications', to: '/notifications', section: 'التواصل' })

  // User management - admin
  if (isAdmin) items.push({ label: 'المستخدمين', icon: 'users', to: '/users', section: 'النظام' })

  // Security - super-admin + auditor
  if (isSecurity) items.push({ label: 'مركز الأمان', icon: 'security', to: '/security', section: 'النظام' })

  // Settings - management only (super-admin + supervisor)
  const isManagement = ['super-admin', 'supervisor'].includes(role)
  if (isManagement) items.push({ label: 'إعدادات النظام', icon: 'settings', to: '/settings', section: 'النظام' })

  // Profile - all
  items.push({ label: 'الملف الشخصي', icon: 'profile', to: '/profile', section: 'النظام' })

  return items
})

// Group items by section
const groupedItems = computed(() => {
  const groups: { section: string; items: MenuItem[] }[] = []
  let currentSection = ''
  for (const item of menuItems.value) {
    if (item.section !== currentSection) {
      currentSection = item.section || ''
      groups.push({ section: currentSection, items: [] })
    }
    groups[groups.length - 1].items.push(item)
  }
  return groups
})

const iconMap: Record<string, string> = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  kpi: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  reports: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  tasks: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  projects: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  'my-tasks': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  checkin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  visits: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  clients: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  designs: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  notifications: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  security: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  kanban: 'M9 4h6v16H9V4zM3 4h4v10H3V4zm14 0h4v12h-4V4z',
  files: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
}
</script>

<template>
  <aside class="fixed right-0 top-0 z-30 hidden h-screen w-64 flex-col border-l border-gray-200 bg-white lg:flex">
    <!-- Logo -->
    <div class="flex h-16 shrink-0 items-center border-b border-gray-200 px-6">
      <h1 class="text-xl font-bold text-primary-600">Taskly</h1>
      <span class="mr-2 text-xs text-gray-400">ALGO-NEST</span>
    </div>

    <!-- Menu grouped by section -->
    <nav class="flex-1 overflow-y-auto px-3 pb-4 pt-2">
      <div v-for="group in groupedItems" :key="group.section" class="mb-2">
        <p class="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{{ group.section }}</p>
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
        >
          <svg class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" :d="iconMap[item.icon]" />
          </svg>
          {{ item.label }}
        </NuxtLink>
      </div>
    </nav>

    <!-- User info -->
    <div class="shrink-0 border-t border-gray-200 bg-white p-4">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
          {{ authStore.user?.name?.charAt(0) || '?' }}
        </div>
        <div class="flex-1 truncate">
          <p class="truncate text-sm font-medium text-gray-900">{{ authStore.user?.name }}</p>
          <p class="truncate text-xs text-gray-500">{{ authStore.user?.email }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>
