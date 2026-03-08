import { ofetch } from 'ofetch'

export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const api = ofetch.create({
    baseURL: `${config.public.apiBase}/api`,
    credentials: 'include' as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
    },
    onRequest({ options }) {
      const token = authStore.token
      if (token) {
        (options.headers as unknown as Record<string, string>)['Authorization'] = `JWT ${token}`
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        authStore.logout()
        navigateTo('/login')
      }
    },
  })

  /** Upload a file to media collection via FormData */
  async function upload(file: File, alt?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (alt) formData.append('alt', alt)

    const token = authStore.token
    const res = await fetch(`${config.public.apiBase}/api/media`, {
      method: 'POST',
      headers: token ? { Authorization: `JWT ${token}` } : {},
      body: formData,
    })

    if (!res.ok) throw new Error('فشل رفع الملف')
    return res.json()
  }

  return {
    get: <T = any>(url: string, opts?: Record<string, any>) => api<T>(url, { method: 'GET', ...opts }),
    post: <T = any>(url: string, body?: any, opts?: Record<string, any>) => api<T>(url, { method: 'POST', body, ...opts }),
    patch: <T = any>(url: string, body?: any, opts?: Record<string, any>) => api<T>(url, { method: 'PATCH', body, ...opts }),
    put: <T = any>(url: string, body?: any, opts?: Record<string, any>) => api<T>(url, { method: 'PUT', body, ...opts }),
    del: <T = any>(url: string, opts?: Record<string, any>) => api<T>(url, { method: 'DELETE', ...opts }),
    upload,
  }
}
