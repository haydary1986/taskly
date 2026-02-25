<script setup lang="ts">
const { isOnline } = useNetworkStatus()
const { processQueue, queueLength } = useOfflineQueue()
const syncing = ref(false)
const showReconnected = ref(false)
const wasOffline = ref(false)

watch(isOnline, async (online) => {
  if (!online) {
    wasOffline.value = true
    return
  }

  if (wasOffline.value) {
    showReconnected.value = true
    // Process offline queue
    if (queueLength.value > 0) {
      syncing.value = true
      await processQueue()
      syncing.value = false
    }
    setTimeout(() => { showReconnected.value = false }, 3000)
    wasOffline.value = false
  }
})
</script>

<template>
  <!-- Offline banner -->
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div v-if="!isOnline" class="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-center py-2 text-sm font-medium shadow-lg">
      <div class="flex items-center justify-center gap-2">
        <svg class="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
        لا يوجد اتصال بالإنترنت - الوضع غير المتصل
        <span v-if="queueLength > 0" class="bg-white/20 rounded-full px-2 text-xs">{{ queueLength }} عملية معلقة</span>
      </div>
    </div>
  </Transition>

  <!-- Syncing / Reconnected banner -->
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div v-if="syncing" class="fixed top-0 left-0 right-0 z-[100] bg-blue-500 text-white text-center py-2 text-sm font-medium shadow-lg">
      <div class="flex items-center justify-center gap-2">
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        جاري مزامنة البيانات...
      </div>
    </div>
    <div v-else-if="showReconnected" class="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white text-center py-2 text-sm font-medium shadow-lg">
      <div class="flex items-center justify-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        تم استعادة الاتصال
      </div>
    </div>
  </Transition>
</template>
