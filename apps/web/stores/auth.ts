import { defineStore } from 'pinia'

interface User {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  avatar?: { url: string; thumbnailURL?: string } | null
  isActive: boolean
  telegramChatId?: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = useCookie<string | null>('taskly_token', {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  })
  const loading = ref(false)

  // As long as we have a token, we are considered authenticated for middleware
  // The client plugin will fetch the missing user details.
  const isAuthenticated = computed(() => !!token.value)
  const role = computed(() => user.value?.role || null)
  const isAdmin = computed(() => ['super-admin', 'supervisor', 'auditor'].includes(role.value || ''))
  const isManagement = computed(() => ['super-admin', 'supervisor'].includes(role.value || ''))

  function setAuth(userData: User, tokenValue: string) {
    user.value = userData
    token.value = tokenValue
  }

  function logout() {
    user.value = null
    token.value = null
  }

  function loadToken() {
    // Automatically handled by Nuxt useCookie
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    role,
    isAdmin,
    isManagement,
    setAuth,
    logout,
    loadToken,
  }
})
