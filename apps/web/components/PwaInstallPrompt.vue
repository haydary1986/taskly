<script setup lang="ts">
const showPrompt = ref(false)
const deferredPrompt = ref<any>(null)
const dismissed = ref(false)

onMounted(() => {
  // Check if already dismissed this session
  if (sessionStorage.getItem('taskly_pwa_dismissed')) {
    dismissed.value = true
    return
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showPrompt.value = true
  })
})

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    showPrompt.value = false
  }
  deferredPrompt.value = null
}

function dismiss() {
  showPrompt.value = false
  dismissed.value = true
  sessionStorage.setItem('taskly_pwa_dismissed', '1')
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showPrompt && !dismissed"
      class="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-2xl lg:bottom-6"
    >
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
          <svg class="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="text-sm font-semibold text-gray-900">تثبيت Taskly</h3>
          <p class="mt-0.5 text-xs text-gray-500">قم بتثبيت التطبيق للوصول السريع والعمل بدون إنترنت</p>
          <div class="mt-3 flex gap-2">
            <button @click="install" class="btn-primary text-xs py-1.5 px-3">
              تثبيت
            </button>
            <button @click="dismiss" class="btn-secondary text-xs py-1.5 px-3">
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
