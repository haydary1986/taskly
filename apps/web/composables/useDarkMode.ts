const STORAGE_KEY = 'taskly_dark_mode'

const isDark = ref(false)

export function useDarkMode() {
  if (import.meta.client) {
    // Initialize from localStorage or system preference
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      isDark.value = stored === 'true'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  function toggle() {
    isDark.value = !isDark.value
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, String(isDark.value))
      applyTheme()
    }
  }

  function applyTheme() {
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', isDark.value)
    }
  }

  return { isDark: readonly(isDark), toggle }
}
