<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'الملف الشخصي' })

const authStore = useAuthStore()
const api = useApi()

const form = reactive({
  name: authStore.user?.name || '',
  phone: authStore.user?.phone || '',
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const saving = ref(false)
const savingPassword = ref(false)
const message = ref('')
const passwordMessage = ref('')

// Telegram linking
const telegramLinked = ref(!!authStore.user?.telegramChatId)
const telegramLoading = ref(false)
const telegramUrl = ref('')
const telegramPolling = ref(false)
let pollInterval: ReturnType<typeof setInterval> | null = null

async function linkTelegram() {
  telegramLoading.value = true
  try {
    const res = await api.get('/telegram-link')
    if (res.linked) {
      telegramLinked.value = true
      return
    }
    if (res.url) {
      telegramUrl.value = res.url
      // Extract bot username and start param to build tg:// deep link
      const match = res.url.match(/t\.me\/([^?]+)\?start=(.+)/)
      if (match) {
        // tg:// protocol opens the Telegram app directly
        window.location.href = `tg://resolve?domain=${match[1]}&start=${match[2]}`
      } else {
        globalThis.open(res.url, '_blank')
      }
      startPolling()
    }
  } catch {
    message.value = 'تيليجرام غير مفعل. يرجى إعداد البوت من إعدادات النظام أولاً.'
  } finally {
    telegramLoading.value = false
  }
}

function startPolling() {
  telegramPolling.value = true
  pollInterval = setInterval(async () => {
    try {
      const res = await api.get('/telegram-status')
      if (res.linked) {
        stopPolling()
        telegramLinked.value = true
        const me = await api.get('/users/me')
        if (me.user) authStore.setAuth(me.user, authStore.token!)
      }
    } catch {}
  }, 3000)
  setTimeout(() => stopPolling(), 120000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  telegramPolling.value = false
}

async function unlinkTelegram() {
  if (!confirm('هل تريد إلغاء ربط حساب تيليجرام؟ لن تصلك إشعارات تيليجرام بعد ذلك.')) return
  try {
    await api.post('/telegram-unlink', {})
    telegramLinked.value = false
    if (authStore.user) authStore.user.telegramChatId = null
  } catch {
    message.value = 'حدث خطأ أثناء إلغاء الربط'
  }
}

onUnmounted(() => stopPolling())

const roleLabels: Record<string, string> = {
  'super-admin': 'مدير عام',
  supervisor: 'مشرف',
  auditor: 'مراقب',
  'sales-rep': 'مندوب مبيعات',
  programmer: 'مبرمج',
  designer: 'مصمم',
  'social-media-manager': 'مسؤول سوشيال ميديا',
}

async function updateProfile() {
  saving.value = true
  message.value = ''
  try {
    const res = await api.patch(`/users/${authStore.user?.id}`, {
      name: form.name,
      phone: form.phone,
    })
    if (res.doc) {
      authStore.user!.name = res.doc.name
      authStore.user!.phone = res.doc.phone
    }
    message.value = 'تم تحديث البيانات بنجاح'
  } catch (err: any) {
    message.value = err?.data?.errors?.[0]?.message || 'حدث خطأ أثناء التحديث'
  } finally {
    saving.value = false
  }
}

async function updatePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordMessage.value = 'كلمات المرور غير متطابقة'
    return
  }

  savingPassword.value = true
  passwordMessage.value = ''
  try {
    await api.patch(`/users/${authStore.user?.id}`, {
      password: passwordForm.newPassword,
    })
    passwordMessage.value = 'تم تغيير كلمة المرور بنجاح'
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (err: any) {
    passwordMessage.value = err?.data?.errors?.[0]?.message || 'حدث خطأ أثناء تغيير كلمة المرور'
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold text-gray-900">الملف الشخصي</h1>

    <!-- Profile info -->
    <div class="card">
      <div class="mb-6 flex items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
          {{ authStore.user?.name?.charAt(0) || '?' }}
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ authStore.user?.name }}</h2>
          <p class="text-sm text-gray-500">{{ authStore.user?.email }}</p>
          <span class="badge mt-1 bg-primary-100 text-primary-700">
            {{ roleLabels[authStore.role || ''] || authStore.role }}
          </span>
        </div>
      </div>

      <form @submit.prevent="updateProfile" class="space-y-4">
        <div>
          <label class="label">الاسم</label>
          <input v-model="form.name" type="text" class="input" required />
        </div>
        <div>
          <label class="label">رقم الهاتف</label>
          <input v-model="form.phone" type="tel" class="input" dir="ltr" />
        </div>

        <p v-if="message" class="text-sm" :class="message.includes('خطأ') ? 'text-red-600' : 'text-green-600'">
          {{ message }}
        </p>

        <button type="submit" :disabled="saving" class="btn-primary">
          {{ saving ? 'جاري الحفظ...' : 'حفظ التعديلات' }}
        </button>
      </form>
    </div>

    <!-- Telegram -->
    <div class="card">
      <div class="flex items-center gap-3 mb-4">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <svg class="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">ربط تيليجرام</h3>
          <p class="text-xs text-gray-500">استقبل جميع الإشعارات على تيليجرام فوراً</p>
        </div>
      </div>

      <div v-if="telegramLinked" class="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4">
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span class="text-sm font-medium text-green-700">تم ربط حساب تيليجرام بنجاح</span>
        </div>
        <button @click="unlinkTelegram" class="text-xs text-red-500 hover:text-red-700 hover:underline">إلغاء الربط</button>
      </div>

      <div v-else class="space-y-3">
        <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p class="text-sm text-gray-600 leading-relaxed mb-3">
            اربط حسابك ببوت تيليجرام لتصلك إشعارات المهام والإشارات والتحديثات مباشرة على هاتفك.
          </p>
          <button
            @click="linkTelegram"
            :disabled="telegramLoading || telegramPolling"
            class="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:bg-blue-400 w-full sm:w-auto"
          >
            <template v-if="telegramPolling">
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              بانتظار الربط... اضغط Start في البوت
            </template>
            <template v-else-if="telegramLoading">
              <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              جاري التحميل...
            </template>
            <template v-else>
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              ربط بتيليجرام
            </template>
          </button>
        </div>
        <p v-if="telegramPolling" class="text-center text-xs text-blue-600 animate-pulse">
          تم فتح بوت التيليجرام — اضغط "Start" ثم انتظر التأكيد هنا...
        </p>
      </div>
    </div>

    <!-- Password change -->
    <div class="card">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">تغيير كلمة المرور</h3>

      <form @submit.prevent="updatePassword" class="space-y-4">
        <div>
          <label class="label">كلمة المرور الجديدة</label>
          <input v-model="passwordForm.newPassword" type="password" class="input" dir="ltr" required minlength="6" />
        </div>
        <div>
          <label class="label">تأكيد كلمة المرور</label>
          <input v-model="passwordForm.confirmPassword" type="password" class="input" dir="ltr" required minlength="6" />
        </div>

        <p v-if="passwordMessage" class="text-sm" :class="passwordMessage.includes('خطأ') || passwordMessage.includes('غير') ? 'text-red-600' : 'text-green-600'">
          {{ passwordMessage }}
        </p>

        <button type="submit" :disabled="savingPassword" class="btn-primary">
          {{ savingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور' }}
        </button>
      </form>
    </div>
  </div>
</template>
