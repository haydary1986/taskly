<script setup lang="ts">
const api = useApi()
const authStore = useAuthStore()

const show = ref(false)
const telegramUrl = ref('')
const checking = ref(false)
const dismissed = ref(false)

onMounted(async () => {
  // Don't show if already linked or dismissed this session
  if (authStore.user?.telegramChatId) return
  if (sessionStorage.getItem('telegram_popup_dismissed')) return

  try {
    const res = await api.get('/telegram-link')
    if (res.linked) return
    if (res.url) {
      telegramUrl.value = res.url
      show.value = true
    }
  } catch {
    // Telegram not configured, silently skip
  }
})

function dismiss() {
  show.value = false
  dismissed.value = true
  sessionStorage.setItem('telegram_popup_dismissed', '1')
}

function openTelegram() {
  if (telegramUrl.value) {
    window.open(telegramUrl.value, '_blank')
    startPolling()
  }
}

let pollInterval: ReturnType<typeof setInterval> | null = null

function startPolling() {
  checking.value = true
  pollInterval = setInterval(async () => {
    try {
      const res = await api.get('/telegram-status')
      if (res.linked) {
        clearInterval(pollInterval!)
        pollInterval = null
        checking.value = false
        show.value = false
        // Refresh user data
        const me = await api.get('/users/me')
        if (me.user) authStore.setAuth(me.user, authStore.token!)
      }
    } catch {}
  }, 3000)

  // Stop polling after 2 minutes
  setTimeout(() => {
    if (pollInterval) {
      clearInterval(pollInterval)
      checking.value = false
    }
  }, 120000)
}

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div v-if="show" class="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:bottom-6 sm:w-96">
        <div class="rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl">
          <!-- Header -->
          <div class="flex items-start gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <svg class="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-gray-900">ربط حسابك بتيليجرام</h3>
              <p class="mt-1 text-xs text-gray-500 leading-relaxed">
                فعّل إشعارات تيليجرام لتصلك التنبيهات فوراً على هاتفك — المهام، الإشارات، والتحديثات.
              </p>
            </div>
            <button @click="dismiss" class="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex items-center gap-2">
            <button
              @click="openTelegram"
              :disabled="checking"
              class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:bg-blue-400"
            >
              <template v-if="checking">
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري الربط...
              </template>
              <template v-else>
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                فتح تيليجرام للربط
              </template>
            </button>
            <button @click="dismiss" class="rounded-xl px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-100">لاحقاً</button>
          </div>

          <p v-if="checking" class="mt-2 text-center text-[10px] text-blue-600 animate-pulse">
            اضغط "Start" في بوت التيليجرام ثم انتظر...
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
