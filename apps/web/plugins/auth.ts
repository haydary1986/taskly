export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  const api = useApi()

  // If we have a token but no user, fetch the current user
  if (authStore.token && !authStore.user) {
    try {
      const { data } = await useAsyncData('auth-user-profile', () => api.get('/users/me'))

      if (data.value && data.value.user) {
        authStore.setAuth(data.value.user, authStore.token!)
      } else {
        authStore.logout()
      }
    } catch {
      authStore.logout()
    }
  }
})
