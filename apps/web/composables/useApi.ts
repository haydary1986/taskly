import { ofetch } from 'ofetch'
import * as qs from 'qs-esm'

export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  // Nuxt's runtimeConfig sets apiBase to "" (empty string) if the Coolify Environment variable is unset/empty.
  // We must explicitly ensure we don't fetch from an empty base URL resulting in 404s.
  const resolvedApiBase = config.public.apiBase || 'https://api-task.algonest.tech'

  // Payload's REST API expects bracket notation for nested filters
  // (e.g. where[room][equals]=X). ofetch's default serializer emits
  // JSON-encoded objects, which Payload silently ignores — so any `where`
  // clause with a nested operator would return ALL documents instead of
  // the filtered set. Rebuild the querystring with qs before sending.
  function buildQueryString(params: Record<string, unknown> | undefined): string {
    if (!params || Object.keys(params).length === 0) return ''
    return qs.stringify(params, { addQueryPrefix: true, encode: true })
  }

  const api = ofetch.create({
    baseURL: `${resolvedApiBase}/api`,
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
        // Only navigate if we aren't already on the login page to avoid potential browser loops
        if (process.client) {
          if (window.location.pathname !== '/login') {
            navigateTo('/login')
          }
        } else {
          // On SSR, navigate doesn't cause browser loops
          navigateTo('/login')
        }
      }
    },
  })

  function request<T>(url: string, opts: Record<string, any> = {}): Promise<T> {
    const { query, ...rest } = opts
    const qsString = buildQueryString(query as Record<string, unknown> | undefined)
    // Append the qs-serialized string to the URL ourselves; do NOT pass `query`
    // to ofetch (it would re-serialize it as JSON, which Payload ignores).
    const composed = qsString
      ? `${url}${url.includes('?') ? '&' : '?'}${qsString.slice(1)}`
      : url
    return api<T>(composed, rest)
  }

  /** Upload a file to media collection via FormData */
  async function upload(file: File, alt?: string) {
    const formData = new FormData()
    formData.append('file', file)
    if (alt) formData.append('alt', alt)

    const token = authStore.token
    const res = await fetch(`${resolvedApiBase}/api/media`, {
      method: 'POST',
      headers: token ? { Authorization: `JWT ${token}` } : {},
      body: formData,
    })

    if (!res.ok) throw new Error('فشل رفع الملف')
    return res.json()
  }

  return {
    get: <T = any>(url: string, opts?: Record<string, any>) => request<T>(url, { method: 'GET', ...opts }),
    post: <T = any>(url: string, body?: any, opts?: Record<string, any>) => request<T>(url, { method: 'POST', body, ...opts }),
    patch: <T = any>(url: string, body?: any, opts?: Record<string, any>) => request<T>(url, { method: 'PATCH', body, ...opts }),
    put: <T = any>(url: string, body?: any, opts?: Record<string, any>) => request<T>(url, { method: 'PUT', body, ...opts }),
    del: <T = any>(url: string, opts?: Record<string, any>) => request<T>(url, { method: 'DELETE', ...opts }),
    upload,
  }
}
