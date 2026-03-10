import { defineStore } from 'pinia'

interface BrandingState {
  appName: string
  companyName: string
  appLogo: any | null
  appIcon: any | null
  appFavicon: any | null
  primaryColor: string
  accentColor: string
  sidebarColor: 'white' | 'dark' | 'primary'
  loginBackground: any | null
  loaded: boolean
}

function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function generatePalette(hex: string): Record<string, string> {
  const hsl = hexToHSL(hex)
  if (!hsl) return {}
  const { h, s } = hsl
  return {
    '50': `hsl(${h}, ${Math.min(s + 10, 100)}%, 97%)`,
    '100': `hsl(${h}, ${Math.min(s + 10, 100)}%, 93%)`,
    '200': `hsl(${h}, ${Math.min(s + 5, 100)}%, 85%)`,
    '300': `hsl(${h}, ${s}%, 75%)`,
    '400': `hsl(${h}, ${s}%, 62%)`,
    '500': `hsl(${h}, ${s}%, 52%)`,
    '600': `hsl(${h}, ${s}%, 45%)`,
    '700': `hsl(${h}, ${Math.max(s - 5, 0)}%, 38%)`,
    '800': `hsl(${h}, ${Math.max(s - 10, 0)}%, 30%)`,
    '900': `hsl(${h}, ${Math.max(s - 10, 0)}%, 24%)`,
    '950': `hsl(${h}, ${Math.max(s - 10, 0)}%, 15%)`,
  }
}

/** Build CSS overrides for Tailwind color classes */
function buildColorCSS(prefix: string, palette: Record<string, string>): string {
  const rules: string[] = []
  for (const [shade, color] of Object.entries(palette)) {
    // Background
    rules.push(`.bg-${prefix}-${shade} { background-color: ${color} !important; }`)
    // Text
    rules.push(`.text-${prefix}-${shade} { color: ${color} !important; }`)
    // Border
    rules.push(`.border-${prefix}-${shade} { border-color: ${color} !important; }`)
    // Ring
    rules.push(`.ring-${prefix}-${shade} { --tw-ring-color: ${color} !important; }`)
    // Focus variants
    rules.push(`.focus\\:border-${prefix}-${shade}:focus { border-color: ${color} !important; }`)
    rules.push(`.focus\\:ring-${prefix}-${shade}:focus { --tw-ring-color: ${color} !important; }`)
    // Hover variants
    rules.push(`.hover\\:bg-${prefix}-${shade}:hover { background-color: ${color} !important; }`)
    rules.push(`.hover\\:text-${prefix}-${shade}:hover { color: ${color} !important; }`)
    rules.push(`.hover\\:border-${prefix}-${shade}:hover { border-color: ${color} !important; }`)
    // Dark variants
    rules.push(`.dark .dark\\:bg-${prefix}-${shade} { background-color: ${color} !important; }`)
    rules.push(`.dark .dark\\:text-${prefix}-${shade} { color: ${color} !important; }`)
    rules.push(`.dark .dark\\:border-${prefix}-${shade} { border-color: ${color} !important; }`)
    // Gradient
    rules.push(`.from-${prefix}-${shade} { --tw-gradient-from: ${color} !important; }`)
    rules.push(`.to-${prefix}-${shade} { --tw-gradient-to: ${color} !important; }`)
    rules.push(`.via-${prefix}-${shade} { --tw-gradient-via: ${color} !important; }`)
  }
  return rules.join('\n')
}

function getMediaUrl(media: any, apiBase: string): string {
  if (!media) return ''
  if (typeof media === 'string') return media
  const url = media.url || ''
  if (url.startsWith('http')) return url
  return `${apiBase}${url}`
}

export const useBrandingStore = defineStore('branding', {
  state: (): BrandingState => ({
    appName: 'Taskly',
    companyName: 'ALGO-NEST',
    appLogo: null,
    appIcon: null,
    appFavicon: null,
    primaryColor: '#2563eb',
    accentColor: '#16a34a',
    sidebarColor: 'white',
    loginBackground: null,
    loaded: false,
  }),

  getters: {
    logoUrl(state): string {
      const config = useRuntimeConfig()
      return getMediaUrl(state.appLogo, config.public.apiBase as string)
    },
    faviconUrl(state): string {
      const config = useRuntimeConfig()
      return getMediaUrl(state.appFavicon, config.public.apiBase as string)
    },
    loginBgUrl(state): string {
      const config = useRuntimeConfig()
      return getMediaUrl(state.loginBackground, config.public.apiBase as string)
    },
  },

  actions: {
    async fetch() {
      if (this.loaded) return
      const config = useRuntimeConfig()
      try {
        const res = await $fetch<any>(`${config.public.apiBase}/api/globals/system-settings`)
        if (res) {
          this.appName = res.appName || 'Taskly'
          this.companyName = res.companyName || 'ALGO-NEST'
          this.appLogo = res.appLogo || null
          this.appIcon = res.appIcon || null
          this.appFavicon = res.appFavicon || null
          this.primaryColor = res.primaryColor || '#2563eb'
          this.accentColor = res.accentColor || '#16a34a'
          this.sidebarColor = res.sidebarColor || 'white'
          this.loginBackground = res.loginBackground || null
        }
      } catch {
        // Use defaults
      }
      this.loaded = true
      this.applyTheme()
    },

    applyTheme() {
      if (import.meta.server) return

      // Remove old theme style if exists
      const existingStyle = document.getElementById('taskly-branding')
      if (existingStyle) existingStyle.remove()

      let css = ''

      // Apply primary color palette override
      if (this.primaryColor && this.primaryColor !== '#2563eb') {
        const palette = generatePalette(this.primaryColor)
        css += buildColorCSS('primary', palette)
      }

      // Apply accent color palette override
      if (this.accentColor && this.accentColor !== '#16a34a') {
        const palette = generatePalette(this.accentColor)
        css += buildColorCSS('accent', palette)
      }

      // Inject style tag
      if (css) {
        const style = document.createElement('style')
        style.id = 'taskly-branding'
        style.textContent = css
        document.head.appendChild(style)
      }

      // Update favicon
      if (this.faviconUrl) {
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
          || document.createElement('link')
        link.rel = 'icon'
        link.href = this.faviconUrl
        if (!link.parentNode) document.head.appendChild(link)
      }

      // Update page title
      document.title = `${this.appName} - ${this.companyName}`
    },
  },
})
