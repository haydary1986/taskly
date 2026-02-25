<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()
const notificationStore = useNotificationsStore()

const items = computed(() => {
  const role = authStore.role || ''
  const isAdmin = ['super-admin', 'supervisor', 'auditor'].includes(role)
  const isSales = role === 'sales-rep'
  const isProgrammer = role === 'programmer'
  const isDesigner = role === 'designer'

  const nav: { label: string; icon: string; to: string; badge?: number }[] = [
    { label: 'الرئيسية', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', to: '/' },
  ]

  if (isAdmin) {
    nav.push({ label: 'المهام', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', to: '/tasks' })
  } else if (isProgrammer || isSales || isDesigner) {
    nav.push({ label: 'مهامي', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', to: '/tasks/my' })
  }

  // Role-specific quick action
  if (isSales) {
    nav.push({ label: 'تسجيل', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', to: '/visits/check-in' })
  } else if (isProgrammer) {
    nav.push({ label: 'الوقت', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', to: '/time-tracking' })
  } else if (isDesigner) {
    nav.push({ label: 'تصاميمي', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', to: '/designs' })
  } else if (isAdmin) {
    nav.push({ label: 'المشاريع', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', to: '/projects' })
  }

  nav.push({ label: 'المحادثات', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', to: '/chat' })
  nav.push({ label: 'الإشعارات', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', to: '/notifications', badge: notificationStore.unreadCount })

  return nav
})
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white lg:hidden">
    <div class="flex items-center justify-around">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="relative flex flex-col items-center gap-0.5 px-2 py-2 text-[10px]"
        :class="
          route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))
            ? 'text-primary-600'
            : 'text-gray-500'
        "
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
        </svg>
        <span v-if="item.badge" class="absolute -top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{{ item.badge > 99 ? '99+' : item.badge }}</span>
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
