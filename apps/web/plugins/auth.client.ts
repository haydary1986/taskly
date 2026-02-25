export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  const api = useApi()

  // Load token from localStorage
  authStore.loadToken()

  // If we have a token, fetch the current user
  if (authStore.token) {
    try {
      const res = await api.get('/users/me')
      if (res.user) {
        authStore.setAuth(res.user, authStore.token!)
      } else {
        authStore.logout()
      }
    } catch {
      authStore.logout()
    }
  }
})
