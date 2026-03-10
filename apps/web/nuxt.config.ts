export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
    '@nuxtjs/i18n',
    '@sentry/nuxt/module',
    '@formkit/auto-animate/nuxt',
  ],

  i18n: {
    locales: [
      { code: 'ar', name: 'العربية', dir: 'rtl', file: 'ar.json' },
      { code: 'en', name: 'English', dir: 'ltr', file: 'en.json' },
    ],
    defaultLocale: 'ar',
    langDir: './',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'taskly_lang',
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
      googleAnalyticsId: process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://taskly.algo-nest.com',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      title: 'Taskly - ALGO-NEST',
      meta: [
        { name: 'description', content: 'نظام إدارة القوى العاملة - ALGO-NEST' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#2563eb' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'google-site-verification', content: process.env.NUXT_PUBLIC_GOOGLE_SEARCH_CONSOLE_ID || '' },
      ],
      script: [
        ...(process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID
          ? [
              {
                src: `https://www.googletagmanager.com/gtag/js?id=${process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID}`,
                async: true,
              },
              {
                innerHTML: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID}');`,
              },
            ]
          : []),
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap' },
      ],
    },
  },

  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Taskly - ALGO-NEST',
      short_name: 'Taskly',
      description: 'نظام إدارة القوى العاملة',
      lang: 'ar',
      dir: 'rtl',
      theme_color: '#2563eb',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
        { src: '/icons/icon-192x192.svg', sizes: '512x512', type: 'image/svg+xml' },
        { src: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
        },
        {
          urlPattern: /\/api\/(dashboard-stats|projects|tasks)(\?.*)?$/i,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'api-stale-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 30 }, cacheableResponse: { statuses: [0, 200] } },
        },
        {
          urlPattern: /\/api\/media\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'media-cache', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, cacheableResponse: { statuses: [0, 200] } },
        },
        {
          urlPattern: /\/api\/users\/me/i,
          handler: 'NetworkOnly',
        },
        {
          urlPattern: /\/api\/.*$/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 }, cacheableResponse: { statuses: [0, 200] }, networkTimeoutSeconds: 10 },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  typescript: {
    strict: true,
  },
})
