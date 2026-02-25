<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'الإشعارات' })

const notificationsStore = useNotificationsStore()

const typeLabels: Record<string, string> = {
  'task-assigned': 'مهمة جديدة',
  'task-updated': 'تحديث مهمة',
  comment: 'تعليق',
  'security-alert': 'تنبيه أمني',
  visit: 'زيارة',
  system: 'نظام',
}

const typeIcons: Record<string, string> = {
  'task-assigned': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  'task-updated': 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  comment: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  'security-alert': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  visit: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
  system: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

onMounted(() => {
  notificationsStore.fetchNotifications()
})

function timeAgo(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${days} يوم`
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">الإشعارات</h1>
      <button
        v-if="notificationsStore.unreadCount > 0"
        @click="notificationsStore.markAllAsRead()"
        class="btn-secondary text-sm"
      >
        تحديد الكل كمقروء
      </button>
    </div>

    <!-- Loading -->
    <div v-if="notificationsStore.loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card animate-pulse">
        <div class="h-4 w-48 rounded bg-gray-200" />
        <div class="mt-2 h-3 w-64 rounded bg-gray-200" />
      </div>
    </div>

    <!-- Notifications list -->
    <div v-else-if="notificationsStore.notifications.length" class="space-y-2">
      <div
        v-for="notif in notificationsStore.notifications"
        :key="notif.id"
        class="card cursor-pointer transition-colors"
        :class="notif.isRead ? 'bg-white' : 'bg-primary-50/50 border-primary-100'"
        @click="notificationsStore.markAsRead(notif.id); notif.link && navigateTo(notif.link)"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="notif.isRead ? 'bg-gray-100' : 'bg-primary-100'"
          >
            <svg
              class="h-5 w-5"
              :class="notif.isRead ? 'text-gray-500' : 'text-primary-600'"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" :d="typeIcons[notif.type] || typeIcons.system" />
            </svg>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-medium" :class="notif.isRead ? 'text-gray-700' : 'text-gray-900'">
                {{ notif.title }}
              </h3>
              <span class="text-xs text-gray-400">{{ typeLabels[notif.type] }}</span>
            </div>
            <p class="mt-0.5 text-sm text-gray-500">{{ notif.message }}</p>
            <p class="mt-1 text-xs text-gray-400">{{ timeAgo(notif.createdAt) }}</p>
          </div>
          <div v-if="!notif.isRead" class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />
        </div>
      </div>
    </div>

    <div v-else class="card py-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <p class="mt-3 text-gray-400">لا توجد إشعارات</p>
    </div>
  </div>
</template>
