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
    registerType: 'autoUpdate',
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
      // Make sure clients move to the new SW immediately on update
      clientsClaim: true,
      skipWaiting: true,
      // Don't precache HTML — only fingerprinted static assets. HTML must
      // always be fetched from the network so users get the latest app shell.
      globPatterns: ['**/*.{js,css,png,svg,ico,woff2}'],
      runtimeCaching: [
        // Static third-party assets: safe to cache long-term (immutable URLs)
        {
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'fonts-cache',
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // OSM map tiles: heavy + immutable per URL
        {
          urlPattern: /https?:\/\/[a-z]+\.tile\.openstreetmap\.org\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'osm-tiles',
            expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // Uploaded media (images, files): URL is content-hashed by Payload
        {
          urlPattern: /\/api\/media\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'media-cache',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // ALL other /api/* (data, auth, mutations): always go to network.
        // Falls back to cache only when the user is offline.
        {
          urlPattern: /\/api\/.*$/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-fallback',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
      // Periodically check for new SW (every 60s) so deploys reach users without manual reload
      periodicSyncForUpdates: 60,
    },
    devOptions: {
      enabled: false,
    },
  },

  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  // Per-route HTTP caching: HTML never cached, fingerprinted assets cached forever.
  routeRules: {
    // App shell / pages: must always revalidate so a deploy is picked up.
    '/**': { headers: { 'Cache-Control': 'no-cache, must-revalidate' } },
    // Nuxt asset bundles: filenames carry a content hash, safe to cache long-term.
    '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
    // Service worker file MUST not be cached or users can never get a new SW.
    '/sw.js': { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
    '/workbox-*.js': { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
    '/manifest.webmanifest': { headers: { 'Cache-Control': 'no-cache' } },
  },

  typescript: {
    strict: true,
  },
})
