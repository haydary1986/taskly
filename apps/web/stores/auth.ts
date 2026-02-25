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
  const token = ref<string | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const role = computed(() => user.value?.role || null)
  const isAdmin = computed(() => ['super-admin', 'supervisor', 'auditor'].includes(role.value || ''))
  const isManagement = computed(() => ['super-admin', 'supervisor'].includes(role.value || ''))

  function setAuth(userData: User, tokenValue: string) {
    user.value = userData
    token.value = tokenValue
    if (import.meta.client) {
      localStorage.setItem('taskly_token', tokenValue)
    }
  }

  function logout() {
    user.value = null
    token.value = null
    if (import.meta.client) {
      localStorage.removeItem('taskly_token')
    }
  }

  function loadToken() {
    if (import.meta.client) {
      token.value = localStorage.getItem('taskly_token')
    }
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
