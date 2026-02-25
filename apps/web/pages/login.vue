<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const authStore = useAuthStore()
const api = useApi()
const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})
const error = ref('')
const loading = ref(false)

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
      authStore.setAuth(res.user, res.token)
      router.push('/')
    }
  } catch (err: any) {
    error.value = err?.data?.errors?.[0]?.message || 'بيانات الدخول غير صحيحة'
  } finally {
    loading.value = false
  }
}

// Dev quick-login
const demoAccounts = [
  { label: 'مدير عام', email: 'admin@algo-nest.com', role: 'super-admin', color: 'bg-red-500' },
  { label: 'مشرف', email: 'supervisor@algo-nest.com', role: 'supervisor', color: 'bg-orange-500' },
  { label: 'مراقب', email: 'auditor@algo-nest.com', role: 'auditor', color: 'bg-yellow-500' },
  { label: 'مندوب مبيعات', email: 'sales@algo-nest.com', role: 'sales-rep', color: 'bg-green-500' },
  { label: 'مبرمج', email: 'dev@algo-nest.com', role: 'programmer', color: 'bg-blue-500' },
  { label: 'مصمم', email: 'designer@algo-nest.com', role: 'designer', color: 'bg-purple-500' },
  { label: 'سوشيال ميديا', email: 'social@algo-nest.com', role: 'social-media', color: 'bg-pink-500' },
]

function quickLogin(account: typeof demoAccounts[0]) {
  form.email = account.email
  form.password = 'demo1234'
  handleLogin()
}
</script>

<template>
  <div>
    <div class="card">
      <h2 class="mb-6 text-center text-xl font-bold text-gray-900">تسجيل الدخول</h2>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="label">البريد الإلكتروني</label>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="admin@algo-nest.com"
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

      <div class="mt-4 text-center">
        <NuxtLink to="/magic-login" class="text-sm text-primary-600 hover:text-primary-700">
          دخول بدون كلمة مرور (رابط سحري)
        </NuxtLink>
      </div>
    </div>

    <!-- Dev Quick Login -->
    <div class="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
      <p class="mb-3 text-center text-xs font-semibold text-amber-700">
        وضع التطوير — دخول سريع (كلمة المرور: demo1234)
      </p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="account in demoAccounts"
          :key="account.email"
          @click="quickLogin(account)"
          :disabled="loading"
          class="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-right text-sm shadow-sm transition-all hover:shadow-md disabled:opacity-50"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" :class="account.color">
            {{ account.label.charAt(0) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900">{{ account.label }}</p>
            <p class="truncate text-[10px] text-gray-400" dir="ltr">{{ account.email }}</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
