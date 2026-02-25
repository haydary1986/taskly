<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const api = useApi()

const email = ref('')
const sent = ref(false)
const error = ref('')
const loading = ref(false)

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

    <div v-if="sent" class="text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-gray-600">تم إرسال رابط الدخول إلى بريدك الإلكتروني</p>
      <p class="mt-1 text-sm text-gray-400">يرجى التحقق من صندوق الوارد</p>
    </div>

    <form v-else @submit.prevent="handleSend" class="space-y-4">
      <div>
        <label class="label">البريد الإلكتروني</label>
        <input
          v-model="email"
          type="email"
          class="input"
          placeholder="admin@algo-nest.com"
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
