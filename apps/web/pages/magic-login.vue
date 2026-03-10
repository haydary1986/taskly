<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const api = useApi()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const sent = ref(false)
const error = ref('')
const loading = ref(false)

// Magic link verification state
const verifying = ref(false)
const verifyError = ref('')
const verified = ref(false)

// Check if we arrived via a magic link (has token + email query params)
onMounted(async () => {
  const token = route.query.token as string
  const queryEmail = route.query.email as string
  if (token && queryEmail) {
    verifying.value = true
    try {
      const res = await api.post('/verify-magic-login', { token, email: queryEmail })
      if (res.token && res.user) {
        authStore.setAuth(res.user, res.token)
        verified.value = true
        router.push('/')
      }
    } catch (err: any) {
      verifyError.value = err?.data?.error || 'رابط غير صالح أو منتهي الصلاحية'
    } finally {
      verifying.value = false
    }
  }
})

async function handleSend() {
  error.value = ''
  loading.value = true

  try {
    await api.post('/magic-login', { email: email.value })
    sent.value = true
  } catch (err: any) {
    error.value = err?.data?.error || 'حدث خطأ أثناء الإرسال'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card">
    <h2 class="mb-6 text-center text-xl font-bold text-gray-900">تسجيل دخول سحري</h2>

    <!-- Verifying magic link token -->
    <div v-if="verifying" class="py-8 text-center">
      <svg class="mx-auto h-10 w-10 animate-spin text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <p class="mt-4 text-gray-600">جاري التحقق من رابط الدخول...</p>
    </div>

    <!-- Verification failed -->
    <div v-else-if="verifyError" class="text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <svg class="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p class="text-red-600 font-medium">{{ verifyError }}</p>
      <p class="mt-2 text-sm text-gray-400">يمكنك طلب رابط جديد أدناه</p>
      <button @click="verifyError = ''" class="btn-primary mt-4">طلب رابط جديد</button>
    </div>

    <!-- Success: link sent -->
    <div v-else-if="sent" class="text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-gray-600">تم إرسال رابط الدخول إلى بريدك الإلكتروني</p>
      <p class="mt-1 text-sm text-gray-400">يرجى التحقق من صندوق الوارد</p>
    </div>

    <!-- Request magic link form -->
    <form v-else @submit.prevent="handleSend" class="space-y-4">
      <div>
        <label class="label">البريد الإلكتروني</label>
        <input
          v-model="email"
          type="email"
          class="input"
          placeholder="example@your-domain.com"
          required
          dir="ltr"
        />
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <button type="submit" :disabled="loading" class="btn-primary w-full">
        {{ loading ? 'جاري الإرسال...' : 'إرسال رابط الدخول' }}
      </button>
    </form>

    <div class="mt-4 text-center">
      <NuxtLink to="/login" class="text-sm text-primary-600 hover:text-primary-700">
        العودة لتسجيل الدخول
      </NuxtLink>
    </div>
  </div>
</template>
