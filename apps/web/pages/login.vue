<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const authStore = useAuthStore()
const api = useApi()
const router = useRouter()
const toast = useToast()

const form = reactive({
  email: '',
  password: '',
})
const error = ref('')
const loading = ref(false)

// 2FA state
const requires2FA = ref(false)
const twoFactorCode = ref('')
const pendingToken = ref('')
const pendingUser = ref<any>(null)

// Redirect if already authenticated
if (authStore.isAuthenticated) {
  router.replace('/')
}

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    const res = await api.post('/users/login', {
      email: form.email,
      password: form.password,
    })

    if (res.token && res.user) {
      // Check if user has 2FA enabled
      if (res.user.twoFactorEnabled) {
        pendingToken.value = res.token
        pendingUser.value = res.user
        requires2FA.value = true
        loading.value = false
        return
      }

      authStore.setAuth(res.user, res.token)
      toast.success('تم تسجيل الدخول بنجاح')
      router.push('/')
    }
  } catch (err: any) {
    console.error('Login Error:', err)
    const errMessage = err?.data?.errors?.[0]?.message || err?.message || ''
    error.value = errMessage ? `خطأ مفصل: ${errMessage}` : 'بيانات الدخول غير صحيحة'
  } finally {
    loading.value = false
  }
}

async function verify2FA() {
  if (!twoFactorCode.value || twoFactorCode.value.length !== 6) {
    error.value = 'أدخل الرمز المكون من 6 أرقام'
    return
  }
  
  error.value = ''
  loading.value = true
  
  try {
    // Temporarily set auth to make the API call
    authStore.setAuth(pendingUser.value, pendingToken.value)
    
    await api.post('/v1/2fa/verify', { code: twoFactorCode.value })
    
    // 2FA verified — keep auth and proceed
    toast.success('تم التحقق بنجاح')
    router.push('/')
  } catch (err: any) {
    // Revert auth and 2FA state on failure
    authStore.logout()
    requires2FA.value = false
    pendingToken.value = ''
    pendingUser.value = null
    error.value = 'رمز التحقق غير صحيح. يرجى تسجيل الدخول مجدداً.'
    twoFactorCode.value = ''
  } finally {
    loading.value = false
  }
}

function cancelTwoFactor() {
  requires2FA.value = false
  pendingToken.value = ''
  pendingUser.value = null
  twoFactorCode.value = ''
  error.value = ''
}
</script>

<template>
  <div>
    <div class="card">
      <h2 class="mb-6 text-center text-xl font-bold text-gray-900 dark:text-white">
        {{ requires2FA ? 'المصادقة الثنائية' : 'تسجيل الدخول' }}
      </h2>

      <!-- Normal Login Form -->
      <form v-if="!requires2FA" @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="label">البريد الإلكتروني</label>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="example@your-domain.com"
            required
            dir="ltr"
          />
        </div>

        <div>
          <label class="label">كلمة المرور</label>
          <input
            v-model="form.password"
            type="password"
            class="input"
            placeholder="••••••••"
            required
            dir="ltr"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="btn-primary w-full"
        >
          <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25" />
            <path fill="currentColor" class="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ loading ? 'جاري الدخول...' : 'دخول' }}
        </button>
      </form>

      <!-- 2FA Verification Form -->
      <form v-else @submit.prevent="verify2FA" class="space-y-4">
        <div class="text-center mb-4">
          <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-500/20">
            <svg class="h-7 w-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            أدخل الرمز من تطبيق المصادقة (Google Authenticator)
          </p>
        </div>

        <div>
          <input
            v-model="twoFactorCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            class="input text-center text-2xl tracking-[0.5em] font-mono"
            placeholder="000000"
            dir="ltr"
            autofocus
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button type="submit" :disabled="loading || twoFactorCode.length !== 6" class="btn-primary w-full">
          {{ loading ? 'جاري التحقق...' : 'تحقق' }}
        </button>

        <button type="button" @click="cancelTwoFactor" class="btn-secondary w-full">
          رجوع لتسجيل الدخول
        </button>
      </form>

      <div v-if="!requires2FA" class="mt-4 text-center">
        <NuxtLink to="/magic-login" class="text-sm text-primary-600 hover:text-primary-700">
          دخول بدون كلمة مرور (رابط سحري)
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

