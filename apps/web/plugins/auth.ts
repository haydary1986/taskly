export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()

  // If we have a token but no user, fetch the current user
  if (authStore.token && !authStore.user) {
    try {
      const resolvedApiBase = config.public.apiBase || 'https://api-task.algonest.tech'

      const data = await $fetch<any>(`${resolvedApiBase}/api/users/me`, {
        headers: {
          'Authorization': `JWT ${authStore.token}`,
        },
        credentials: 'include',
      })

      if (data?.user) {
        authStore.setAuth(data.user, authStore.token!)
      } else {
        // Token exists but user not found — token may be expired
        authStore.logout()
      }
    } catch (err: any) {
      // Only logout on explicit 401; network errors should preserve session
      if (err?.response?.status === 401 || err?.status === 401) {
        authStore.logout()
      } else {
        // Network error or server down — don't logout, just log it
        console.warn('[Auth Plugin] Failed to fetch user profile, keeping session:', err?.message)
      }
    }
  }
})
